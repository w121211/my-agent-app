// packages/events-core/src/services/user-settings-repository.ts
import path from "node:path";
import { Logger, ILogObj } from "tslog";
import { fileExists, readJsonFile, writeJsonFile } from "../file-helpers.js";
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

    return await readJsonFile<UserSettings>(this.filePath);
  }

  public async saveSettings(settings: UserSettings): Promise<void> {
    await writeJsonFile(this.filePath, settings);
    this.logger.debug(`Settings saved successfully to ${this.filePath}`);
  }

  public getFilePath(): string {
    return this.filePath;
  }
}

export function createUserSettingsRepository(
  userDataDir: string
): UserSettingsRepository {
  const filePath = path.join(userDataDir, "userSettings.json");
  return new UserSettingsRepository(filePath);
}
