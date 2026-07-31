/**
 * @fileoverview Repository façade for tasks/reminders.
 * @module data/repositories/tasksRepository
 */
import * as tasksImpl from '../storage/tasksStorage';
export * from '../storage/tasksStorage';
export const tasksRepository = {
    getTasks: tasksImpl.getTasks,
    getTasksForDate: tasksImpl.getTasksForDate,
    addTaskForDate: tasksImpl.addTaskForDate,
    setTaskDoneForDate: tasksImpl.setTaskDoneForDate,
    setTaskReminderForDate: tasksImpl.setTaskReminderForDate,
    deleteTaskForDate: tasksImpl.deleteTaskForDate,
    clearCompletedTasksForDate: tasksImpl.clearCompletedTasksForDate,
    reorderOpenTasksForDate: tasksImpl.reorderOpenTasksForDate,
};
