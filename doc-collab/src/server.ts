import http from "node:http";
import { WebSocketServer, type RawData } from "ws";
import { config } from "./config.js";
import { RoomManager, YJS_UPDATE_FRAME } from "./roomManager.js";

const roomManager = new RoomManager();

function parseRoomRequest(url: string | undefined): { artifactId: string; token: string; deviceId: string } | null {
  if (!url) {
    return null;
  }
  const parsed = new URL(url, "http://127.0.0.1");
  const match = parsed.pathname.match(/^\/rooms\/([^/]+)$/);
  if (!match) {
    return null;
  }
  return {
    artifactId: decodeURIComponent(match[1]),
    token: parsed.searchParams.get("access_token") || parsed.searchParams.get("token") || "",
    deviceId: parsed.searchParams.get("deviceId") || "browser"
  };
}

function rawDataToUint8Array(data: RawData): Uint8Array {
  if (Buffer.isBuffer(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
  }
  if (data instanceof ArrayBuffer) {
    return new Uint8Array(data);
  }
  if (Array.isArray(data)) {
    return new Uint8Array(Buffer.concat(data));
  }
  return new Uint8Array(Buffer.from(String(data)));
}

async function main(): Promise<void> {
  await roomManager.start();

  const server = http.createServer((request, response) => {
    if (request.url === "/health") {
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({
        status: "UP",
        protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
        redisFanoutEnabled: roomManager.redisFanoutEnabled(),
        redisStreamsEnabled: roomManager.redisStreamsEnabled(),
        instanceId: config.instanceId
      }));
      return;
    }
    response.writeHead(404, { "Content-Type": "application/json" });
    response.end(JSON.stringify({ error: "Not found" }));
  });

  const wss = new WebSocketServer({ server });

  wss.on("connection", (socket, request) => {
    const roomRequest = parseRoomRequest(request.url);
    if (!roomRequest || !roomRequest.token) {
      socket.send(JSON.stringify({ type: "COLLAB_ERROR", message: "artifactId and access_token are required." }));
      socket.close(1008, "unauthorized");
      return;
    }

    roomManager.join(socket, roomRequest.artifactId, roomRequest.token, roomRequest.deviceId)
      .catch((error) => {
        socket.send(JSON.stringify({
          type: "COLLAB_ERROR",
          message: error instanceof Error ? error.message : "Failed to join room."
        }));
        socket.close(1008, "join failed");
      });

    socket.on("message", (data, isBinary) => {
      void (async () => {
        if (isBinary) {
          const frame = rawDataToUint8Array(data);
          if (frame[0] !== YJS_UPDATE_FRAME) {
            throw new Error("Unsupported binary frame type.");
          }
          await roomManager.applyClientUpdate(socket, frame.slice(1));
          return;
        }
        const payload = JSON.parse(String(data)) as {
          action?: string;
          cursorStart?: number | null;
          cursorEnd?: number | null;
          editing?: boolean;
        };
        if (payload.action === "CURSOR") {
          roomManager.updateCursor(
            socket,
            typeof payload.cursorStart === "number" ? payload.cursorStart : null,
            typeof payload.cursorEnd === "number" ? payload.cursorEnd : null,
            Boolean(payload.editing)
          );
          return;
        }
        if (payload.action === "PING") {
          socket.send(JSON.stringify({ type: "PONG" }));
          return;
        }
        throw new Error("Unsupported JSON action.");
      })().catch((error) => {
        socket.send(JSON.stringify({
          type: "COLLAB_ERROR",
          message: error instanceof Error ? error.message : "Collaboration operation failed."
        }));
      });
    });

    socket.on("close", () => {
      roomManager.leave(socket);
    });
  });

  setInterval(() => roomManager.sweepIdleRooms(), Math.max(config.heartbeatMs, 10000)).unref();

  server.listen(config.port, config.host, () => {
    console.log(JSON.stringify({
      service: "agenthub-doc-collab",
      status: "UP",
      protocol: "AGENTHUB_ARTIFACT_COLLAB_V2_YJS",
      host: config.host,
      port: config.port,
      redisFanoutEnabled: roomManager.redisFanoutEnabled(),
      redisStreamsEnabled: roomManager.redisStreamsEnabled(),
      instanceId: config.instanceId
    }));
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
