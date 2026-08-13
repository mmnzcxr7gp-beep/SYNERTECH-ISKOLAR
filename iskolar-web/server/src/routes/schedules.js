const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  createSchedule,
  getSchedules,
  getScheduleById,
  updateSchedule,
  deleteSchedule,
  confirmAttendance,
} = require('../controllers/scheduleController');

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// CRUD
router.post('/', roleMiddleware(['provider', 'sponsor', 'admin']), createSchedule);
router.get('/', getSchedules);
router.get('/:id', getScheduleById);
router.put('/:id', roleMiddleware(['provider', 'sponsor', 'admin']), updateSchedule);
router.delete('/:id', roleMiddleware(['provider', 'sponsor', 'admin']), deleteSchedule);

// Student confirms attendance
router.post('/:id/confirm', confirmAttendance);

module.exports = router;
