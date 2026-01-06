import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: Update task
 *
 * Updates an existing task.
 */
export function registerUpdateTaskTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "update_task",
    "Update an existing task in TickTick. Supports all task fields including scheduling, reminders, recurrence, and subtasks.",
    {
      taskId: z.string().describe("The ID of the task to update"),
      title: z.string().optional().describe("New title for the task"),
      content: z.string().optional().describe("New description/notes"),
      dueDate: z
        .string()
        .nullable()
        .optional()
        .describe("New due date (ISO 8601) or null to remove"),
      priority: z
        .number()
        .min(0)
        .max(5)
        .optional()
        .describe("New priority: 0=None, 1=Low, 3=Medium, 5=High"),
      tags: z.array(z.string()).optional().describe("Array of tag names"),
      projectId: z
        .string()
        .optional()
        .describe("Move task to a different project by specifying the target project ID"),
      isAllDay: z
        .boolean()
        .optional()
        .describe("Whether this is an all-day task (no specific time)"),
      startDate: z
        .string()
        .nullable()
        .optional()
        .describe("Start date in ISO 8601 format (e.g., 2024-01-15T09:00:00+0000) or null to remove"),
      timeZone: z
        .string()
        .optional()
        .describe("IANA timezone (e.g., 'America/New_York', 'Europe/London')"),
      reminders: z
        .array(z.string())
        .nullable()
        .optional()
        .describe("Array of reminder strings in iCalendar TRIGGER format (e.g., 'TRIGGER:P0DT9H0M0S' for 9:00 AM, 'TRIGGER:-PT15M' for 15 minutes before) or null to clear all reminders"),
      repeat: z
        .string()
        .nullable()
        .optional()
        .describe("Recurrence rule in RRULE format (e.g., 'RRULE:FREQ=DAILY;INTERVAL=1' for daily, 'RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR' for Mon/Wed/Fri) or null to remove recurrence"),
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
        .describe("Array of subtask/checklist items. Note: This replaces existing items when provided."),
    },
    async ({ taskId, title, content, dueDate, priority, tags, projectId, isAllDay, startDate, timeZone, reminders, repeat, items }) => {
      try {
        const client = await getClient();
        const task = await client.updateTask(taskId, {
          title,
          content,
          dueDate,
          priority,
          tags,
          projectId,
          isAllDay,
          startDate,
          timeZone,
          reminders: reminders === null ? undefined : reminders,
          repeatFlag: repeat === null ? "" : repeat,
          items,
        });

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  message: `Task "${task.title}" updated successfully!`,
                  task: {
                    id: task.id,
                    title: task.title,
                    projectId: task.projectId,
                    content: task.content,
                    priority: task.priority,
                    dueDate: task.dueDate,
                    startDate: task.startDate,
                    isAllDay: task.isAllDay,
                    timeZone: task.timeZone,
                    reminders: task.reminders,
                    repeat: task.repeatFlag,
                    status: task.status,
                    tags: task.tags,
                    items: task.items?.map((item) => ({
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
