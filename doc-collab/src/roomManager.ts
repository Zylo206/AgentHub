import * as Y from "yjs";
import type WebSocket from "ws";
import { AgentHubClient, type AgentHubAuthorization } from "./agenthubClient.js";
import { config } from "./config.js";
import { ObjectSnapshotStore } from "./objectSnapshotStore.js";
import { FileCollabPersistence } from "./persistence.js";
import { RedisFanout, type FanoutMessage } from "./redisFanout.js";

export const YJS_UPDATE_FRAME = 1;

interface ClientState {
  socket: WebSocket;
  artifactId: string;
  token: string;
  userId: string;
  displayName: string;
  role: string;
  deviceId: string;
  canWrite: boolean;
}

interface ParticipantState {
  userId: string;
  displayName: string;
  role: string;
  deviceId: string;
  status: string;
  cursorStart: number | null;
  cursorEnd: number | null;
  editing: boolean;
  lastSeenAt: string;
}

interface RoomState {
  artifactId: string;
  doc: Y.Doc;
  text: Y.Text;
  metadata: AgentHubAuthorization;
  clients: Map<WebSocket, ClientState>;
  participants: Map<string, ParticipantState>;
  version: number;
  persistedUpdatesSinceSnapshot: number;
  lastTouchedAt: number;
}

export class RoomManager {
  private readonly rooms = new Map<string, RoomState>();
  private readonly agenthub = new AgentHubClient(config.agenthubApiBaseUrl);
  private readonly persistence = new FileCollabPersistence(config.storageDir);
  private readonly objectSnapshotStore = config.snapshotStorageType === "object-storage"
    ? new ObjectSnapshotStore(config.objectStorageDir, config.objectStorageBucket)
    : null;
  private readonly redisFanout: RedisFanout | null = config.redisUrl ? new RedisFanout(config.redisUrl) : null;

  async start(): Promise<void> {
    if (!this.redisFanout) {
      return;
    }
    await this.redisFanout.connect((message) => {
      void this.applyPeerUpdate(message);
    });
  }

  redisFanoutEnabled(): boolean {
    return Boolean(this.redisFanout);
  }

  redisStreamsEnabled(): boolean {
    return this.redisFanout?.isStreamsAvailable() ?? false;
  }

  async join(
    socket: WebSocket,
    artifactId: string,
    token: string,
    deviceId: string
  ): Promise<void> {
    const authorization = await this.agenthub.authorize(artifactId, token, "READ");
    const room = await this.getOrCreateRoom(artifactId, authorization);
    const canWrite = await this.resolveWritePermission(artifactId, token);
    const client: ClientState = {
      socket,
      artifactId,
      token,
      userId: authorization.user.userId,
      displayName: authorization.user.displayName,
      role: authorization.user.role,
      deviceId,
      canWrite
    };
    room.clients.set(socket, client);
    room.lastTouchedAt = Date.now();
    this.setAwareness(room, client, "online", null, null, false);
    this.sendJson(socket, {
      type: "ROOM_STATE",
      protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
      room: this.roomView(room),
      yjsUpdateBase64: Buffer.from(Y.encodeStateAsUpdate(room.doc)).toString("base64")
    });
    this.broadcastJson(room, {
      type: "AWARENESS_UPDATED",
      room: this.roomView(room)
    });
  }

  async applyClientUpdate(socket: WebSocket, update: Uint8Array): Promise<void> {
    const client = this.findClient(socket);
    if (!client) {
      throw new Error("Join a room before sending Yjs updates.");
    }
    if (!client.canWrite) {
      throw new Error("No write permission for this collaboration room.");
    }
    if (update.byteLength > config.maxUpdateBytes) {
      throw new Error(`Yjs update exceeds max size ${config.maxUpdateBytes}.`);
    }
    const room = this.rooms.get(client.artifactId);
    if (!room) {
      throw new Error("Collaboration room is not loaded.");
    }
    Y.applyUpdate(room.doc, update, socket);
    await this.persistAndFanout(room, update);
    this.broadcastUpdate(room, update, socket);
  }

  updateCursor(socket: WebSocket, cursorStart: number | null, cursorEnd: number | null, editing: boolean): void {
    const client = this.findClient(socket);
    if (!client) {
      throw new Error("Join a room before sending cursor state.");
    }
    const room = this.rooms.get(client.artifactId);
    if (!room) {
      throw new Error("Collaboration room is not loaded.");
    }
    this.setAwareness(room, client, "online", cursorStart, cursorEnd, editing);
    this.broadcastJson(room, {
      type: "AWARENESS_UPDATED",
      room: this.roomView(room)
    });
  }

  leave(socket: WebSocket): void {
    const client = this.findClient(socket);
    if (!client) {
      return;
    }
    const room = this.rooms.get(client.artifactId);
    if (!room) {
      return;
    }
    room.clients.delete(socket);
    room.participants.delete(this.participantKey(client));
    this.broadcastJson(room, {
      type: "AWARENESS_UPDATED",
      room: this.roomView(room)
    });
  }

  sweepIdleRooms(): void {
    const cutoff = Date.now() - config.roomIdleTtlMs;
    for (const [artifactId, room] of this.rooms.entries()) {
      if (room.clients.size === 0 && room.lastTouchedAt < cutoff) {
        this.rooms.delete(artifactId);
      }
    }
  }

  private async getOrCreateRoom(artifactId: string, authorization: AgentHubAuthorization): Promise<RoomState> {
    const existing = this.rooms.get(artifactId);
    if (existing) {
      existing.metadata = authorization;
      existing.lastTouchedAt = Date.now();
      return existing;
    }

    const doc = new Y.Doc();
    const text = doc.getText("content");
    const redisSnapshot = this.redisFanout ? await this.redisFanout.loadSnapshot(artifactId) : null;
    const objectSnapshot = this.objectSnapshotStore ? await this.objectSnapshotStore.loadSnapshot(artifactId) : null;
    const snapshot = redisSnapshot ?? objectSnapshot ?? await this.persistence.loadSnapshot(artifactId);
    if (snapshot) {
      Y.applyUpdate(doc, snapshot, "snapshot");
    } else {
      text.insert(0, authorization.room.content || "");
      const seededSnapshot = Y.encodeStateAsUpdate(doc);
      if (this.redisFanout) {
        const saved = await this.redisFanout.saveInitialSnapshot(artifactId, seededSnapshot);
        await this.saveSnapshot(artifactId, seededSnapshot);
        if (!saved) {
          const canonicalSnapshot = await this.redisFanout.loadSnapshot(artifactId);
          if (canonicalSnapshot) {
            const canonicalDoc = new Y.Doc();
            Y.applyUpdate(canonicalDoc, canonicalSnapshot, "redis-snapshot");
            const room = this.createRoomState(artifactId, canonicalDoc, authorization, [], Date.now());
            this.rooms.set(artifactId, room);
            return room;
          }
        }
      } else {
        await this.saveSnapshot(artifactId, seededSnapshot);
      }
    }

    const fileUpdates = this.redisFanout ? [] : await this.persistence.loadUpdates(artifactId);
    for (const update of fileUpdates) {
      Y.applyUpdate(doc, Buffer.from(update.updateBase64, "base64"), "file-log");
    }
    if (this.redisFanout) {
      const streamUpdates = await this.redisFanout.loadStream(artifactId);
      for (const update of streamUpdates) {
        Y.applyUpdate(doc, Buffer.from(update.updateBase64, "base64"), "redis-stream");
      }
    }

    const room = this.createRoomState(artifactId, doc, authorization, fileUpdates, Date.now());
    this.rooms.set(artifactId, room);
    return room;
  }

  private createRoomState(
    artifactId: string,
    doc: Y.Doc,
    authorization: AgentHubAuthorization,
    fileUpdates: Awaited<ReturnType<FileCollabPersistence["loadUpdates"]>>,
    now: number
  ): RoomState {
    return {
      artifactId,
      doc,
      text: doc.getText("content"),
      metadata: authorization,
      clients: new Map(),
      participants: new Map(),
      version: fileUpdates.length + 1,
      persistedUpdatesSinceSnapshot: fileUpdates.length,
      lastTouchedAt: now
    };
  }

  private async resolveWritePermission(artifactId: string, token: string): Promise<boolean> {
    try {
      const authorization = await this.agenthub.authorize(artifactId, token, "WRITE");
      return authorization.user.canWrite;
    } catch {
      return false;
    }
  }

  private async persistAndFanout(room: RoomState, update: Uint8Array): Promise<void> {
    room.version += 1;
    room.persistedUpdatesSinceSnapshot += 1;
    room.lastTouchedAt = Date.now();
    const message: FanoutMessage = {
      artifactId: room.artifactId,
      updateId: `upd_${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`,
      sourceInstanceId: config.instanceId,
      updateBase64: Buffer.from(update).toString("base64"),
      createdAt: new Date().toISOString(),
      roomVersion: room.version
    };
    await this.persistence.appendUpdate(message);
    if (this.redisFanout) {
      await this.redisFanout.publish(message);
    }
    if (room.persistedUpdatesSinceSnapshot >= config.snapshotEveryUpdates) {
      const snapshot = Y.encodeStateAsUpdate(room.doc);
      await this.saveSnapshot(room.artifactId, snapshot);
      await this.persistence.compactLog(room.artifactId);
      room.persistedUpdatesSinceSnapshot = 0;
    }
  }

  private async saveSnapshot(artifactId: string, snapshot: Uint8Array): Promise<void> {
    await this.persistence.saveSnapshot(artifactId, snapshot);
    if (this.objectSnapshotStore) {
      await this.objectSnapshotStore.saveSnapshot(artifactId, snapshot);
    }
    if (this.redisFanout) {
      await this.redisFanout.saveSnapshot(artifactId, snapshot);
    }
  }

  private async applyPeerUpdate(message: FanoutMessage): Promise<void> {
    if (message.sourceInstanceId === config.instanceId) {
      return;
    }
    const room = this.rooms.get(message.artifactId);
    if (!room) {
      return;
    }
    const update = Buffer.from(message.updateBase64, "base64");
    Y.applyUpdate(room.doc, update, "redis-peer");
    room.version = Math.max(room.version, message.roomVersion);
    room.lastTouchedAt = Date.now();
    this.broadcastUpdate(room, update, null);
  }

  private setAwareness(
    room: RoomState,
    client: ClientState,
    status: string,
    cursorStart: number | null,
    cursorEnd: number | null,
    editing: boolean
  ): void {
    room.participants.set(this.participantKey(client), {
      userId: client.userId,
      displayName: client.displayName,
      role: client.role,
      deviceId: client.deviceId,
      status,
      cursorStart,
      cursorEnd,
      editing,
      lastSeenAt: new Date().toISOString()
    });
  }

  private roomView(room: RoomState) {
    const participants = [...room.participants.values()];
    return {
      ...room.metadata.room,
      protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
      version: room.version,
      content: room.text.toString(),
      contentHash: "",
      participants,
      operations: [],
      redisFanoutEnabled: this.redisFanoutEnabled(),
      redisStreamsEnabled: this.redisStreamsEnabled(),
      instanceId: config.instanceId
    };
  }

  private findClient(socket: WebSocket): ClientState | null {
    for (const room of this.rooms.values()) {
      const client = room.clients.get(socket);
      if (client) {
        return client;
      }
    }
    return null;
  }

  private participantKey(client: ClientState): string {
    return `${client.userId}:${client.deviceId}`;
  }

  private broadcastUpdate(room: RoomState, update: Uint8Array, except: WebSocket | null): void {
    const frame = new Uint8Array(update.byteLength + 1);
    frame[0] = YJS_UPDATE_FRAME;
    frame.set(update, 1);
    for (const client of room.clients.values()) {
      if (client.socket !== except && client.socket.readyState === 1) {
        client.socket.send(frame);
      }
    }
  }

  private broadcastJson(room: RoomState, payload: unknown): void {
    const encoded = JSON.stringify(payload);
    for (const client of room.clients.values()) {
      if (client.socket.readyState === 1) {
        client.socket.send(encoded);
      }
    }
  }

  private sendJson(socket: WebSocket, payload: unknown): void {
    if (socket.readyState === 1) {
      socket.send(JSON.stringify(payload));
    }
  }
}
