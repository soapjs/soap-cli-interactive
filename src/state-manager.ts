import { ensurePathExists } from "@soapjs/soap-cli-common";
import { promises as fsPromises, writeFileSync } from "fs";
import lockfile from "proper-lockfile";

export class StateManager {
  private queue: (() => Promise<void>)[] = [];
  private processingQueue = false;

  constructor(public readonly filepath: string) {}

  async enqueue(writeOperation: () => Promise<void>) {
    this.queue.push(writeOperation);
    if (!this.processingQueue) {
      this.processQueue();
    }
  }

  private async processQueue() {
    this.processingQueue = true;
    while (this.queue.length > 0) {
      const operation = this.queue.shift();
      if (operation) {
        await operation();
      }
    }
    this.processingQueue = false;
  }

  async initState(state: any) {
    ensurePathExists(this.filepath);
    writeFileSync(this.filepath, "");
    if (state) {
      this.updateState(state);
    }
  }

  async updateState(state: any) {
    await this.enqueue(async () => {
      try {
        const release = await lockfile.lock(this.filepath);
        try {
          await fsPromises.writeFile(
            this.filepath,
            JSON.stringify(state, null, 2),
            "utf8"
          );
        } finally {
          await release();
        }
      } catch (error) {
        console.error("Error updating state:", error);
      }
    });
  }
}
