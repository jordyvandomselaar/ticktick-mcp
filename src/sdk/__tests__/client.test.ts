import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TickTickClient } from '../client.js';
import { Priority, TaskStatus } from '../types.js';
import { TickTickAuthError, TickTickNotFoundError } from '../errors.js';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('TickTickClient', () => {
  let client: TickTickClient;

  beforeEach(() => {
    vi.clearAllMocks();
    client = new TickTickClient({
      accessToken: 'test-token',
      region: 'global',
    });
  });

  describe('Constructor', () => {
    it('should create client with global region', () => {
      const globalClient = new TickTickClient({
        accessToken: 'test-token',
        region: 'global',
      });
      expect(globalClient).toBeInstanceOf(TickTickClient);
    });

    it('should create client with china region', () => {
      const chinaClient = new TickTickClient({
        accessToken: 'test-token',
        region: 'china',
      });
      expect(chinaClient).toBeInstanceOf(TickTickClient);
    });

    it('should create client with custom base URL', () => {
      const customClient = new TickTickClient({
        accessToken: 'test-token',
        baseUrl: 'https://custom.api.com/v1',
      });
      expect(customClient).toBeInstanceOf(TickTickClient);
    });
  });

  describe('getUser', () => {
    it('should fetch user data', async () => {
      const mockUser = {
        id: '123',
        username: 'test@example.com',
        name: 'Test User',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockUser), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const user = await client.getUser();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/user',
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            Authorization: 'Bearer test-token',
          }),
        })
      );
      expect(user).toEqual(mockUser);
    });

    it('should throw auth error on 401', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'unauthorized' }), {
          status: 401,
        })
      );

      await expect(client.getUser()).rejects.toThrow(TickTickAuthError);
    });
  });

  describe('listProjects', () => {
    it('should fetch all projects', async () => {
      const mockProjects = [
        {
          id: 'proj1',
          name: 'Project 1',
          color: '#ff0000',
          sortOrder: 0,
          closed: false,
          groupId: null,
          viewMode: 'list',
          kind: 'TASK',
        },
      ];

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockProjects), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const projects = await client.listProjects();

      expect(projects).toEqual(mockProjects);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/project',
        expect.any(Object)
      );
    });
  });

  describe('getProject', () => {
    it('should fetch specific project', async () => {
      const mockProject = {
        id: 'proj1',
        name: 'Test Project',
        color: '#ff0000',
        sortOrder: 0,
        closed: false,
        groupId: null,
        viewMode: 'list',
        kind: 'TASK',
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockProject), {
          status: 200,
        })
      );

      const project = await client.getProject('proj1');

      expect(project).toEqual(mockProject);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/project/proj1',
        expect.any(Object)
      );
    });

    it('should throw not found error on 404', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'not_found' }), {
          status: 404,
        })
      );

      await expect(client.getProject('invalid')).rejects.toThrow(TickTickNotFoundError);
    });
  });

  describe('createTask', () => {
    it('should create a task with minimal data', async () => {
      const taskInput = {
        title: 'Test Task',
        projectId: 'proj1',
      };

      const mockTask = {
        id: 'task1',
        title: 'Test Task',
        projectId: 'proj1',
        content: '',
        desc: '',
        isAllDay: false,
        startDate: null,
        dueDate: null,
        timeZone: 'UTC',
        isFloating: false,
        reminders: [],
        repeatFlag: '',
        priority: Priority.None,
        status: TaskStatus.Active,
        completedTime: null,
        sortOrder: 0,
        tags: [],
        items: [],
        modifiedTime: '2024-01-01T00:00:00Z',
        createdTime: '2024-01-01T00:00:00Z',
        etag: 'abc123',
        deleted: 0,
        creator: 123,
        kind: 'TEXT' as const,
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify(mockTask), {
          status: 200,
        })
      );

      const task = await client.createTask(taskInput);

      expect(task).toEqual(mockTask);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(taskInput),
        })
      );
    });

    it('should create a task with all options', async () => {
      const taskInput = {
        title: 'Complex Task',
        projectId: 'proj1',
        content: 'Task description',
        priority: Priority.High,
        dueDate: '2024-01-15T17:00:00+0000',
        reminders: ['TRIGGER:-PT15M'],
        items: [{ title: 'Subtask 1', status: 0 }],
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: 'task2', ...taskInput }), {
          status: 200,
        })
      );

      const task = await client.createTask(taskInput);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(taskInput),
        })
      );
      expect(task.id).toBe('task2');
    });
  });

  describe('updateTask', () => {
    it('should update task fields', async () => {
      const taskId = 'task1';
      const updateData = {
        title: 'Updated Title',
        priority: Priority.Medium,
      };

      mockFetch.mockResolvedValueOnce(
        new Response(JSON.stringify({ id: taskId, ...updateData }), {
          status: 200,
        })
      );

      const task = await client.updateTask(taskId, updateData);

      expect(mockFetch).toHaveBeenCalledWith(
        `https://api.ticktick.com/open/v1/task/${taskId}`,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ id: taskId, ...updateData }),
        })
      );
      expect(task.id).toBe(taskId);
    });
  });

  describe('completeTask', () => {
    it('should mark task as complete', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 204,
        })
      );

      await client.completeTask('proj1', 'task1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/project/proj1/task/task1/complete',
        expect.objectContaining({
          method: 'POST',
        })
      );
    });
  });

  describe('deleteTask', () => {
    it('should delete a task', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 204,
        })
      );

      await client.deleteTask('proj1', 'task1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/project/proj1/task/task1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('deleteProject', () => {
    it('should delete a project', async () => {
      mockFetch.mockResolvedValueOnce(
        new Response(null, {
          status: 204,
        })
      );

      await client.deleteProject('proj1');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/project/proj1',
        expect.objectContaining({
          method: 'DELETE',
        })
      );
    });
  });

  describe('batchCreateTasks', () => {
    it('should create multiple tasks at once', async () => {
      const tasks = [
        { title: 'Task 1', projectId: 'proj1' },
        { title: 'Task 2', projectId: 'proj1' },
      ];

      mockFetch.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: 'task1', ...tasks[0] },
            { id: 'task2', ...tasks[1] },
          ]),
          {
            status: 200,
          }
        )
      );

      const result = await client.batchCreateTasks(tasks);

      expect(result).toHaveLength(2);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://api.ticktick.com/open/v1/batch/task',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ add: tasks }),
        })
      );
    });
  });
});
