import { describe, it, expect } from 'vitest';
import {
  Priority,
  TaskStatus,
  ChecklistItemStatus,
  ViewMode,
  ProjectKind,
  REMINDER_AT_TIME,
  reminderMinutesBefore,
  reminderHoursBefore,
  reminderDaysBefore,
  repeatDaily,
  repeatWeekly,
  repeatMonthly,
  repeatYearly,
} from '../types.js';

describe('Priority Enum', () => {
  it('should have correct values', () => {
    expect(Priority.None).toBe(0);
    expect(Priority.Low).toBe(1);
    expect(Priority.Medium).toBe(3);
    expect(Priority.High).toBe(5);
  });
});

describe('TaskStatus Enum', () => {
  it('should have correct values', () => {
    expect(TaskStatus.Active).toBe(0);
    expect(TaskStatus.Completed).toBe(2);
  });
});

describe('ChecklistItemStatus Enum', () => {
  it('should have correct values', () => {
    expect(ChecklistItemStatus.Unchecked).toBe(0);
    expect(ChecklistItemStatus.Checked).toBe(1);
  });
});

describe('ViewMode Enum', () => {
  it('should have correct values', () => {
    expect(ViewMode.List).toBe('list');
    expect(ViewMode.Kanban).toBe('kanban');
    expect(ViewMode.Timeline).toBe('timeline');
  });
});

describe('ProjectKind Enum', () => {
  it('should have correct values', () => {
    expect(ProjectKind.Task).toBe('TASK');
    expect(ProjectKind.Note).toBe('NOTE');
  });
});

describe('Reminder Helpers', () => {
  describe('REMINDER_AT_TIME', () => {
    it('should be a reminder at exact time', () => {
      expect(REMINDER_AT_TIME).toBe('TRIGGER:PT0S');
    });
  });

  describe('reminderMinutesBefore', () => {
    it('should create reminder 15 minutes before', () => {
      expect(reminderMinutesBefore(15)).toBe('TRIGGER:-PT15M');
    });

    it('should create reminder 30 minutes before', () => {
      expect(reminderMinutesBefore(30)).toBe('TRIGGER:-PT30M');
    });

    it('should handle single minute', () => {
      expect(reminderMinutesBefore(1)).toBe('TRIGGER:-PT1M');
    });
  });

  describe('reminderHoursBefore', () => {
    it('should create reminder 1 hour before', () => {
      expect(reminderHoursBefore(1)).toBe('TRIGGER:-PT1H');
    });

    it('should create reminder 24 hours before', () => {
      expect(reminderHoursBefore(24)).toBe('TRIGGER:-PT24H');
    });

    it('should create reminder 2 hours before', () => {
      expect(reminderHoursBefore(2)).toBe('TRIGGER:-PT2H');
    });
  });

  describe('reminderDaysBefore', () => {
    it('should create reminder 1 day before', () => {
      expect(reminderDaysBefore(1)).toBe('TRIGGER:-P1D');
    });

    it('should create reminder 7 days before', () => {
      expect(reminderDaysBefore(7)).toBe('TRIGGER:-P7D');
    });

    it('should create reminder 14 days before', () => {
      expect(reminderDaysBefore(14)).toBe('TRIGGER:-P14D');
    });
  });
});

describe('Recurrence Helpers', () => {
  describe('repeatDaily', () => {
    it('should create daily recurrence with default interval', () => {
      expect(repeatDaily()).toBe('RRULE:FREQ=DAILY;INTERVAL=1');
    });

    it('should create daily recurrence with custom interval', () => {
      expect(repeatDaily(2)).toBe('RRULE:FREQ=DAILY;INTERVAL=2');
    });

    it('should create weekly recurrence when interval is 7', () => {
      expect(repeatDaily(7)).toBe('RRULE:FREQ=DAILY;INTERVAL=7');
    });
  });

  describe('repeatWeekly', () => {
    it('should create weekly recurrence with default interval', () => {
      expect(repeatWeekly()).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1');
    });

    it('should create weekly recurrence with custom interval', () => {
      expect(repeatWeekly(2)).toBe('RRULE:FREQ=WEEKLY;INTERVAL=2');
    });

    it('should create weekly recurrence with specific days', () => {
      expect(repeatWeekly(1, ['MO', 'WE', 'FR'])).toBe(
        'RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,WE,FR'
      );
    });

    it('should create bi-weekly weekend recurrence', () => {
      expect(repeatWeekly(2, ['SA', 'SU'])).toBe(
        'RRULE:FREQ=WEEKLY;INTERVAL=2;BYDAY=SA,SU'
      );
    });

    it('should handle single day', () => {
      expect(repeatWeekly(1, ['MO'])).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1;BYDAY=MO');
    });

    it('should handle empty days array', () => {
      expect(repeatWeekly(1, [])).toBe('RRULE:FREQ=WEEKLY;INTERVAL=1');
    });
  });

  describe('repeatMonthly', () => {
    it('should create monthly recurrence with default interval', () => {
      expect(repeatMonthly()).toBe('RRULE:FREQ=MONTHLY;INTERVAL=1');
    });

    it('should create monthly recurrence with custom interval', () => {
      expect(repeatMonthly(3)).toBe('RRULE:FREQ=MONTHLY;INTERVAL=3');
    });

    it('should create semi-annual recurrence', () => {
      expect(repeatMonthly(6)).toBe('RRULE:FREQ=MONTHLY;INTERVAL=6');
    });

    it('should create yearly recurrence when interval is 12', () => {
      expect(repeatMonthly(12)).toBe('RRULE:FREQ=MONTHLY;INTERVAL=12');
    });
  });

  describe('repeatYearly', () => {
    it('should create yearly recurrence with default interval', () => {
      expect(repeatYearly()).toBe('RRULE:FREQ=YEARLY;INTERVAL=1');
    });

    it('should create yearly recurrence with custom interval', () => {
      expect(repeatYearly(2)).toBe('RRULE:FREQ=YEARLY;INTERVAL=2');
    });

    it('should create bi-annual recurrence', () => {
      expect(repeatYearly(2)).toBe('RRULE:FREQ=YEARLY;INTERVAL=2');
    });
  });
});
