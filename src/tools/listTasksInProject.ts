import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { TickTickClient } from "../sdk/client.js";

/**
 * Tool: List tasks in project
 *
 * Returns all tasks in a specific project (without project metadata).
 * This is a convenience tool that wraps getProjectWithTasks but only returns tasks.
 */
export function registerListTasksInProjectTool(
  server: McpServer,
  getClient: () => Promise<TickTickClient>
) {
  server.tool(
    "list_tasks_in_project",
    "List all tasks in a specific project with optional client-side filtering and sorting. Returns only the tasks array without project metadata.",
    {
      projectId: z.string().describe("The ID of the project to list tasks from"),
      status: z.enum(['active', 'completed', 'all']).optional().describe("Filter by task status (default: 'all')"),
      priority: z.union([z.number(), z.array(z.number())]).optional().describe("Filter by priority: single value (0,1,3,5) or array [0,1,3,5]"),
      dueBefore: z.string().optional().describe("ISO date - include only tasks due before this date"),
      dueAfter: z.string().optional().describe("ISO date - include only tasks due after this date"),
      startBefore: z.string().optional().describe("ISO date - include only tasks starting before this date"),
      startAfter: z.string().optional().describe("ISO date - include only tasks starting after this date"),
      hasSubtasks: z.boolean().optional().describe("Filter by presence of subtasks: true=with subtasks, false=without"),
      tags: z.array(z.string()).optional().describe("Filter by tags - include tasks with any of these tags"),
      search: z.string().optional().describe("Text search - filter tasks whose title or content contains this text (case-insensitive)"),
      sortBy: z.enum(['dueDate', 'priority', 'title', 'createdTime', 'modifiedTime', 'sortOrder']).optional().describe("Field to sort by"),
      sortDirection: z.enum(['asc', 'desc']).optional().describe("Sort direction (default: 'asc')"),
      limit: z.number().optional().describe("Maximum number of tasks to return"),
    },
    async ({ projectId, status, priority, dueBefore, dueAfter, startBefore, startAfter, hasSubtasks, tags, search, sortBy, sortDirection, limit }) => {
      try {
        const client = await getClient();
        const data = await client.getProjectWithTasks(projectId);

        // Apply filters
        let filteredTasks = data.tasks;

        // Filter by status
        if (status && status !== 'all') {
          filteredTasks = filteredTasks.filter(t => {
            if (status === 'active') return t.status === 0;
            if (status === 'completed') return t.status === 2;
            return true;
          });
        }

        // Filter by priority
        if (priority !== undefined) {
          const priorities = Array.isArray(priority) ? priority : [priority];
          filteredTasks = filteredTasks.filter(t => priorities.includes(t.priority));
        }

        // Filter by due date
        if (dueBefore) {
          const beforeDate = new Date(dueBefore);
          filteredTasks = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) < beforeDate);
        }
        if (dueAfter) {
          const afterDate = new Date(dueAfter);
          filteredTasks = filteredTasks.filter(t => t.dueDate && new Date(t.dueDate) > afterDate);
        }

        // Filter by start date
        if (startBefore) {
          const beforeDate = new Date(startBefore);
          filteredTasks = filteredTasks.filter(t => t.startDate && new Date(t.startDate) < beforeDate);
        }
        if (startAfter) {
          const afterDate = new Date(startAfter);
          filteredTasks = filteredTasks.filter(t => t.startDate && new Date(t.startDate) > afterDate);
        }

        // Filter by subtasks
        if (hasSubtasks !== undefined) {
          filteredTasks = filteredTasks.filter(t => {
            const hasItems = t.items && t.items.length > 0;
            return hasSubtasks ? hasItems : !hasItems;
          });
        }

        // Filter by tags
        if (tags && tags.length > 0) {
          filteredTasks = filteredTasks.filter(t => {
            return t.tags && t.tags.some(tag => tags.includes(tag));
          });
        }

        // Filter by search text
        if (search) {
          const searchLower = search.toLowerCase();
          filteredTasks = filteredTasks.filter(t => {
            return t.title.toLowerCase().includes(searchLower) ||
                   (t.content && t.content.toLowerCase().includes(searchLower));
          });
        }

        // Apply sorting
        if (sortBy) {
          const direction = sortDirection === 'desc' ? -1 : 1;
          filteredTasks.sort((a, b) => {
            let aVal: any;
            let bVal: any;

            switch (sortBy) {
              case 'dueDate':
                aVal = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
                bVal = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
                break;
              case 'priority':
                aVal = a.priority;
                bVal = b.priority;
                break;
              case 'title':
                aVal = a.title.toLowerCase();
                bVal = b.title.toLowerCase();
                break;
              case 'createdTime':
                aVal = new Date(a.createdTime).getTime();
                bVal = new Date(b.createdTime).getTime();
                break;
              case 'modifiedTime':
                aVal = new Date(a.modifiedTime).getTime();
                bVal = new Date(b.modifiedTime).getTime();
                break;
              case 'sortOrder':
                aVal = a.sortOrder;
                bVal = b.sortOrder;
                break;
              default:
                return 0;
            }

            if (aVal < bVal) return -1 * direction;
            if (aVal > bVal) return 1 * direction;
            return 0;
          });
        }

        // Apply limit
        if (limit && limit > 0) {
          filteredTasks = filteredTasks.slice(0, limit);
        }

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  total: data.tasks.length,
                  count: filteredTasks.length,
                  tasks: filteredTasks.map((t) => ({
                    id: t.id,
                    title: t.title,
                    content: t.content,
                    priority: t.priority,
                    status: t.status,
                    dueDate: t.dueDate,
                    startDate: t.startDate,
                    isAllDay: t.isAllDay,
                    tags: t.tags,
                    items: t.items?.map((item) => ({
                      id: item.id,
                      title: item.title,
                      status: item.status,
                    })),
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
