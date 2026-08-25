import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;

import '../utils/app_constants.dart';
import 'notification_service.dart';

/// Socket.IO client service for real-time notifications
class SocketIOClientService {
  static final SocketIOClientService _instance = SocketIOClientService._internal();

  factory SocketIOClientService() {
    return _instance;
  }

  SocketIOClientService._internal();

  late IO.Socket _socket;
  bool _isConnected = false;
  String? _userId;

  bool get isConnected => _isConnected;
  IO.Socket get socket => _socket;

  /// Initialize Socket.IO connection
  Future<void> connect(String userId, {String role = 'user'}) async {
    if (_isConnected && _userId == userId) {
      return; // Already connected to the same user
    }

    _userId = userId;

    // P1 FIX: Socket.IO must connect to the server root, NOT the /api path.
    // Strip the /api suffix from the backend URL.
    String socketUrl = AppConstants.backendBaseUrl;
    if (socketUrl.endsWith('/api')) {
      socketUrl = socketUrl.substring(0, socketUrl.length - 4);
    } else if (socketUrl.endsWith('/api/')) {
      socketUrl = socketUrl.substring(0, socketUrl.length - 5);
    }

    // Create socket connection
    _socket = IO.io(
      socketUrl,
      IO.OptionBuilder()
          .setTransports(['websocket'])
          .build(),
    );

    // Connection event listeners
    _socket.on('connect', (_) {
      _isConnected = true;
      debugPrint('✓ Socket.IO connected');

      // Join appropriate room based on role
      final normalizedRole = role.toLowerCase();
      if (normalizedRole == 'provider' || normalizedRole == 'sponsor' || normalizedRole == 'admin') {
        _socket.emit('join-admin', userId);
      } else {
        _socket.emit('join-user', userId);
      }
    });

    _socket.on('disconnect', (_) {
      _isConnected = false;
      debugPrint('✗ Socket.IO disconnected');
    });

    _socket.on('connect_error', (error) {
      debugPrint('✗ Socket.IO connection error: $error');
    });

    // Listen for verification status changes
    _socket.on('verification-status-changed', (data) {
      debugPrint('📬 Received verification update: $data');
      final notificationService = NotificationService();
      SocketIONotificationHandler.handleVerificationStatusChanged(
        data,
        notificationService,
      );
    });

    // Listen for transaction status changes
    _socket.on('transaction-status-changed', (data) {
      debugPrint('📬 Received transaction update: $data');
      final notificationService = NotificationService();
      SocketIONotificationHandler.handleTransactionStatusChanged(
        data,
        notificationService,
      );
    });

    // Listen for transaction received
    _socket.on('transaction-received', (data) {
      debugPrint('📬 Received new transaction: $data');
      final notificationService = NotificationService();
      SocketIONotificationHandler.handleTransactionReceived(
        data,
        notificationService,
      );
    });

    // Listen for allowance approved
    _socket.on('allowance-approved', (data) {
      debugPrint('📬 Received allowance approved: $data');
      final notificationService = NotificationService();
      SocketIONotificationHandler.handleAllowanceApproved(
        data,
        notificationService,
      );
    });

    // Listen for transaction created (for providers)
    _socket.on('transaction-created', (data) {
      debugPrint('📬 Transaction created: $data');
      final notificationService = NotificationService();
      notificationService.addNotification(
        title: 'Transaction Created',
        message: data['message'] ?? 'Your transaction has been created successfully',
        type: NotificationType.transactionReceived,
        data: Map<String, dynamic>.from(data),
      );
    });

    // Listen for application status changes
    _socket.on('application-status-changed', (data) {
      debugPrint('📬 Received application status update: $data');
      final notificationService = NotificationService();
      notificationService.addNotification(
        title: 'Application Update',
        message: data['message'] ?? 'Your application status has changed.',
        type: NotificationType.other,
        data: Map<String, dynamic>.from(data),
      );
    });

    // Listen for schedule updates
    _socket.on('schedule-updated', (data) {
      debugPrint('📬 Received schedule update: $data');
      final notificationService = NotificationService();
      notificationService.addNotification(
        title: 'Schedule Updated',
        message: data['message'] ?? 'A schedule has been updated.',
        type: NotificationType.other,
        data: Map<String, dynamic>.from(data),
      );
    });

    // Listen for generic notification
    _socket.on('notification', (data) {
      debugPrint('📬 Received notification: $data');
      final notificationService = NotificationService();
      notificationService.addNotification(
        title: data['title'] ?? 'Notification',
        message: data['message'] ?? '',
        type: NotificationType.other,
        data: Map<String, dynamic>.from(data),
      );
    });

    // Generic alert listener
    _socket.on('new-alert', (data) {
      debugPrint('⚠️ New alert: $data');
      final notificationService = NotificationService();
      notificationService.addNotification(
        title: data['type'] ?? 'Alert',
        message: data['message'] ?? 'New notification',
        type: NotificationType.adminAlert,
        data: Map<String, dynamic>.from(data),
      );
    });

    // Wait for connection (best-effort, avoid using onConnect stream internals)
    await Future.delayed(const Duration(milliseconds: 500));

  }

  /// Disconnect Socket.IO
  Future<void> disconnect() async {
    if (_isConnected) {
      _socket.disconnect();
      _isConnected = false;
      _userId = null;
      debugPrint('✓ Socket.IO disconnected');
    }
  }

  /// Join admin room (for admins)
  void joinAdminRoom(String adminId) {
    if (_isConnected) {
      _socket.emit('join-admin', adminId);
      debugPrint('✓ Joined admin room: $adminId');
    }
  }

  /// Reconnect manually
  Future<void> reconnect() async {
    if (_userId != null) {
      await disconnect();
      await Future.delayed(const Duration(seconds: 1));
      await connect(_userId!);
    }
  }
}

