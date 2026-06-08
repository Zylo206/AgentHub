import fs from "node:fs/promises";
import path from "node:path";

export class ObjectSnapshotStore {
  constructor(
    private readonly rootDir: string,
    private readonly bucket: string
  ) {}

  async loadSnapshot(artifactId: string): Promise<Uint8Array | null> {
    try {
      return new Uint8Array(await fs.readFile(this.snapshotPath(artifactId)));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  async saveSnapshot(artifactId: string, update: Uint8Array): Promise<void> {
    const target = this.snapshotPath(artifactId);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, Buffer.from(update));
  }

  private snapshotPath(artifactId: string): string {
    return path.join(
      this.rootDir,
      this.bucket,
      "doc-collab",
      encodeURIComponent(artifactId),
      "snapshot.bin"
    );
  }
}
