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

/**
 * Interface for a project folder
 */
export interface ProjectFolder {
  id: string;
  name: string;
  path: string;
}

/**
 * Interface for user settings
 */
export interface UserSettings {
  projectFolders: ProjectFolder[];
  // Additional settings can be added in the future
}

/**
 * Default user settings
 */
export const DEFAULT_USER_SETTINGS: UserSettings = {
  projectFolders: [],
};

/**
 * Repository for managing user settings
 */
export class UserSettingsRepository {
  private readonly logger: Logger<ILogObj>;
  private readonly filePath: string;

  constructor(settingsFilePath: string) {
    this.logger = new Logger({ name: "UserSettingsRepository" });
    this.filePath = settingsFilePath;
  }

  /**
   * Get user settings
   * Creates the settings file with default values if it doesn't exist
   */
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

  /**
   * Save user settings
   */
  public async saveSettings(settings: UserSettings): Promise<void> {
    try {
      await writeJsonFile(this.filePath, settings);
      this.logger.debug(`Settings saved successfully to ${this.filePath}`);
    } catch (error) {
      this.logger.error(`Error saving settings file: ${error}`);
      throw new Error(`Failed to save settings file: ${error}`);
    }
  }

  /**
   * Get file path
   */
  public getFilePath(): string {
    return this.filePath;
  }
}

/**
 * Factory function to create a user settings repository
 */
export function createUserSettingsRepository(
  appName: string = "app"
): UserSettingsRepository {
  // Use user's home directory
  const homeDir = os.homedir();
  const appDir = path.join(homeDir, `.${appName}`);

  // Ensure app directory exists
  createDirectory(appDir);

  const filePath = path.join(appDir, "userSettings.json");
  return new UserSettingsRepository(filePath);
}
