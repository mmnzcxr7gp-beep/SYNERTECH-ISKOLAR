import 'package:flutter/material.dart';


/// Notification model
class AppNotification {
  final String id;
  final String title;
  final String message;
  final NotificationType type;
  final DateTime timestamp;
  final Map<String, dynamic>? data;
  bool read;

  AppNotification({
    required this.id,
    required this.title,
    required this.message,
    required this.type,
    required this.timestamp,
    this.data,
    this.read = false,
  });
}

enum NotificationType {
  verificationApproved,
  verificationRejected,
  verificationPending,
  transactionCompleted,
  transactionFailed,
  allowanceApproved,
  transactionReceived,
  adminAlert,
  other,
}

/// Notification service for real-time updates
class NotificationService extends ChangeNotifier {
  static final NotificationService _instance = NotificationService._internal();

  factory NotificationService() {
    return _instance;
  }

  NotificationService._internal();

  final List<AppNotification> _notifications = [];
  AppNotification? _lastNotification;

  List<AppNotification> get notifications => List.unmodifiable(_notifications);
  AppNotification? get lastNotification => _lastNotification;
  int get unreadCount => _notifications.where((n) => !n.read).length;

  /// Add a new notification
  void addNotification({
    required String title,
    required String message,
    required NotificationType type,
    Map<String, dynamic>? data,
  }) {
    final notification = AppNotification(
      id: DateTime.now().millisecondsSinceEpoch.toString(),
      title: title,
      message: message,
      type: type,
      timestamp: DateTime.now(),
      data: data,
    );

    _notifications.insert(0, notification);
    _lastNotification = notification;

    // Limit to last 50 notifications
    if (_notifications.length > 50) {
      _notifications.removeLast();
    }

    notifyListeners();
  }

  /// Mark notification as read
  void markAsRead(String notificationId) {
    final index = _notifications.indexWhere((n) => n.id == notificationId);
    if (index != -1) {
      _notifications[index].read = true;
      notifyListeners();
    }
  }

  /// Mark all as read
  void markAllAsRead() {
    for (var notification in _notifications) {
      notification.read = true;
    }
    notifyListeners();
  }

  /// Clear all notifications
  void clearAll() {
    _notifications.clear();
    _lastNotification = null;
    notifyListeners();
  }

  /// Clear read notifications
  void clearRead() {
    _notifications.removeWhere((n) => n.read);
    notifyListeners();
  }

  /// Get notifications by type
  List<AppNotification> getByType(NotificationType type) {
    return _notifications.where((n) => n.type == type).toList();
  }

  /// Get icon for notification type
  static IconData getIconForType(NotificationType type) {
    switch (type) {
      case NotificationType.verificationApproved:
        return Icons.check_circle_outline;
      case NotificationType.verificationRejected:
        return Icons.cancel_outlined;
      case NotificationType.verificationPending:
        return Icons.pending_actions;
      case NotificationType.transactionCompleted:
        return Icons.check_circle_outline;
      case NotificationType.transactionFailed:
        return Icons.error_outline;
      case NotificationType.allowanceApproved:
        return Icons.payments_outlined;
      case NotificationType.transactionReceived:
        return Icons.inbox_outlined;
      case NotificationType.adminAlert:
        return Icons.warning_outlined;
      default:
        return Icons.notifications_outlined;
    }
  }

  /// Get color for notification type
  static Color getColorForType(NotificationType type) {
    switch (type) {
      case NotificationType.verificationApproved:
      case NotificationType.transactionCompleted:
      case NotificationType.allowanceApproved:
        return const Color(0xFF4CAF50);
      case NotificationType.verificationRejected:
      case NotificationType.transactionFailed:
      case NotificationType.adminAlert:
        return const Color(0xFFF44336);
      case NotificationType.verificationPending:
      case NotificationType.transactionReceived:
        return const Color(0xFF2196F3);
      default:
        return const Color(0xFF9C27B0);
    }
  }
}

/// Handler for Socket.IO events
class SocketIONotificationHandler {
  static void handleVerificationStatusChanged(
    Map<String, dynamic> data,
    NotificationService notificationService,
  ) {
    final status = data['status'] as String?;
    final message = data['message'] as String? ?? 'Verification status updated';

    if (status == 'approved') {
      notificationService.addNotification(
        title: 'Verification Approved!',
        message:
            'Congratulations! Your account has been verified. You can now access all features.',
        type: NotificationType.verificationApproved,
        data: data,
      );
    } else if (status == 'rejected') {
      notificationService.addNotification(
        title: 'Verification Rejected',
        message: 'Your verification was rejected. Please review and resubmit.',
        type: NotificationType.verificationRejected,
        data: data,
      );
    } else if (status == 'pending') {
      notificationService.addNotification(
        title: 'Verification Pending',
        message: message,
        type: NotificationType.verificationPending,
        data: data,
      );
    }
  }

  static void handleTransactionStatusChanged(
    Map<String, dynamic> data,
    NotificationService notificationService,
  ) {
    final status = data['status'] as String?;
    final message = data['message'] as String? ?? 'Transaction status updated';

    if (status == 'completed') {
      notificationService.addNotification(
        title: 'Transaction Completed',
        message: message,
        type: NotificationType.transactionCompleted,
        data: data,
      );
    } else if (status == 'failed') {
      notificationService.addNotification(
        title: 'Transaction Failed',
        message: message,
        type: NotificationType.transactionFailed,
        data: data,
      );
    }
  }

  static void handleTransactionReceived(
    Map<String, dynamic> data,
    NotificationService notificationService,
  ) {
    final message = data['message'] as String?;

    notificationService.addNotification(
      title: 'Transaction Received',
      message: message ?? 'You have received a new transaction',
      type: NotificationType.transactionReceived,
      data: data,
    );
  }

  static void handleAllowanceApproved(
    Map<String, dynamic> data,
    NotificationService notificationService,
  ) {
    final message = data['message'] as String?;

    notificationService.addNotification(
      title: 'Allowance Approved',
      message: message ?? 'Your allowance has been approved and transferred',
      type: NotificationType.allowanceApproved,
      data: data,
    );
  }
}
