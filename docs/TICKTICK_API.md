# TickTick API Documentation

This document provides comprehensive documentation for the TickTick Open API, compiled from official and community sources. It will serve as the foundation for building the MCP server implementation.

## Table of Contents

- [Overview](#overview)
- [Authentication](#authentication)
  - [OAuth 2.0 Flow](#oauth-20-flow)
  - [Registering an Application](#registering-an-application)
  - [Scopes](#scopes)
- [API Base URLs](#api-base-urls)
- [Endpoints](#endpoints)
  - [User](#user)
  - [Projects](#projects)
  - [Tasks](#tasks)
- [Data Models](#data-models)
  - [Task](#task)
  - [Project](#project)
  - [Subtask (Checklist Item)](#subtask-checklist-item)
- [Error Handling](#error-handling)
- [Rate Limits](#rate-limits)
- [Regional Considerations](#regional-considerations)

---

## Overview

The TickTick Open API is a RESTful API that allows third-party applications to manage tasks and projects on behalf of TickTick users. The API uses OAuth 2.0 for authentication and returns JSON responses.

**Key Characteristics:**
- RESTful design
- JSON request/response format
- OAuth 2.0 authentication
- Limited to tasks and projects (no habits, pomodoro, or advanced features in v1)

**Official Documentation:** https://developer.ticktick.com/docs#/openapi
**Developer Portal:** https://developer.ticktick.com/

---

## Authentication

### OAuth 2.0 Flow

TickTick uses the OAuth 2.0 Authorization Code Grant flow:

```
┌─────────────────────────────────────────────────────────────────────┐
│ 1. User clicks "Connect to TickTick" in your app                    │
│                                    ↓                                │
│ 2. Redirect to TickTick authorization URL                           │
│                                    ↓                                │
│ 3. User logs in and grants permission                               │
│                                    ↓                                │
│ 4. TickTick redirects back with authorization code                  │
│                                    ↓                                │
│ 5. Exchange code for access token                                   │
│                                    ↓                                │
│ 6. Use access token to make API requests                            │
└─────────────────────────────────────────────────────────────────────┘
```

#### Step 1: Authorization Request

Redirect the user to the authorization endpoint:

```
GET https://ticktick.com/oauth/authorize
```

**Query Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Your application's client ID |
| `redirect_uri` | Yes | URL to redirect after authorization |
| `response_type` | Yes | Must be `code` |
| `scope` | Yes | Space-separated list of scopes (e.g., `tasks:read tasks:write`) |
| `state` | Recommended | Random string for CSRF protection |

**Example:**

```
https://ticktick.com/oauth/authorize?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8000/callback&response_type=code&scope=tasks:read%20tasks:write&state=random_state_string
```

#### Step 2: Token Exchange

After the user authorizes, TickTick redirects to your `redirect_uri` with an authorization `code`. Exchange this code for tokens:

```
POST https://ticktick.com/oauth/token
```

**Headers:**

```
Content-Type: application/x-www-form-urlencoded
```

**Body Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Your application's client ID |
| `client_secret` | Yes | Your application's client secret |
| `code` | Yes | The authorization code from the redirect |
| `grant_type` | Yes | Must be `authorization_code` |
| `redirect_uri` | Yes | Same redirect URI used in authorization request |

**Example Request:**

```bash
curl -X POST https://ticktick.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "code=AUTHORIZATION_CODE" \
  -d "grant_type=authorization_code" \
  -d "redirect_uri=http://localhost:8000/callback"
```

**Response:**

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600,
  "refresh_token": "dGhpcyBpcyBhIHJlZnJlc2ggdG9rZW4..."
}
```

#### Step 3: Refreshing Tokens

When the access token expires, use the refresh token to obtain a new one:

```
POST https://ticktick.com/oauth/token
```

**Body Parameters:**

| Parameter | Required | Description |
|-----------|----------|-------------|
| `client_id` | Yes | Your application's client ID |
| `client_secret` | Yes | Your application's client secret |
| `refresh_token` | Yes | The refresh token |
| `grant_type` | Yes | Must be `refresh_token` |

**Example Request:**

```bash
curl -X POST https://ticktick.com/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "refresh_token=YOUR_REFRESH_TOKEN" \
  -d "grant_type=refresh_token"
```

#### Step 4: Using the Access Token

Include the access token in the `Authorization` header for all API requests:

```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

### Registering an Application

1. Navigate to the [TickTick Developer Portal](https://developer.ticktick.com/)
2. Sign in with your TickTick credentials
3. Click "Manage Apps" in the top right corner
4. Click the "+App Name" button to create a new app
5. Enter the application name (required)
6. Set your OAuth redirect URI (e.g., `http://localhost:8000/callback`)
7. Save to generate your Client ID and Client Secret

**Important:** Store your Client Secret securely and never expose it in client-side code.

### Scopes

TickTick currently supports two OAuth scopes:

| Scope | Description |
|-------|-------------|
| `tasks:read` | Read access to tasks, projects, and related data |
| `tasks:write` | Full access to create, update, and delete tasks and projects |

**Note:** Both scopes are typically requested together for full functionality.

---

## API Base URLs

| Region | Base URL |
|--------|----------|
| Global (TickTick) | `https://api.ticktick.com/open/v1` |
| China (Dida365) | `https://api.dida365.com/open/v1` |

**OAuth URLs for China (Dida365):**
- Authorization: `https://dida365.com/oauth/authorize`
- Token: `https://dida365.com/oauth/token`

---

## Endpoints

### User

#### Get Current User

Retrieve information about the authenticated user.

```
GET /user
```

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**

```json
{
  "id": "user_id",
  "username": "user@example.com",
  "name": "User Name"
}
```

---

### Projects

#### List All Projects

Retrieve all projects for the authenticated user.

```
GET /project
```

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
```

**Response:**

```json
[
  {
    "id": "project_id_1",
    "name": "Work",
    "color": "#ff6b6b",
    "sortOrder": 0,
    "closed": false,
    "groupId": null,
    "viewMode": "list",
    "kind": "TASK"
  },
  {
    "id": "project_id_2",
    "name": "Personal",
    "color": "#4dabf7",
    "sortOrder": 1,
    "closed": false,
    "groupId": null,
    "viewMode": "list",
    "kind": "TASK"
  }
]
```

#### Get Project by ID

Retrieve a specific project by its ID.

```
GET /project/{projectId}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The unique identifier of the project |

**Response:**

```json
{
  "id": "project_id",
  "name": "Work",
  "color": "#ff6b6b",
  "sortOrder": 0,
  "closed": false,
  "groupId": null,
  "viewMode": "list",
  "kind": "TASK"
}
```

#### Get Project with All Tasks

Retrieve a project along with all its tasks.

```
GET /project/{projectId}/data
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The unique identifier of the project |

**Response:**

```json
{
  "project": {
    "id": "project_id",
    "name": "Work",
    "color": "#ff6b6b",
    "sortOrder": 0,
    "closed": false,
    "groupId": null,
    "viewMode": "list",
    "kind": "TASK"
  },
  "tasks": [
    {
      "id": "task_id_1",
      "projectId": "project_id",
      "title": "Complete report",
      "content": "Finish the quarterly report",
      "status": 0,
      "priority": 3
    }
  ]
}
```

#### Create Project

Create a new project.

```
POST /project
```

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "name": "New Project",
  "color": "#ff6b6b",
  "viewMode": "list",
  "kind": "TASK"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `name` | string | Yes | Project name |
| `color` | string | No | Hex color code (e.g., "#ff6b6b") |
| `viewMode` | string | No | View mode: "list", "kanban", or "timeline" |
| `kind` | string | No | Project type: "TASK" or "NOTE" |

**Response:**

```json
{
  "id": "new_project_id",
  "name": "New Project",
  "color": "#ff6b6b",
  "sortOrder": 2,
  "closed": false,
  "groupId": null,
  "viewMode": "list",
  "kind": "TASK"
}
```

#### Update Project

Update an existing project.

```
POST /project/{projectId}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The unique identifier of the project |

**Request Body:**

```json
{
  "name": "Updated Project Name",
  "color": "#4dabf7"
}
```

#### Delete Project

Delete a project.

```
DELETE /project/{projectId}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The unique identifier of the project |

**Response:** `204 No Content`

---

### Tasks

#### Get Task

Retrieve a specific task.

```
GET /project/{projectId}/task/{taskId}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The project ID containing the task |
| `taskId` | string | The unique identifier of the task |

**Response:**

```json
{
  "id": "task_id",
  "projectId": "project_id",
  "title": "Complete report",
  "content": "Finish the quarterly report",
  "desc": "",
  "allDay": false,
  "startDate": "2024-01-15T09:00:00+0000",
  "dueDate": "2024-01-15T17:00:00+0000",
  "timeZone": "America/New_York",
  "reminders": ["TRIGGER:P0DT9H0M0S"],
  "repeat": "",
  "priority": 3,
  "status": 0,
  "completedTime": null,
  "sortOrder": -1234567890,
  "items": [],
  "modifiedTime": "2024-01-14T12:00:00.000+0000",
  "etag": "abc123",
  "deleted": 0,
  "createdTime": "2024-01-14T10:00:00.000+0000",
  "creator": 123456789,
  "tags": ["work", "urgent"],
  "kind": "TEXT"
}
```

#### Create Task

Create a new task.

```
POST /task
```

**Headers:**
```
Authorization: Bearer YOUR_ACCESS_TOKEN
Content-Type: application/json
```

**Request Body:**

```json
{
  "title": "New Task",
  "projectId": "project_id",
  "content": "Task description",
  "allDay": false,
  "startDate": "2024-01-15T09:00:00+0000",
  "dueDate": "2024-01-15T17:00:00+0000",
  "timeZone": "America/New_York",
  "reminders": ["TRIGGER:P0DT9H0M0S"],
  "repeat": "RRULE:FREQ=DAILY;INTERVAL=1",
  "priority": 3,
  "items": [
    {
      "title": "Subtask 1",
      "status": 0
    }
  ]
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `title` | string | Yes | Task title |
| `projectId` | string | No | Project ID (defaults to inbox if not specified) |
| `content` | string | No | Task description/notes |
| `allDay` | boolean | No | Whether this is an all-day task |
| `startDate` | string | No | Start date in ISO 8601 format (`yyyy-MM-dd'T'HH:mm:ssZ`) |
| `dueDate` | string | No | Due date in ISO 8601 format |
| `timeZone` | string | No | IANA timezone (e.g., "America/New_York") |
| `reminders` | array | No | Array of reminder strings in iCalendar format |
| `repeat` | string | No | Recurrence rule in RRULE format |
| `priority` | integer | No | Priority: 0=None, 1=Low, 3=Medium, 5=High |
| `items` | array | No | Array of subtask/checklist items |

**Response:** Returns the created task object.

#### Update Task

Update an existing task.

```
POST /task/{taskId}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `taskId` | string | The unique identifier of the task |

**Request Body:**

Include only the fields you want to update:

```json
{
  "title": "Updated Task Title",
  "priority": 5,
  "dueDate": "2024-01-20T17:00:00+0000"
}
```

**Note:** If updating a task's project association, include `projectId` in the body.

**Response:** Returns the updated task object.

#### Complete Task

Mark a task as complete.

```
POST /project/{projectId}/task/{taskId}/complete
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The project ID containing the task |
| `taskId` | string | The unique identifier of the task |

**Response:** `200 OK`

#### Delete Task

Delete a task.

```
DELETE /project/{projectId}/task/{taskId}
```

**Path Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `projectId` | string | The project ID containing the task |
| `taskId` | string | The unique identifier of the task |

**Response:** `204 No Content`

#### Batch Create Tasks

Create multiple tasks at once.

```
POST /batch/task
```

**Request Body:**

```json
{
  "add": [
    {
      "title": "Task 1",
      "projectId": "project_id",
      "priority": 1
    },
    {
      "title": "Task 2",
      "projectId": "project_id",
      "priority": 3
    }
  ]
}
```

**Response:** Returns array of created task objects.

---

## Data Models

### Task

The complete Task object structure:

```typescript
interface Task {
  // Identifiers
  id: string;                    // Unique task identifier
  projectId: string;             // ID of the parent project

  // Content
  title: string;                 // Task title
  content: string;               // Task description/notes
  desc: string;                  // Additional description

  // Timing
  allDay: boolean;               // Whether this is an all-day task
  startDate: string | null;      // Start date (ISO 8601)
  dueDate: string | null;        // Due date (ISO 8601)
  timeZone: string;              // IANA timezone
  isFloating: boolean;           // Whether the date is timezone-independent

  // Reminders & Recurrence
  reminders: string[];           // Array of reminders (iCalendar format)
  repeat: string;                // Recurrence rule (RRULE format)

  // Status & Priority
  priority: number;              // 0=None, 1=Low, 3=Medium, 5=High
  status: number;                // 0=Normal, 1=Completed
  completedTime: string | null;  // When task was completed

  // Organization
  sortOrder: number;             // Position in list
  tags: string[];                // Array of tag names

  // Subtasks
  items: ChecklistItem[];        // Array of subtasks/checklist items

  // Metadata
  modifiedTime: string;          // Last modification timestamp
  createdTime: string;           // Creation timestamp
  etag: string;                  // Version identifier for sync
  deleted: number;               // Deletion flag (0=not deleted)
  creator: number;               // User ID of creator
  kind: string;                  // Task type (e.g., "TEXT")
}
```

### Project

The Project object structure:

```typescript
interface Project {
  id: string;                    // Unique project identifier
  name: string;                  // Project name
  color: string;                 // Hex color code
  sortOrder: number;             // Position in project list
  closed: boolean;               // Whether project is archived
  groupId: string | null;        // Parent folder ID
  viewMode: string;              // "list", "kanban", or "timeline"
  kind: string;                  // "TASK" or "NOTE"
}
```

### Subtask (Checklist Item)

Subtasks within a task:

```typescript
interface ChecklistItem {
  id: string;                    // Unique item identifier
  title: string;                 // Item text
  status: number;                // 0=Unchecked, 1=Checked
  completedTime: string | null;  // When item was completed
  isAllDay: boolean;             // Whether this has an all-day date
  startDate: string | null;      // Start date
  timeZone: string;              // Timezone
  sortOrder: number;             // Position in checklist
}
```

### Priority Values

| Value | Meaning |
|-------|---------|
| 0 | None |
| 1 | Low |
| 3 | Medium |
| 5 | High |

### Status Values

| Value | Meaning |
|-------|---------|
| 0 | Normal (incomplete) |
| 1 | Completed |

### Date/Time Formats

All dates use ISO 8601 format: `yyyy-MM-dd'T'HH:mm:ssZ`

**Examples:**
- `2024-01-15T09:00:00+0000`
- `2024-01-15T17:00:00-0500`

### Reminder Format

Reminders use iCalendar TRIGGER format:
- `TRIGGER:P0DT9H0M0S` - Reminder at 9:00 AM on due date
- `TRIGGER:-PT15M` - 15 minutes before
- `TRIGGER:-PT1H` - 1 hour before
- `TRIGGER:-P1D` - 1 day before

### Repeat/Recurrence Format

Recurrence rules use iCalendar RRULE format:
- `RRULE:FREQ=DAILY;INTERVAL=1` - Every day
- `RRULE:FREQ=WEEKLY;INTERVAL=1` - Every week
- `RRULE:FREQ=MONTHLY;INTERVAL=1` - Every month
- `RRULE:FREQ=WEEKLY;BYDAY=MO,WE,FR` - Every Monday, Wednesday, Friday

---

## Error Handling

The API returns standard HTTP status codes:

| Status Code | Description |
|-------------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content (successful deletion) |
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Invalid or expired token |
| 403 | Forbidden - Insufficient permissions |
| 404 | Not Found - Resource doesn't exist |
| 429 | Too Many Requests - Rate limited |
| 500 | Internal Server Error |

Error responses typically include a message:

```json
{
  "error": "invalid_token",
  "error_description": "The access token is invalid or expired"
}
```

---

## Rate Limits

The TickTick API has rate limits to prevent abuse. While specific limits are not publicly documented, best practices include:

- Implement exponential backoff when receiving 429 responses
- Cache responses where appropriate
- Batch operations when possible (use `/batch/task` for multiple tasks)
- Avoid polling frequently - use reasonable intervals (e.g., every 5 minutes)

---

## Regional Considerations

TickTick operates under different brands in different regions:

| Region | Brand | API Base URL | OAuth URLs |
|--------|-------|--------------|------------|
| Global | TickTick | `api.ticktick.com` | `ticktick.com/oauth/*` |
| China | Dida365 | `api.dida365.com` | `dida365.com/oauth/*` |

When building an MCP server, consider supporting both regions through configuration.

---

## Sources

This documentation was compiled from the following sources:

- [TickTick Developer Portal](https://developer.ticktick.com/)
- [Arcade TickTick Auth Provider Documentation](https://docs.arcade.dev/en/home/auth-providers/ticktick)
- [ticktick-py Python Library](https://github.com/lazeroffmichael/ticktick-py)
- [ticktick-mcp MCP Server Implementation](https://github.com/jacepark12/ticktick-mcp)
- [Rollout TickTick Integration Guide](https://rollout.com/integration-guides/tick-tick/)
- [Pipedream TickTick Integration](https://pipedream.com/apps/ticktick)
- [ticktickapi Go Library](https://github.com/nulluna/ticktickapi)
