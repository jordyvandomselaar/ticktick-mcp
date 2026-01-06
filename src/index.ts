#!/usr/bin/env node

/**
 * TickTick MCP Server
 *
 * A Model Context Protocol server for integrating with TickTick task management.
 * This server provides tools for OAuth authentication and task/project operations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { TickTickOAuth, createOAuthFromEnv } from "./oauth.js";
import { TickTickClient } from "./sdk/client.js";
import type { Region } from "./sdk/types.js";

// =============================================================================
// Server Setup
// =============================================================================

const server = new McpServer({
  name: "ticktick-mcp",
  version: "0.1.0",
});

// OAuth helper instance - lazily initialized
let oauthHelper: TickTickOAuth | null = null;

/**
 * Get or create the OAuth helper instance.
 */
function getOAuthHelper(): TickTickOAuth {
  if (!oauthHelper) {
    oauthHelper = createOAuthFromEnv();
  }
  return oauthHelper;
}

/**
 * Get an authenticated TickTick client.
 */
async function getClient(): Promise<TickTickClient> {
  const oauth = getOAuthHelper();
  const accessToken = await oauth.getValidAccessToken();
  const region = (process.env.TICKTICK_REGION as Region) ?? "global";
  return new TickTickClient({ accessToken, region });
}

// =============================================================================
// OAuth Authentication Tools
// =============================================================================

/**
 * Tool: Get OAuth authorization URL
 *
 * Returns the URL that users should visit to authorize the application.
 * This initiates the OAuth 2.0 authorization code flow.
 */
server.tool(
  "auth_get_authorization_url",
  "Get the OAuth authorization URL for TickTick. Returns a URL that the user should visit in their browser to authorize the application.",
  {},
  async () => {
    try {
      const oauth = getOAuthHelper();
      const { url, state } = oauth.getAuthorizationUrl();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                authorizationUrl: url,
                state: state,
                instructions: [
                  "1. Open the authorization URL in your browser",
                  "2. Log in to TickTick and authorize the application",
                  "3. After authorization, you will be redirected to a URL containing a 'code' parameter",
                  "4. Copy the 'code' value from the URL",
                  "5. Use the auth_exchange_code tool with the code to complete authentication",
                ],
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
                hint: "Make sure TICKTICK_CLIENT_ID and TICKTICK_CLIENT_SECRET environment variables are set",
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

/**
 * Tool: Exchange authorization code for tokens
 *
 * Exchanges an authorization code (from the OAuth callback) for access and refresh tokens.
 */
server.tool(
  "auth_exchange_code",
  "Exchange an OAuth authorization code for access tokens. Use this after the user has authorized the application and received a code.",
  {
    code: z.string().describe("The authorization code from the OAuth callback URL"),
  },
  async ({ code }) => {
    try {
      const oauth = getOAuthHelper();
      const tokens = await oauth.exchangeCode(code);
      await oauth.storeToken(tokens);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Authentication successful! Tokens have been stored.",
                expiresIn: tokens.expires_in,
                tokenType: tokens.token_type,
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

/**
 * Tool: Check authentication status
 *
 * Returns information about the current authentication state.
 */
server.tool(
  "auth_status",
  "Check the current authentication status. Shows whether the user is authenticated and when the token expires.",
  {},
  async () => {
    try {
      const oauth = getOAuthHelper();
      const status = await oauth.getAuthStatus();

      if (!status.isAuthenticated) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: true,
                  isAuthenticated: false,
                  message:
                    "Not authenticated. Use auth_get_authorization_url to start the OAuth flow.",
                },
                null,
                2
              ),
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                isAuthenticated: true,
                isExpired: status.isExpired,
                expiresAt: status.expiresAt,
                expiresIn: status.expiresIn,
                message: status.isExpired
                  ? "Token is expired. It will be automatically refreshed on next API call."
                  : `Token is valid for ${status.expiresIn} more seconds.`,
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

/**
 * Tool: Refresh access token
 *
 * Manually refresh the access token using the stored refresh token.
 */
server.tool(
  "auth_refresh_token",
  "Manually refresh the OAuth access token. Usually not needed as tokens are automatically refreshed when expired.",
  {},
  async () => {
    try {
      const oauth = getOAuthHelper();
      const storedToken = await oauth.loadToken();

      if (!storedToken) {
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  success: false,
                  error: "Not authenticated. No stored token found.",
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      }

      const newTokens = await oauth.refreshToken(storedToken.refreshToken);
      await oauth.storeToken(newTokens);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Token refreshed successfully!",
                expiresIn: newTokens.expires_in,
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

/**
 * Tool: Logout / Clear tokens
 *
 * Remove stored authentication tokens.
 */
server.tool(
  "auth_logout",
  "Remove stored authentication tokens. This will log out the user from the TickTick integration.",
  {},
  async () => {
    try {
      const oauth = getOAuthHelper();
      await oauth.clearToken();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message:
                  "Logged out successfully. Stored tokens have been cleared.",
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

// =============================================================================
// User Tools
// =============================================================================

/**
 * Tool: Get current user
 *
 * Returns information about the authenticated TickTick user.
 */
server.tool(
  "get_user",
  "Get the current authenticated user's information from TickTick.",
  {},
  async () => {
    try {
      const client = await getClient();
      const user = await client.getUser();

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                user: {
                  id: user.id,
                  username: user.username,
                  name: user.name,
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

// =============================================================================
// Project Tools
// =============================================================================

/**
 * Tool: List all projects
 *
 * Returns all projects for the authenticated user.
 */
server.tool(
  "list_projects",
  "List all projects in the user's TickTick account with optional filtering. By default, only returns active (non-archived) projects.",
  {
    includeArchived: z.boolean().optional().describe("Include archived/closed projects (default: false)"),
    kind: z.enum(['TASK', 'NOTE']).optional().describe("Filter by project type"),
    viewMode: z.enum(['list', 'kanban', 'timeline']).optional().describe("Filter by view mode"),
    search: z.string().optional().describe("Text search in project name (case-insensitive)"),
    limit: z.number().optional().describe("Maximum number of projects to return"),
  },
  async ({ includeArchived, kind, viewMode, search, limit }) => {
    try {
      const client = await getClient();
      let projects = await client.listProjects();

      // Filter out archived projects by default
      if (!includeArchived) {
        projects = projects.filter(p => !p.closed);
      }

      // Filter by kind
      if (kind) {
        projects = projects.filter(p => p.kind === kind);
      }

      // Filter by viewMode
      if (viewMode) {
        projects = projects.filter(p => p.viewMode === viewMode);
      }

      // Filter by search text
      if (search) {
        const searchLower = search.toLowerCase();
        projects = projects.filter(p => p.name.toLowerCase().includes(searchLower));
      }

      // Apply limit
      if (limit && limit > 0) {
        projects = projects.slice(0, limit);
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                count: projects.length,
                projects: projects.map((p) => ({
                  id: p.id,
                  name: p.name,
                  color: p.color,
                  viewMode: p.viewMode,
                  closed: p.closed,
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

/**
 * Tool: Get project with tasks
 *
 * Returns a specific project and all its tasks.
 */
server.tool(
  "get_project",
  "Get a specific project and all its tasks.",
  {
    projectId: z.string().describe("The ID of the project to retrieve"),
  },
  async ({ projectId }) => {
    try {
      const client = await getClient();
      const data = await client.getProjectWithTasks(projectId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                project: {
                  id: data.project.id,
                  name: data.project.name,
                  color: data.project.color,
                  viewMode: data.project.viewMode,
                  closed: data.project.closed,
                },
                taskCount: data.tasks.length,
                tasks: data.tasks.map((t) => ({
                  id: t.id,
                  title: t.title,
                  content: t.content,
                  priority: t.priority,
                  status: t.status,
                  dueDate: t.dueDate,
                  tags: t.tags,
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

/**
 * Tool: Get project by ID (metadata only)
 *
 * Returns a specific project's metadata without its tasks.
 */
server.tool(
  "get_project_by_id",
  "Get a specific project's metadata by ID (without tasks). Use this when you only need project info, not its tasks.",
  {
    projectId: z.string().describe("The ID of the project to retrieve"),
  },
  async ({ projectId }) => {
    try {
      const client = await getClient();
      const project = await client.getProject(projectId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                project: {
                  id: project.id,
                  name: project.name,
                  color: project.color,
                  viewMode: project.viewMode,
                  closed: project.closed,
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

/**
 * Tool: Create project
 *
 * Creates a new project.
 */
server.tool(
  "create_project",
  "Create a new project in TickTick.",
  {
    name: z.string().describe("The name of the project"),
    color: z
      .string()
      .optional()
      .describe('Hex color code (e.g., "#ff6b6b")'),
    viewMode: z
      .enum(["list", "kanban", "timeline"])
      .optional()
      .describe("View mode for the project"),
  },
  async ({ name, color, viewMode }) => {
    try {
      const client = await getClient();
      const project = await client.createProject({
        name,
        color,
        viewMode: viewMode as any,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Project "${project.name}" created successfully!`,
                project: {
                  id: project.id,
                  name: project.name,
                  color: project.color,
                  viewMode: project.viewMode,
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

/**
 * Tool: Update project
 *
 * Updates an existing project.
 */
server.tool(
  "update_project",
  "Update an existing project in TickTick.",
  {
    projectId: z.string().describe("The ID of the project to update"),
    name: z.string().optional().describe("New name for the project"),
    color: z
      .string()
      .optional()
      .describe('New hex color code (e.g., "#ff6b6b")'),
    viewMode: z
      .enum(["list", "kanban", "timeline"])
      .optional()
      .describe("New view mode for the project"),
  },
  async ({ projectId, name, color, viewMode }) => {
    try {
      const client = await getClient();
      const project = await client.updateProject(projectId, {
        name,
        color,
        viewMode: viewMode as any,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: `Project "${project.name}" updated successfully!`,
                project: {
                  id: project.id,
                  name: project.name,
                  color: project.color,
                  viewMode: project.viewMode,
                  closed: project.closed,
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

/**
 * Tool: Delete project
 *
 * Deletes a project.
 */
server.tool(
  "delete_project",
  "Delete a project from TickTick.",
  {
    projectId: z.string().describe("The ID of the project to delete"),
  },
  async ({ projectId }) => {
    try {
      const client = await getClient();
      await client.deleteProject(projectId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Project deleted successfully!",
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

// =============================================================================
// Task Tools
// =============================================================================

/**
 * Tool: List tasks in project
 *
 * Returns all tasks in a specific project (without project metadata).
 * This is a convenience tool that wraps getProjectWithTasks but only returns tasks.
 */
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

/**
 * Tool: Create task
 *
 * Creates a new task.
 */
server.tool(
  "create_task",
  "Create a new task in TickTick.",
  {
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

/**
 * Tool: Update task
 *
 * Updates an existing task.
 */
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

/**
 * Tool: Complete task
 *
 * Marks a task as complete.
 */
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

/**
 * Tool: Delete task
 *
 * Deletes a task.
 */
server.tool(
  "delete_task",
  "Delete a task from TickTick.",
  {
    projectId: z.string().describe("The project ID containing the task"),
    taskId: z.string().describe("The ID of the task to delete"),
  },
  async ({ projectId, taskId }) => {
    try {
      const client = await getClient();
      await client.deleteTask(projectId, taskId);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                message: "Task deleted successfully!",
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

/**
 * Tool: Get task
 *
 * Gets a specific task by ID.
 */
server.tool(
  "get_task",
  "Get a specific task from TickTick.",
  {
    projectId: z.string().describe("The project ID containing the task"),
    taskId: z.string().describe("The ID of the task to retrieve"),
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

/**
 * Tool: Batch create tasks
 *
 * Creates multiple tasks at once.
 */
server.tool(
  "batch_create_tasks",
  "Create multiple tasks at once in TickTick. More efficient than creating tasks one by one.",
  {
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

/**
 * Tool: Get tasks due soon
 *
 * Returns tasks due within a specified number of days across all projects.
 */
server.tool(
  "get_tasks_due_soon",
  "Get tasks that are due soon (within the next N days). Useful for finding urgent work across all projects.",
  {
    days: z.number().optional().describe("Number of days to look ahead (default: 7)"),
    includeOverdue: z.boolean().optional().describe("Include past-due tasks (default: true)"),
    projectId: z.string().optional().describe("Optional: limit to a specific project"),
    status: z.enum(['active', 'all']).optional().describe("Task status filter (default: 'active')"),
  },
  async ({ days = 7, includeOverdue = true, projectId, status = 'active' }) => {
    try {
      const client = await getClient();

      // Calculate date range
      const now = new Date();
      const futureDate = new Date();
      futureDate.setDate(now.getDate() + days);

      let allTasks: any[] = [];

      if (projectId) {
        // Fetch tasks from specific project
        const data = await client.getProjectWithTasks(projectId);
        allTasks = data.tasks.map(t => ({
          ...t,
          projectName: data.project.name,
        }));
      } else {
        // Fetch all projects and their tasks
        const projects = await client.listProjects();
        for (const project of projects) {
          if (!project.closed) { // Skip archived projects
            try {
              const data = await client.getProjectWithTasks(project.id);
              const tasksWithProject = data.tasks.map(t => ({
                ...t,
                projectName: project.name,
              }));
              allTasks = allTasks.concat(tasksWithProject);
            } catch {
              // Skip projects that can't be fetched
              continue;
            }
          }
        }
      }

      // Filter tasks
      let filteredTasks = allTasks;

      // Filter by status
      if (status === 'active') {
        filteredTasks = filteredTasks.filter(t => t.status === 0);
      }

      // Filter by due date
      filteredTasks = filteredTasks.filter(t => {
        if (!t.dueDate) return false;

        const dueDate = new Date(t.dueDate);
        const isOverdue = dueDate < now;
        const isDueSoon = dueDate >= now && dueDate <= futureDate;

        if (includeOverdue && isOverdue) return true;
        if (isDueSoon) return true;
        return false;
      });

      // Sort by due date ascending (earliest first)
      filteredTasks.sort((a, b) => {
        const aDate = new Date(a.dueDate).getTime();
        const bDate = new Date(b.dueDate).getTime();
        return aDate - bDate;
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                count: filteredTasks.length,
                daysAhead: days,
                tasks: filteredTasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  projectId: t.projectId,
                  projectName: t.projectName,
                  dueDate: t.dueDate,
                  priority: t.priority,
                  status: t.status,
                  content: t.content,
                  tags: t.tags,
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

/**
 * Tool: Search tasks
 *
 * Search for tasks by keyword across all projects.
 */
server.tool(
  "search_tasks",
  "Search for tasks by keyword across all projects. Useful for finding tasks by text content.",
  {
    query: z.string().describe("Search term (required)"),
    searchIn: z.array(z.enum(['title', 'content', 'desc'])).optional().describe("Fields to search in (default: ['title', 'content'])"),
    projectIds: z.array(z.string()).optional().describe("Optional: limit to specific project IDs"),
    status: z.enum(['active', 'completed', 'all']).optional().describe("Task status filter (default: 'active')"),
    caseSensitive: z.boolean().optional().describe("Case-sensitive search (default: false)"),
    limit: z.number().optional().describe("Maximum results to return (default: 20)"),
  },
  async ({ query, searchIn = ['title', 'content'], projectIds, status = 'active', caseSensitive = false, limit = 20 }) => {
    try {
      const client = await getClient();

      const searchQuery = caseSensitive ? query : query.toLowerCase();
      let allTasks: any[] = [];

      if (projectIds && projectIds.length > 0) {
        // Search in specific projects
        for (const projectId of projectIds) {
          try {
            const data = await client.getProjectWithTasks(projectId);
            const tasksWithProject = data.tasks.map(t => ({
              ...t,
              projectName: data.project.name,
            }));
            allTasks = allTasks.concat(tasksWithProject);
          } catch {
            continue;
          }
        }
      } else {
        // Search all projects
        const projects = await client.listProjects();
        for (const project of projects) {
          if (!project.closed) {
            try {
              const data = await client.getProjectWithTasks(project.id);
              const tasksWithProject = data.tasks.map(t => ({
                ...t,
                projectName: project.name,
              }));
              allTasks = allTasks.concat(tasksWithProject);
            } catch {
              continue;
            }
          }
        }
      }

      // Filter by status
      let filteredTasks = allTasks;
      if (status === 'active') {
        filteredTasks = filteredTasks.filter(t => t.status === 0);
      } else if (status === 'completed') {
        filteredTasks = filteredTasks.filter(t => t.status === 2);
      }

      // Search and collect matches
      const matches: any[] = [];
      for (const task of filteredTasks) {
        const matchedIn: string[] = [];

        for (const field of searchIn) {
          let fieldValue = '';
          if (field === 'title') fieldValue = task.title || '';
          else if (field === 'content') fieldValue = task.content || '';
          else if (field === 'desc') fieldValue = task.desc || '';

          const searchText = caseSensitive ? fieldValue : fieldValue.toLowerCase();
          if (searchText.includes(searchQuery)) {
            matchedIn.push(field);
          }
        }

        if (matchedIn.length > 0) {
          matches.push({
            ...task,
            matchedIn,
          });
        }

        if (matches.length >= limit) break;
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                query: query,
                count: matches.length,
                tasks: matches.map(t => ({
                  id: t.id,
                  title: t.title,
                  projectId: t.projectId,
                  projectName: t.projectName,
                  content: t.content,
                  dueDate: t.dueDate,
                  priority: t.priority,
                  status: t.status,
                  tags: t.tags,
                  matchedIn: t.matchedIn,
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

/**
 * Tool: Get high priority tasks
 *
 * Returns high priority tasks across all projects.
 */
server.tool(
  "get_high_priority_tasks",
  "Get high priority tasks across all projects. Useful for finding the most important work.",
  {
    minPriority: z.number().optional().describe("Minimum priority level: 0=None, 1=Low, 3=Medium, 5=High (default: 3)"),
    projectId: z.string().optional().describe("Optional: limit to a specific project"),
    includeCompleted: z.boolean().optional().describe("Include completed tasks (default: false)"),
    limit: z.number().optional().describe("Maximum results to return (default: 10)"),
  },
  async ({ minPriority = 3, projectId, includeCompleted = false, limit = 10 }) => {
    try {
      const client = await getClient();

      let allTasks: any[] = [];

      if (projectId) {
        // Fetch tasks from specific project
        const data = await client.getProjectWithTasks(projectId);
        allTasks = data.tasks.map(t => ({
          ...t,
          projectName: data.project.name,
        }));
      } else {
        // Fetch all projects and their tasks
        const projects = await client.listProjects();
        for (const project of projects) {
          if (!project.closed) {
            try {
              const data = await client.getProjectWithTasks(project.id);
              const tasksWithProject = data.tasks.map(t => ({
                ...t,
                projectName: project.name,
              }));
              allTasks = allTasks.concat(tasksWithProject);
            } catch {
              continue;
            }
          }
        }
      }

      // Filter tasks
      let filteredTasks = allTasks;

      // Filter by completion status
      if (!includeCompleted) {
        filteredTasks = filteredTasks.filter(t => t.status === 0);
      }

      // Filter by priority
      filteredTasks = filteredTasks.filter(t => t.priority >= minPriority);

      // Sort by priority desc (high first), then by dueDate asc (earliest first)
      filteredTasks.sort((a, b) => {
        // First sort by priority (descending)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        // Then by due date (ascending, nulls last)
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        if (a.dueDate) return -1;
        if (b.dueDate) return 1;
        return 0;
      });

      // Apply limit
      filteredTasks = filteredTasks.slice(0, limit);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                count: filteredTasks.length,
                minPriority,
                tasks: filteredTasks.map(t => ({
                  id: t.id,
                  title: t.title,
                  projectId: t.projectId,
                  projectName: t.projectName,
                  dueDate: t.dueDate,
                  priority: t.priority,
                  status: t.status,
                  content: t.content,
                  tags: t.tags,
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

// =============================================================================
// Main Entry Point
// =============================================================================

/**
 * Main entry point - starts the MCP server using stdio transport.
 * This allows the server to be spawned as a subprocess by MCP clients.
 */
async function main(): Promise<void> {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("TickTick MCP server running on stdio");
}

main().catch((error: unknown) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
