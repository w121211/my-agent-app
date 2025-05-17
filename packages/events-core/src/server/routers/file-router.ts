// packages/events-core/src/server/routers/file-router.ts
import { z } from "zod";
import { FileService } from "../../services/file-service.js";
import { router, publicProcedure } from "../trpc-server.js";

// File schemas
export const openFileSchema = z.object({
  filePath: z.string(), // This is now expected to be an absolute path
  correlationId: z.string().optional(),
});

export function createFileRouter(fileService: FileService) {
  return router({
    openFile: publicProcedure.input(openFileSchema).query(async ({ input }) => {
      // filePath is now expected to be an absolute path
      return fileService.openFile(input.filePath, input.correlationId);
    }),

    getFileType: publicProcedure
      .input(openFileSchema)
      .query(async ({ input }) => {
        return fileService.getFileType(input.filePath);
      }),
  });
}
