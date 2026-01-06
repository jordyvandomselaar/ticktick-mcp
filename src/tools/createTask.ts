import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Create task
 *
 * Creates a new task.
 */
export function registerCreateTaskTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.registerTool(
    "create_task",
    {
      description: "Create a new task in TickTick.",
      inputSchema: {
        title: z.string().describe("The title of the task"),
        projectId: z
          .string()
          .optional()
          .describe("The project ID (defaults to inbox if not specified)"),
        content: z.string().optional().describe("Task description/notes"),
        dueDate: z
          .string()
          .optional()
          .describe("Due date in ISO 8601 format (e.g., 2024-01-15T17:00:00+0000)"),
        priority: z
          .number()
          .min(0)
          .max(5)
          .optional()
          .describe("Priority: 0=None, 1=Low, 3=Medium, 5=High"),
        tags: z.array(z.string()).optional().describe("Array of tag names"),
        isAllDay: z
          .boolean()
          .optional()
          .describe("Whether this is an all-day task (no specific time)"),
        startDate: z
          .string()
          .optional()
          .describe("Start date in ISO 8601 format (e.g., 2024-01-15T09:00:00+0000)"),
        timeZone: z
          .string()
          .optional()
          .describe("IANA timezone (e.g., 'America/New_York', 'Europe/London')"),
        reminders: z
          .array(z.string())
          .optional()
          .describe("Array of reminder strings in iCalendar TRIGGER format (e.g., 'TRIGGER:P0DT9H0M0S' for 9:00 AM, 'TRIGGER:-PT15M' for 15 minutes before)"),
        repeat: z
          .string()
          .optional()
          .describe("Recurrence rule in RRULE format (e.g., 'RRULE:FREQ=DAILY;INTERVAL=1' for daily, 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR' for Mon/Wed/Fri)"),
        items: z
          .array(
            z.object({
              title: z.string().describe("Subtask/checklist item text"),
              status: z
                .number()
                .min(0)
                .max(1)
                .optional()
                .describe("Status: 0=Unchecked (default), 1=Checked"),
            })
          )
          .optional()
          .describe("Array of subtask/checklist items"),
      },
    },
    async ({ title, projectId, content, dueDate, priority, tags, isAllDay, startDate, timeZone, reminders, repeat, items }) => {
      try {
        const client = await getClient();
        const task = await client.createTask({
          title,
          projectId,
          content,
          dueDate,
          priority,
          isAllDay,
          startDate,
          timeZone,
          reminders,
          repeatFlag: repeat,
          items,
        });

        // If tags are provided, update the task with tags
        let finalTask = task;
        if (tags && tags.length > 0) {
          finalTask = await client.updateTask(task.id, { tags });
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task "${finalTask.title}" created successfully!`,
                  task: {
                    id: finalTask.id,
                    title: finalTask.title,
                    projectId: finalTask.projectId,
                    content: finalTask.content,
                    priority: finalTask.priority,
                    dueDate: finalTask.dueDate,
                    startDate: finalTask.startDate,
                    isAllDay: finalTask.isAllDay,
                    timeZone: finalTask.timeZone,
                    reminders: finalTask.reminders,
                    repeat: finalTask.repeatFlag,
                    status: finalTask.status,
                    tags: finalTask.tags,
                    items: finalTask.items?.map((item) => ({
                      id: item.id,
                      title: item.title,
                      status: item.status,
                    })),
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
