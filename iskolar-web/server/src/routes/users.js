const express = require('express');
const { authMiddleware } = require('../middleware/authMiddleware');
const { roleMiddleware } = require('../middleware/roleMiddleware');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  registerDeviceTokenController,
  removeDeviceTokenController,
} = require('../controllers/userController');

const router = express.Router();

router.get('/', authMiddleware, roleMiddleware(['admin']), getAllUsers);
router.post('/', authMiddleware, roleMiddleware(['admin']), createUser);
router.get('/:id', authMiddleware, roleMiddleware(['admin']), getUserById);
router.put('/:id', authMiddleware, roleMiddleware(['admin']), updateUser);
router.delete('/:id', authMiddleware, roleMiddleware(['admin']), deleteUser);

// Device token management (any authenticated user)
router.post('/device-token', authMiddleware, registerDeviceTokenController);
router.delete('/device-token', authMiddleware, removeDeviceTokenController);

module.exports = router;

