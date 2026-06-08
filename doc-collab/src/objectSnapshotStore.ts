import { AgentHubClient, type AgentHubSnapshotManifest } from "./agenthubClient.js";

export class ObjectSnapshotStore {
  constructor(
    private readonly agenthubClient: AgentHubClient
  ) {}

  async loadSnapshot(
    artifactId: string,
    token: string
  ): Promise<{ manifest: AgentHubSnapshotManifest; snapshotBytes: Uint8Array } | null> {
    return this.agenthubClient.loadSnapshot(artifactId, token);
  }

  async saveSnapshot(
    artifactId: string,
    token: string,
    payload: {
      roomId: string;
      protocol: string;
      roomVersion: number;
      snapshotBytes: Uint8Array;
    }
  ): Promise<void> {
    await this.agenthubClient.saveSnapshot(artifactId, token, payload);
  }
}
