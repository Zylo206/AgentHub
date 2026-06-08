import { Redis } from "ioredis";
import type { PersistedUpdate } from "./persistence.js";

export interface FanoutMessage extends PersistedUpdate {
  roomVersion: number;
}

export class RedisFanout {
  private readonly pub: Redis;
  private readonly sub: Redis;
  private readonly channel = "agenthub:doc-collab:v2:updates";
  private readonly streamPrefix = "agenthub:doc-collab:v2:stream:";
  private readonly snapshotPrefix = "agenthub:doc-collab:v2:snapshot:";
  private streamsAvailable = false;

  constructor(redisUrl: string) {
    this.pub = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
    this.sub = new Redis(redisUrl, { lazyConnect: true, maxRetriesPerRequest: 1 });
  }

  async connect(onMessage: (message: FanoutMessage) => void): Promise<void> {
    await Promise.all([this.pub.connect(), this.sub.connect()]);
    this.streamsAvailable = await this.detectStreams();
    await this.sub.subscribe(this.channel);
    this.sub.on("message", (_channel: string, payload: string) => {
      try {
        onMessage(JSON.parse(payload) as FanoutMessage);
      } catch {
        // Ignore malformed peer messages; local sockets remain authoritative for their own updates.
      }
    });
  }

  async publish(message: FanoutMessage): Promise<void> {
    if (this.streamsAvailable) {
      await this.pub.xadd(
        `${this.streamPrefix}${message.artifactId}`,
        "*",
        "updateId",
        message.updateId,
        "sourceInstanceId",
        message.sourceInstanceId,
        "updateBase64",
        message.updateBase64,
        "createdAt",
        message.createdAt
      );
    }
    await this.pub.publish(this.channel, JSON.stringify(message));
  }

  async loadStream(artifactId: string): Promise<PersistedUpdate[]> {
    if (!this.streamsAvailable) {
      return [];
    }
    const entries = await this.pub.xrange(`${this.streamPrefix}${artifactId}`, "-", "+");
    return entries.map(([, fields]: [string, string[]]) => {
      const record: Record<string, string> = {};
      for (let index = 0; index < fields.length; index += 2) {
        record[fields[index]] = fields[index + 1];
      }
      return {
        artifactId,
        updateId: record.updateId,
        sourceInstanceId: record.sourceInstanceId,
        updateBase64: record.updateBase64,
        createdAt: record.createdAt
      };
    });
  }

  async loadSnapshot(artifactId: string): Promise<Uint8Array | null> {
    const snapshot = await this.pub.get(`${this.snapshotPrefix}${artifactId}`);
    return snapshot ? Buffer.from(snapshot, "base64") : null;
  }

  async saveInitialSnapshot(artifactId: string, snapshot: Uint8Array): Promise<boolean> {
    const result = await this.pub.set(`${this.snapshotPrefix}${artifactId}`, Buffer.from(snapshot).toString("base64"), "NX");
    return result === "OK";
  }

  async saveSnapshot(artifactId: string, snapshot: Uint8Array): Promise<void> {
    await this.pub.set(`${this.snapshotPrefix}${artifactId}`, Buffer.from(snapshot).toString("base64"));
  }

  async disconnect(): Promise<void> {
    await Promise.allSettled([this.pub.quit(), this.sub.quit()]);
  }

  isStreamsAvailable(): boolean {
    return this.streamsAvailable;
  }

  private async detectStreams(): Promise<boolean> {
    try {
      await this.pub.xrange(`${this.streamPrefix}__capability_probe__`, "-", "+");
      return true;
    } catch (error) {
      console.warn(`Redis Streams unavailable; falling back to Pub/Sub fanout only: ${
        error instanceof Error ? error.message : String(error)
      }`);
      return false;
    }
  }
}
