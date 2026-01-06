import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Batch create tasks
 *
 * Creates multiple tasks at once.
 */
export function registerBatchCreateTasksTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "batch_create_tasks",
    {
      description: "Create multiple tasks at once in TickTick. More efficient than creating tasks one by one.",
      inputSchema: {
        tasks: z
          .array(
            z.object({
              title: z.string().describe("The title of the task (required)"),
              projectId: z
                .string()
                .optional()
                .describe("The project ID (defaults to inbox if not specified)"),
              content: z.string().optional().describe("Task description/notes"),
              priority: z
                .number()
                .min(0)
                .max(5)
                .optional()
                .describe("Priority: 0=None, 1=Low, 3=Medium, 5=High"),
              dueDate: z
                .string()
                .optional()
                .describe(
                  "Due date in ISO 8601 format (e.g., 2024-01-15T17:00:00+0000)"
                ),
            })
          )
          .describe("Array of task objects to create"),
      },
    },
    async ({ tasks }) => {
      try {
        const client = await getClient();
        const createdTasks = await client.batchCreateTasks(tasks);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Successfully created ${createdTasks.length} tasks!`,
                  count: createdTasks.length,
                  tasks: createdTasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    projectId: t.projectId,
                    content: t.content,
                    priority: t.priority,
                    dueDate: t.dueDate,
                    status: t.status,
                  })),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: errorMessage,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }
    }
  );
}
