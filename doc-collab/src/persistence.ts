import fs from "node:fs/promises";
import path from "node:path";

export interface PersistedUpdate {
  updateId: string;
  sourceInstanceId: string;
  artifactId: string;
  updateBase64: string;
  createdAt: string;
}

export class FileCollabPersistence {
  constructor(private readonly storageDir: string) {}

  async loadSnapshot(artifactId: string): Promise<Uint8Array | null> {
    const file = this.snapshotPath(artifactId);
    try {
      return new Uint8Array(await fs.readFile(file));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async saveSnapshot(artifactId: string, update: Uint8Array): Promise<void> {
    await fs.mkdir(this.roomDir(artifactId), { recursive: true });
    await fs.writeFile(this.snapshotPath(artifactId), Buffer.from(update));
  }

  async appendUpdate(update: PersistedUpdate): Promise<void> {
    await fs.mkdir(this.roomDir(update.artifactId), { recursive: true });
    await fs.appendFile(this.logPath(update.artifactId), `${JSON.stringify(update)}\n`, "utf8");
  }

  async loadUpdates(artifactId: string): Promise<PersistedUpdate[]> {
    try {
      const content = await fs.readFile(this.logPath(artifactId), "utf8");
      return content
        .split(/\r?\n/)
        .filter(Boolean)
        .map((line) => JSON.parse(line) as PersistedUpdate);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  async compactLog(artifactId: string): Promise<void> {
    await fs.mkdir(this.roomDir(artifactId), { recursive: true });
    await fs.writeFile(this.logPath(artifactId), "", "utf8");
  }

  private roomDir(artifactId: string): string {
    return path.join(this.storageDir, encodeURIComponent(artifactId));
  }

  private snapshotPath(artifactId: string): string {
    return path.join(this.roomDir(artifactId), "snapshot.bin");
  }

  private logPath(artifactId: string): string {
    return path.join(this.roomDir(artifactId), "updates.jsonl");
  }
}
