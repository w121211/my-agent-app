// packages/events-core/src/server/routers/task-router.ts
import { z } from "zod";
import { TaskService } from "../../services/task-service.js";
import { router, publicProcedure } from "../trpc-server.js";

// Task schemas
export const createTaskSchema = z.object({
  taskName: z.string().min(1),
  taskConfig: z.record(z.unknown()).default({}),
  correlationId: z.string().optional(),
});

export const taskIdSchema = z.object({
  taskId: z.string().uuid(),
  correlationId: z.string().optional(),
});

export function createTaskRouter(taskService: TaskService) {
  return router({
    create: publicProcedure
      .input(createTaskSchema)
      .mutation(async ({ input }) => {
        return taskService.createTask(
          input.taskName,
          input.taskConfig,
          input.correlationId
        );
      }),

    start: publicProcedure.input(taskIdSchema).mutation(async ({ input }) => {
      return taskService.startTask(input.taskId, input.correlationId);
    }),

    getById: publicProcedure.input(taskIdSchema).query(async ({ input }) => {
      const task = await taskService.getTaskById(input.taskId);
      if (!task) {
        throw new Error(`Task ${input.taskId} not found`);
      }
      return task;
    }),

    getAll: publicProcedure.query(async () => {
      return taskService.getAllTasks();
    }),
  });
}
