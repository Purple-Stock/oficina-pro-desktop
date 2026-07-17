import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

interface TauriWindowConfig {
  title?: string;
  width?: number;
  height?: number;
  fullscreen?: boolean;
  maximized?: boolean;
}

interface TauriConfig {
  app?: {
    windows?: TauriWindowConfig[];
  };
}

describe("tauri window config", () => {
  it("opens the main window maximized to fill the screen without native fullscreen", () => {
    const config = JSON.parse(
      readFileSync(resolve(process.cwd(), "src-tauri/tauri.conf.json"), "utf8")
    ) as TauriConfig;

    const mainWindow = config.app?.windows?.[0];
    expect(mainWindow).toBeDefined();
    expect(mainWindow?.maximized).toBe(true);
    expect(mainWindow?.fullscreen).not.toBe(true);
  });
});
