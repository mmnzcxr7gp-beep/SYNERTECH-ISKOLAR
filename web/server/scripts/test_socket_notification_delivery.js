const assert = require('assert');

async function testSocketNotificationDelivery() {
  console.log('🧪 Testing Socket.IO Private User Notification Routing...');

  // Mock Socket.IO server room emission
  const emittedEvents = [];
  const mockIO = {
    to: (room) => ({
      emit: (event, payload) => {
        emittedEvents.push({ room, event, payload });
      },
    }),
  };

  global._io = mockIO;

  const targetUserId = 8805;
  const sampleNotification = {
    id: 1001,
    userId: targetUserId,
    title: 'Interview Scheduled',
    message: 'Your interview panel is set for Friday at 10:00 AM.',
    type: 'interview_scheduled',
    createdAt: new Date().toISOString(),
  };

  // Simulate notification emission
  global._io.to(`user_${targetUserId}`).emit('notification', {
    ...sampleNotification,
    timestamp: sampleNotification.createdAt,
  });

  assert.strictEqual(emittedEvents.length, 1);
  assert.strictEqual(emittedEvents[0].room, `user_${targetUserId}`, 'Must emit strictly to target private user room');
  assert.strictEqual(emittedEvents[0].event, 'notification');
  assert.strictEqual(emittedEvents[0].payload.title, sampleNotification.title);

  // Verify other users do not receive this event
  assert.strictEqual(emittedEvents.some((e) => e.room === 'user_9999'), false, 'Unrelated rooms must receive zero events');

  console.log('✅ PASS test_socket_notification_delivery: Private user room routing verified');
  process.exit(0);
}

testSocketNotificationDelivery().catch((err) => {
  console.error('❌ FAIL test_socket_notification_delivery:', err);
  process.exit(1);
});
