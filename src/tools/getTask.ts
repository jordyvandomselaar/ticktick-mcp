import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Get task
 *
 * Gets a specific task by ID.
 */
export function registerGetTaskTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "get_task",
    {
      description: "Get a specific task from TickTick.",
      inputSchema: {
        projectId: z.string().describe("The project ID containing the task"),
        taskId: z.string().describe("The ID of the task to retrieve"),
      },
    },
    async ({ projectId, taskId }) => {
      try {
        const client = await getClient();
        const task = await client.getTask(projectId, taskId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  task: {
                    id: task.id,
                    title: task.title,
                    projectId: task.projectId,
                    content: task.content,
                    priority: task.priority,
                    status: task.status,
                    dueDate: task.dueDate,
                    startDate: task.startDate,
                    isAllDay: task.isAllDay,
                    tags: task.tags,
                    items: task.items.map((item) => ({
                      id: item.id,
                      title: item.title,
                      status: item.status,
                    })),
                    createdTime: task.createdTime,
                    modifiedTime: task.modifiedTime,
                  },
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
