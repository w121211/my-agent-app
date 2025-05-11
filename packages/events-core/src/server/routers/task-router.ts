// packages/events-core/src/server/routers/task-router.ts
import { router, loggedProcedure } from "../trpc-server.js";
import { createTaskSchema, taskIdSchema } from "../schemas.js";
import { TaskService } from "../../services/task-service.js";

export function createTaskRouter(taskService: TaskService) {
  return router({
    create: loggedProcedure
      .input(createTaskSchema)
      .mutation(async ({ input }) => {
        return taskService.createTask(
          input.taskName,
          input.taskConfig,
          input.correlationId
        );
      }),

    start: loggedProcedure.input(taskIdSchema).mutation(async ({ input }) => {
      return taskService.startTask(input.taskId, input.correlationId);
    }),

    getById: loggedProcedure.input(taskIdSchema).query(async ({ input }) => {
      const task = await taskService.getTaskById(input.taskId);
      if (!task) {
        throw new Error(`Task ${input.taskId} not found`);
      }
      return task;
    }),

    getAll: loggedProcedure.query(async () => {
      return taskService.getAllTasks();
    }),
  });
}
