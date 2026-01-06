# ticktick-mcp

A Model Context Protocol (MCP) server for TickTick task management integration. This server allows AI assistants like Claude to interact with your TickTick account to manage tasks and projects.

## Features

- **OAuth 2.0 Authentication** - Secure authentication flow with token management
- **Project Management** - List, create, update, and delete projects
- **Task Management** - Full CRUD operations for tasks including:
  - Create tasks with titles, descriptions, priorities, and due dates
  - Set reminders and recurrence rules
  - Add subtasks/checklists
  - Batch create multiple tasks
  - Complete and delete tasks
- **User Information** - Retrieve authenticated user details

## Installation

```bash
npm install -g ticktick-mcp
```

Or use directly with npx:

```bash
npx ticktick-mcp
```

## Prerequisites

You'll need TickTick API credentials:

1. Go to [TickTick Developer Portal](https://developer.ticktick.com/)
2. Create a new application
3. Note your Client ID and Client Secret
4. Set the redirect URI to `http://localhost:8080/callback` (or your preferred callback URL)

## Configuration

Set the following environment variables:

```bash
export TICKTICK_CLIENT_ID="your-client-id"
export TICKTICK_CLIENT_SECRET="your-client-secret"
export TICKTICK_REDIRECT_URI="http://localhost:8080/callback"  # Optional, defaults to this
export TICKTICK_REGION="global"  # Optional: "global" or "cn" for China region
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ticktick": {
      "command": "npx",
      "args": ["ticktick-mcp"],
      "env": {
        "TICKTICK_CLIENT_ID": "your-client-id",
        "TICKTICK_CLIENT_SECRET": "your-client-secret"
      }
    }
  }
}
```

## Available Tools

### Authentication

- `auth_get_authorization_url` - Get OAuth authorization URL to start authentication
- `auth_exchange_code` - Exchange authorization code for tokens
- `auth_status` - Check current authentication status
- `auth_refresh_token` - Manually refresh access token
- `auth_logout` - Clear stored tokens

### User

- `get_user` - Get current authenticated user information

### Projects

- `list_projects` - List all projects
- `get_project` - Get project with all its tasks
- `get_project_by_id` - Get project metadata only
- `create_project` - Create a new project
- `update_project` - Update an existing project
- `delete_project` - Delete a project

### Tasks

- `list_tasks_in_project` - List all tasks in a project
- `get_task` - Get a specific task
- `create_task` - Create a new task
- `update_task` - Update an existing task
- `complete_task` - Mark a task as complete
- `delete_task` - Delete a task
- `batch_create_tasks` - Create multiple tasks at once
- `search_tasks` - Search for tasks by keyword across all projects
- `get_tasks_due_soon` - Get tasks that are due soon (within the next N days)
- `get_high_priority_tasks` - Get high priority tasks across all projects

## Authentication Flow

1. Use `auth_get_authorization_url` to get the OAuth URL
2. Open the URL in a browser and authorize the application
3. Copy the `code` parameter from the callback URL
4. Use `auth_exchange_code` with the code to complete authentication

Tokens are automatically refreshed when expired.

## License

MIT
