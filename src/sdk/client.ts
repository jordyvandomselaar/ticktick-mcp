/**
 * TickTick SDK Client
 *
 * Main client class for interacting with the TickTick Open API.
 * Provides typed methods for all documented API endpoints.
 */

import {
  createErrorFromResponse,
  TickTickNetworkError,
  TickTickTimeoutError,
} from "./errors.js";
import type {
  BatchCreateTasksInput,
  CreateProjectInput,
  CreateTaskInput,
  Project,
  ProjectWithTasks,
  Task,
  TickTickClientConfig,
  UpdateProjectInput,
  UpdateTaskInput,
  User,
} from "./types.js";

/**
 * Base URLs for different regions.
 */
const BASE_URLS = {
  global: "https://api.ticktick.com/open/v1",
  china: "https://api.dida365.com/open/v1",
} as const;

/**
 * Default timeout for API requests (30 seconds).
 */
const DEFAULT_TIMEOUT = 30000;

/**
 * TickTick API Client
 *
 * Provides methods for interacting with the TickTick Open API.
 *
 * @example
 * ```typescript
 * const client = new TickTickClient({
 *   accessToken: 'your-oauth-access-token',
 *   region: 'global', // or 'china' for dida365.com
 * });
 *
 * // Get user info
 * const user = await client.getUser();
 *
 * // List all projects
 * const projects = await client.listProjects();
 *
 * // Create a task
 * const task = await client.createTask({
 *   title: 'My new task',
 *   projectId: 'project-id',
 *   priority: Priority.High,
 * });
 * ```
 */
export class TickTickClient {
  private readonly accessToken: string;
  private readonly baseUrl: string;
  private readonly timeout: number;

  /**
   * Create a new TickTick API client.
   *
   * @param config - Client configuration options
   */
  constructor(config: TickTickClientConfig) {
    this.accessToken = config.accessToken;
    this.baseUrl =
      config.baseUrl ?? BASE_URLS[config.region ?? "global"];
    this.timeout = config.timeout ?? DEFAULT_TIMEOUT;
  }

  // ===========================================================================
  // Private Helper Methods
  // ===========================================================================

  /**
   * Make an HTTP request to the TickTick API.
   */
  private async request<T>(
    method: string,
    path: string,
    body?: unknown
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.accessToken}`,
      Accept: "application/json",
    };

    if (body !== undefined) {
      headers["Content-Type"] = "application/json";
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw await createErrorFromResponse(response);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse JSON response
      const text = await response.text();
      if (!text) {
        return undefined as T;
      }

      return JSON.parse(text) as T;
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle abort errors (timeout)
      if (error instanceof Error && error.name === "AbortError") {
        throw new TickTickTimeoutError(
          `Request timed out after ${this.timeout}ms`,
          this.timeout
        );
      }

      // Handle network errors
      if (
        error instanceof TypeError &&
        error.message.includes("fetch")
      ) {
        throw new TickTickNetworkError(
          `Network error: ${error.message}`,
          error
        );
      }

      // Re-throw TickTick errors as-is
      throw error;
    }
  }

  /**
   * Make a GET request.
   */
  private get<T>(path: string): Promise<T> {
    return this.request<T>("GET", path);
  }

  /**
   * Make a POST request.
   */
  private post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, body);
  }

  /**
   * Make a DELETE request.
   */
  private delete<T>(path: string): Promise<T> {
    return this.request<T>("DELETE", path);
  }

  // ===========================================================================
  // User Endpoints
  // ===========================================================================

  /**
   * Get the current authenticated user's information.
   *
   * @remarks
   * Note: This endpoint is not officially documented in the TickTick Open API
   * documentation but is functional and commonly used.
   *
   * @returns The user's profile information
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const user = await client.getUser();
   * console.log(`Logged in as: ${user.name} (${user.username})`);
   * ```
   */
  async getUser(): Promise<User> {
    return this.get<User>("/user");
  }

  // ===========================================================================
  // Project Endpoints
  // ===========================================================================

  /**
   * List all projects for the authenticated user.
   *
   * @returns Array of all projects
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const projects = await client.listProjects();
   * for (const project of projects) {
   *   console.log(`${project.name} (${project.id})`);
   * }
   * ```
   */
  async listProjects(): Promise<Project[]> {
    return this.get<Project[]>("/project");
  }

  /**
   * Get a specific project by ID.
   *
   * @param projectId - The unique identifier of the project
   * @returns The project details
   * @throws {TickTickNotFoundError} If the project doesn't exist
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const project = await client.getProject('project-id');
   * console.log(`Project: ${project.name}`);
   * ```
   */
  async getProject(projectId: string): Promise<Project> {
    return this.get<Project>(`/project/${encodeURIComponent(projectId)}`);
  }

  /**
   * Get a project with all its tasks.
   *
   * @param projectId - The unique identifier of the project
   * @returns The project and all its tasks
   * @throws {TickTickNotFoundError} If the project doesn't exist
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const { project, tasks } = await client.getProjectWithTasks('project-id');
   * console.log(`${project.name} has ${tasks.length} tasks`);
   * ```
   */
  async getProjectWithTasks(projectId: string): Promise<ProjectWithTasks> {
    return this.get<ProjectWithTasks>(
      `/project/${encodeURIComponent(projectId)}/data`
    );
  }

  /**
   * Create a new project.
   *
   * @param input - The project creation parameters
   * @returns The created project
   * @throws {TickTickBadRequestError} If the input is invalid
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const project = await client.createProject({
   *   name: 'My New Project',
   *   color: '#ff6b6b',
   *   viewMode: 'list',
   * });
   * console.log(`Created project: ${project.id}`);
   * ```
   */
  async createProject(input: CreateProjectInput): Promise<Project> {
    return this.post<Project>("/project", input);
  }

  /**
   * Update an existing project.
   *
   * @param projectId - The unique identifier of the project to update
   * @param input - The fields to update
   * @returns The updated project
   * @throws {TickTickNotFoundError} If the project doesn't exist
   * @throws {TickTickBadRequestError} If the input is invalid
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const project = await client.updateProject('project-id', {
   *   name: 'Updated Name',
   *   color: '#4dabf7',
   * });
   * ```
   */
  async updateProject(
    projectId: string,
    input: UpdateProjectInput
  ): Promise<Project> {
    return this.post<Project>(
      `/project/${encodeURIComponent(projectId)}`,
      input
    );
  }

  /**
   * Delete a project.
   *
   * @param projectId - The unique identifier of the project to delete
   * @throws {TickTickNotFoundError} If the project doesn't exist
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * await client.deleteProject('project-id');
   * console.log('Project deleted');
   * ```
   */
  async deleteProject(projectId: string): Promise<void> {
    await this.delete<void>(`/project/${encodeURIComponent(projectId)}`);
  }

  // ===========================================================================
  // Task Endpoints
  // ===========================================================================

  /**
   * Get a specific task by project ID and task ID.
   *
   * @param projectId - The project ID containing the task
   * @param taskId - The unique identifier of the task
   * @returns The task details
   * @throws {TickTickNotFoundError} If the task or project doesn't exist
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const task = await client.getTask('project-id', 'task-id');
   * console.log(`Task: ${task.title}`);
   * ```
   */
  async getTask(projectId: string, taskId: string): Promise<Task> {
    return this.get<Task>(
      `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
    );
  }

  /**
   * Create a new task.
   *
   * @param input - The task creation parameters
   * @returns The created task
   * @throws {TickTickBadRequestError} If the input is invalid
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const task = await client.createTask({
   *   title: 'Complete report',
   *   projectId: 'project-id',
   *   content: 'Finish the quarterly report',
   *   dueDate: '2024-01-15T17:00:00+0000',
   *   priority: Priority.High,
   *   items: [
   *     { title: 'Write introduction', status: ChecklistItemStatus.Unchecked },
   *     { title: 'Add charts', status: ChecklistItemStatus.Unchecked },
   *   ],
   * });
   * console.log(`Created task: ${task.id}`);
   * ```
   */
  async createTask(input: CreateTaskInput): Promise<Task> {
    return this.post<Task>("/task", input);
  }

  /**
   * Update an existing task.
   *
   * @param taskId - The unique identifier of the task to update
   * @param input - The fields to update
   * @returns The updated task
   * @throws {TickTickNotFoundError} If the task doesn't exist
   * @throws {TickTickBadRequestError} If the input is invalid
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const task = await client.updateTask('task-id', {
   *   title: 'Updated task title',
   *   priority: Priority.Medium,
   * });
   * ```
   */
  async updateTask(taskId: string, input: UpdateTaskInput): Promise<Task> {
    return this.post<Task>(`/task/${encodeURIComponent(taskId)}`, {
      id: taskId,
      ...input,
    });
  }

  /**
   * Mark a task as complete.
   *
   * @param projectId - The project ID containing the task
   * @param taskId - The unique identifier of the task to complete
   * @throws {TickTickNotFoundError} If the task or project doesn't exist
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * await client.completeTask('project-id', 'task-id');
   * console.log('Task completed!');
   * ```
   */
  async completeTask(projectId: string, taskId: string): Promise<void> {
    await this.post<void>(
      `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}/complete`
    );
  }

  /**
   * Delete a task.
   *
   * @param projectId - The project ID containing the task
   * @param taskId - The unique identifier of the task to delete
   * @throws {TickTickNotFoundError} If the task or project doesn't exist
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * await client.deleteTask('project-id', 'task-id');
   * console.log('Task deleted');
   * ```
   */
  async deleteTask(projectId: string, taskId: string): Promise<void> {
    await this.delete<void>(
      `/project/${encodeURIComponent(projectId)}/task/${encodeURIComponent(taskId)}`
    );
  }

  /**
   * Create multiple tasks at once.
   *
   * @remarks
   * Note: This endpoint is not officially documented in the TickTick Open API
   * documentation but is functional and commonly used for bulk operations.
   *
   * @param tasks - Array of tasks to create
   * @returns Array of created tasks
   * @throws {TickTickBadRequestError} If the input is invalid
   * @throws {TickTickAuthError} If the access token is invalid or expired
   *
   * @example
   * ```typescript
   * const tasks = await client.batchCreateTasks([
   *   { title: 'Task 1', projectId: 'project-id', priority: Priority.Low },
   *   { title: 'Task 2', projectId: 'project-id', priority: Priority.Medium },
   *   { title: 'Task 3', projectId: 'project-id', priority: Priority.High },
   * ]);
   * console.log(`Created ${tasks.length} tasks`);
   * ```
   */
  async batchCreateTasks(tasks: CreateTaskInput[]): Promise<Task[]> {
    const input: BatchCreateTasksInput = { add: tasks };
    return this.post<Task[]>("/batch/task", input);
  }
}
