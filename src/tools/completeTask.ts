import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Complete task
 *
 * Marks a task as complete.
 */
export function registerCompleteTaskTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "complete_task",
    "Mark a task as complete in TickTick.",
    {
      projectId: z.string().describe("The project ID containing the task"),
      taskId: z.string().describe("The ID of the task to complete"),
    },
    async ({ projectId, taskId }) => {
      try {
        const client = await getClient();
        await client.completeTask(projectId, taskId);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: "Task completed successfully!",
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
