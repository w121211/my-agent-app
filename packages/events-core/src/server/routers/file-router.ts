// packages/events-core/src/server/routers/file-router.ts
import { router, loggedProcedure } from "../trpc-server.js";
import { openFileSchema } from "../schemas.js";
import { FileService } from "../../services/file-service.js";

export function createFileRouter(fileService: FileService) {
  return router({
    openFile: loggedProcedure.input(openFileSchema).query(async ({ input }) => {
      return fileService.openFile(input.filePath, input.correlationId);
    }),

    getFileType: loggedProcedure
      .input(openFileSchema)
      .query(async ({ input }) => {
        return fileService.getFileType(input.filePath);
      }),
  });
}
