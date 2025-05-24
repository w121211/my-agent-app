// packages/events-core/src/services/user-settings-repository.ts
import path from "node:path";
import os from "node:os";
import { Logger, ILogObj } from "tslog";
import {
  fileExists,
  readJsonFile,
  writeJsonFile,
  createDirectory,
} from "../file-helpers.js";
import { ProjectFolder } from "./project-folder-service.js";

export interface UserSettings {
  projectFolders: ProjectFolder[];
  // Additional settings can be added in the future
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  projectFolders: [],
};

export class UserSettingsRepository {
  private readonly logger: Logger<ILogObj>;
  private readonly filePath: string;

  constructor(settingsFilePath: string) {
    this.logger = new Logger({ name: "UserSettingsRepository" });
    this.filePath = settingsFilePath;
  }

  public async getSettings(): Promise<UserSettings> {
    if (!(await fileExists(this.filePath))) {
      this.logger.info(
        `Settings file not found, creating default at ${this.filePath}`
      );
      await this.saveSettings(DEFAULT_USER_SETTINGS);
      return { ...DEFAULT_USER_SETTINGS };
    }

    try {
      return await readJsonFile<UserSettings>(this.filePath);
    } catch (error) {
      this.logger.error(`Error reading settings file: ${error}`);
      throw new Error(`Failed to read settings file: ${error}`);
    }
  }

  public async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await writeJsonFile(this.filePath, settings);
      this.logger.debug(`Settings saved successfully to ${this.filePath}`);
    } catch (error) {
      this.logger.error(`Error saving settings file: ${error}`);
      throw new Error(`Failed to save settings file: ${error}`);
    }
  }

  public getFilePath(): string {
    return this.filePath;
  }
}

export async function createUserSettingsRepository(
  userDataDir: string
): Promise<UserSettingsRepository> {
  const filePath = path.join(userDataDir, "userSettings.json");
  return new UserSettingsRepository(filePath);
}
