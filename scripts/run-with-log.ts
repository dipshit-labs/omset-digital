#!/usr/bin/env bun

import fs from "node:fs";
import path from "node:path";

import { ANSI_REGEX } from "./utils";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const TASK_LOG_PATTERN = /^dev-\d{4}-\d{2}-\d{2}T.*-\d+\.log$/u;

const pad = (n: number): string => String(n).padStart(2, "0");

const formatTimestamp = (date: Date): string => {
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return `${year}-${month}-${day}T${hours}-${minutes}-${seconds}`;
};

const pruneOldLogs = (logDir: string, task: string): void => {
  try {
    const files = fs.readdirSync(logDir);
    const now = Date.now();
    const taskPattern =
      task === "dev"
        ? TASK_LOG_PATTERN
        : new RegExp(`^${task}-\\d{4}-\\d{2}-\\d{2}T.*-\\d+\\.log$`, "u");

    for (const file of files) {
      if (!taskPattern.test(file)) {
        continue;
      }

      const fullPath = path.join(logDir, file);
      try {
        const stats = fs.statSync(fullPath);
        if (now - stats.mtimeMs > ONE_DAY_MS) {
          fs.unlinkSync(fullPath);
        }
      } catch {
        // Ignore stat or deletion errors for concurrent runs
      }
    }
  } catch {
    // Ignore directory read errors
  }
};

const main = async (): Promise<void> => {
  const args = Bun.argv.slice(2);
  const [task, ...restArgs] = args;

  if (!task) {
    console.error(
      "Usage: bun scripts/run-with-log.ts <turbo-task> [turbo-args...]"
    );
    process.exit(1);
  }

  const logDir = path.resolve(".data", "logs");
  fs.mkdirSync(logDir, { recursive: true });

  pruneOldLogs(logDir, task);

  const timestamp = formatTimestamp(new Date());
  const logFilePath = path.join(
    logDir,
    `${task}-${timestamp}-${process.pid}.log`
  );
  const latestFilePath = path.join(logDir, `${task}-latest.log`);

  const runLogWriter = Bun.file(logFilePath).writer();
  const latestLogWriter = Bun.file(latestFilePath).writer();

  const turboArgs = ["run", task, "--ui=stream", ...restArgs];
  const proc = Bun.spawn(["bun", "run", "turbo", ...turboArgs], {
    env: process.env,
    stderr: "pipe",
    stdin: "inherit",
    stdout: "pipe",
  });

  const pipeStream = async (
    readable: ReadableStream<Uint8Array>,
    targetWriter: NodeJS.WriteStream
  ): Promise<void> => {
    const decoder = new TextDecoder();
    for await (const chunk of readable) {
      targetWriter.write(chunk);
      const cleanText = decoder.decode(chunk).replace(ANSI_REGEX, "");
      runLogWriter.write(cleanText);
      latestLogWriter.write(cleanText);
    }
  };

  process.on("SIGINT", () => {
    try {
      proc.kill("SIGINT");
    } catch {
      // Already terminated
    }
  });
  process.on("SIGTERM", () => {
    try {
      proc.kill("SIGTERM");
    } catch {
      // Already terminated
    }
  });

  await Promise.all([
    pipeStream(proc.stdout, process.stdout),
    pipeStream(proc.stderr, process.stderr),
    proc.exited,
  ]);

  await runLogWriter.end();
  await latestLogWriter.end();

  process.exit(proc.exitCode ?? 0);
};

try {
  await main();
} catch (error: unknown) {
  console.error(error);
  process.exit(1);
}
