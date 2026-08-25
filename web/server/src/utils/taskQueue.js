/**
 * Task Queue — Background Job Processing
 * 
 * Simple in-process async queue with concurrency control.
 * Designed for future swap to Bull/BullMQ with Redis.
 * 
 * Handles:
 * - OCR processing (long-running Tesseract jobs)
 * - Email sending (with retry)
 * - Report generation
 * - Notification dispatch
 * 
 * Usage:
 *   const { enqueue, getStatus } = require('./taskQueue');
 *   const taskId = enqueue('ocr', async () => { ... }, { timeout: 30000 });
 *   const status = getStatus(taskId);
 */

const crypto = require('crypto');
const logger = require('./logger');

const MAX_CONCURRENCY = parseInt(process.env.TASK_QUEUE_CONCURRENCY || '3', 10);
const tasks = new Map();    // taskId → { status, result, error, startedAt, completedAt }
const queue = [];           // pending task functions
let running = 0;

/**
 * Process the next task in the queue.
 */
const processNext = async () => {
  if (running >= MAX_CONCURRENCY || queue.length === 0) return;

  const { taskId, fn, timeout, resolve } = queue.shift();
  running++;

  const taskEntry = tasks.get(taskId);
  if (taskEntry) {
    taskEntry.status = 'running';
    taskEntry.startedAt = Date.now();
  }

  try {
    let result;
    if (timeout > 0) {
      // Race the task against a timeout
      result = await Promise.race([
        fn(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error(`Task ${taskId} timed out after ${timeout}ms`)), timeout)
        ),
      ]);
    } else {
      result = await fn();
    }

    if (taskEntry) {
      taskEntry.status = 'completed';
      taskEntry.result = result;
      taskEntry.completedAt = Date.now();
    }
    resolve(result);
  } catch (err) {
    logger.error(`Task ${taskId} failed`, { error: err.message });
    if (taskEntry) {
      taskEntry.status = 'failed';
      taskEntry.error = err.message;
      taskEntry.completedAt = Date.now();
    }
    resolve(null); // Don't reject — let caller check status
  } finally {
    running--;
    // Process next in queue
    setImmediate(processNext);
  }
};

const taskQueue = {
  /**
   * Enqueue a background task.
   * @param {string} name — human-readable task name (e.g., 'ocr', 'email')
   * @param {function} fn — async function to execute
   * @param {object} [opts={}]
   * @param {number} [opts.timeout=0] — timeout in ms (0 = no timeout)
   * @returns {{ taskId: string, promise: Promise }}
   */
  enqueue(name, fn, opts = {}) {
    const taskId = `${name}_${crypto.randomUUID().slice(0, 8)}`;
    const timeout = opts.timeout || 0;

    tasks.set(taskId, {
      name,
      status: 'pending',
      result: null,
      error: null,
      createdAt: Date.now(),
      startedAt: null,
      completedAt: null,
    });

    // Cleanup old completed tasks (keep last 100)
    if (tasks.size > 200) {
      const entries = [...tasks.entries()]
        .filter(([, v]) => v.status === 'completed' || v.status === 'failed')
        .sort((a, b) => (a[1].completedAt || 0) - (b[1].completedAt || 0));
      const toRemove = entries.slice(0, entries.length - 100);
      for (const [key] of toRemove) {
        tasks.delete(key);
      }
    }

    const promise = new Promise((resolve) => {
      queue.push({ taskId, fn, timeout, resolve });
      setImmediate(processNext);
    });

    return { taskId, promise };
  },

  /**
   * Get the status of a task.
   * @param {string} taskId
   * @returns {object|null}
   */
  getStatus(taskId) {
    return tasks.get(taskId) || null;
  },

  /**
   * Get queue statistics.
   */
  stats() {
    return {
      pending: queue.length,
      running,
      maxConcurrency: MAX_CONCURRENCY,
      totalTracked: tasks.size,
    };
  },
};

module.exports = taskQueue;
