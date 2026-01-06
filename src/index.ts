#!/usr/bin/env node

/**
 * TickTick MCP Server
 *
 * A Model Context Protocol server for integrating with TickTick task management.
 * This server provides tools for OAuth authentication and task/project operations.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { TickTickOAuth, createOAuthFromEnv } from "./oauth.js";
import { TickTickClient } from "./sdk/client.js";
import type { Region } from "./sdk/types.js";

// Import all tool registration functions
import { registerAuthGetAuthorizationUrlTool } from "./tools/authGetAuthorizationUrl.js";
import { registerAuthExchangeCodeTool } from "./tools/authExchangeCode.js";
import { registerAuthStatusTool } from "./tools/authStatus.js";
import { registerAuthRefreshTokenTool } from "./tools/authRefreshToken.js";
import { registerAuthLogoutTool } from "./tools/authLogout.js";
import { registerGetUserTool } from "./tools/getUser.js";
import { registerListProjectsTool } from "./tools/listProjects.js";
import { registerGetProjectTool } from "./tools/getProject.js";
import { registerGetProjectByIdTool } from "./tools/getProjectById.js";
import { registerCreateProjectTool } from "./tools/createProject.js";
import { registerUpdateProjectTool } from "./tools/updateProject.js";
import { registerDeleteProjectTool } from "./tools/deleteProject.js";
import { registerListTasksInProjectTool } from "./tools/listTasksInProject.js";
import { registerCreateTaskTool } from "./tools/createTask.js";
import { registerUpdateTaskTool } from "./tools/updateTask.js";
import { registerCompleteTaskTool } from "./tools/completeTask.js";
import { registerDeleteTaskTool } from "./tools/deleteTask.js";
import { registerGetTaskTool } from "./tools/getTask.js";
import { registerBatchCreateTasksTool } from "./tools/batchCreateTasks.js";
import { registerGetTasksDueSoonTool } from "./tools/getTasksDueSoon.js";
import { registerSearchTasksTool } from "./tools/searchTasks.js";
import { registerGetHighPriorityTasksTool } from "./tools/getHighPriorityTasks.js";

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
// Register All Tools
// =============================================================================

// OAuth Authentication Tools
registerAuthGetAuthorizationUrlTool(server, getOAuthHelper);
registerAuthExchangeCodeTool(server, getOAuthHelper);
registerAuthStatusTool(server, getOAuthHelper);
registerAuthRefreshTokenTool(server, getOAuthHelper);
registerAuthLogoutTool(server, getOAuthHelper);

// User Tools
registerGetUserTool(server, getClient);

// Project Tools
registerListProjectsTool(server, getClient);
registerGetProjectTool(server, getClient);
registerGetProjectByIdTool(server, getClient);
registerCreateProjectTool(server, getClient);
registerUpdateProjectTool(server, getClient);
registerDeleteProjectTool(server, getClient);

// Task Tools
registerListTasksInProjectTool(server, getClient);
registerCreateTaskTool(server, getClient);
registerUpdateTaskTool(server, getClient);
registerCompleteTaskTool(server, getClient);
registerDeleteTaskTool(server, getClient);
registerGetTaskTool(server, getClient);
registerBatchCreateTasksTool(server, getClient);
registerGetTasksDueSoonTool(server, getClient);
registerSearchTasksTool(server, getClient);
registerGetHighPriorityTasksTool(server, getClient);

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
