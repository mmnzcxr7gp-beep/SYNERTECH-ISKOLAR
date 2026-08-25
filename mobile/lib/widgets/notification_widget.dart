import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import '../services/notification_service.dart';

/// Notification display widget - shows individual notification
class NotificationTile extends StatefulWidget {
  final AppNotification notification;
  final VoidCallback? onDismiss;
  final VoidCallback? onTap;

  const NotificationTile({
    super.key,
    required this.notification,
    this.onDismiss,
    this.onTap,
  });

  @override
  State<NotificationTile> createState() => _NotificationTileState();
}

class _NotificationTileState extends State<NotificationTile>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      duration: const Duration(milliseconds: 300),
      vsync: this,
    );
    _animation = Tween<double>(begin: 1, end: 0).animate(_controller);

    // Auto-dismiss after 5 seconds
    Future.delayed(const Duration(seconds: 5), () {
      if (mounted) {
        _controller.forward();
        Future.delayed(const Duration(milliseconds: 300), () {
          if (mounted && widget.onDismiss != null) {
            widget.onDismiss!();
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final color = NotificationService.getColorForType(widget.notification.type);
    final icon = NotificationService.getIconForType(widget.notification.type);

    return ScaleTransition(
      scale: _animation,
      child: Container(
        margin: const EdgeInsets.only(bottom: 8),
        decoration: BoxDecoration(
          color: color.withValues(alpha: 0.1),
          border: Border.all(color: color, width: 1),
          borderRadius: BorderRadius.circular(8),
        ),
        child: ListTile(
          leading: Icon(icon, color: color),
          title: Text(
            widget.notification.title,
            style: TextStyle(fontWeight: FontWeight.bold, color: color),
          ),
          subtitle: Text(
            widget.notification.message,
            maxLines: 2,
            overflow: TextOverflow.ellipsis,
          ),
          trailing: IconButton(
            icon: const Icon(Icons.close),
            onPressed: widget.onDismiss,
          ),
          onTap: widget.onTap,
        ),
      ),
    );
  }
}

/// Notification list widget - displays all notifications
class NotificationListWidget extends StatelessWidget {
  final int maxDisplay;

  const NotificationListWidget({super.key, this.maxDisplay = 3});

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationService>(
      builder: (context, notificationService, _) {
        final notifications = notificationService.notifications
            .take(maxDisplay)
            .toList();

        if (notifications.isEmpty) {
          return const SizedBox.shrink();
        }

        return Column(
          children: notifications
              .map(
                (notification) => NotificationTile(
                  notification: notification,
                  onDismiss: () {
                    notificationService.markAsRead(notification.id);
                  },
                  onTap: () {
                    notificationService.markAsRead(notification.id);
                  },
                ),
              )
              .toList(),
        );
      },
    );
  }
}

/// Notification badge widget - shows unread count
class NotificationBadge extends StatelessWidget {
  final Color? backgroundColor;
  final Color? textColor;

  const NotificationBadge({super.key, this.backgroundColor, this.textColor});

  @override
  Widget build(BuildContext context) {
    return Consumer<NotificationService>(
      builder: (context, notificationService, _) {
        final unreadCount = notificationService.unreadCount;

        if (unreadCount == 0) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
          decoration: BoxDecoration(
            color: backgroundColor ?? Colors.red,
            borderRadius: BorderRadius.circular(12),
          ),
          child: Text(
            '$unreadCount',
            style: TextStyle(
              color: textColor ?? Colors.white,
              fontWeight: FontWeight.bold,
              fontSize: 12,
            ),
          ),
        );
      },
    );
  }
}

/// Notification history screen
class NotificationHistoryScreen extends StatelessWidget {
  const NotificationHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Notifications'),
        actions: [
          Consumer<NotificationService>(
            builder: (context, notificationService, _) => PopupMenuButton(
              onSelected: (value) {
                if (value == 'clear-all') {
                  notificationService.clearAll();
                } else if (value == 'clear-read') {
                  notificationService.clearRead();
                } else if (value == 'mark-all-read') {
                  notificationService.markAllAsRead();
                }
              },
              itemBuilder: (context) => [
                const PopupMenuItem(
                  value: 'mark-all-read',
                  child: Text('Mark all as read'),
                ),
                const PopupMenuItem(
                  value: 'clear-read',
                  child: Text('Clear read notifications'),
                ),
                const PopupMenuItem(
                  value: 'clear-all',
                  child: Text('Clear all notifications'),
                ),
              ],
            ),
          ),
        ],
      ),
      body: Consumer<NotificationService>(
        builder: (context, notificationService, _) {
          final notifications = notificationService.notifications;

          if (notifications.isEmpty) {
            return const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.notifications_off_outlined,
                    size: 64,
                    color: Colors.grey,
                  ),
                  SizedBox(height: 16),
                  Text('No notifications yet'),
                ],
              ),
            );
          }

          return ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: notifications.length,
            itemBuilder: (context, index) {
              final notification = notifications[index];
              return NotificationTile(
                notification: notification,
                onDismiss: () {
                  notificationService.markAsRead(notification.id);
                },
                onTap: () {
                  notificationService.markAsRead(notification.id);
                },
              );
            },
          );
        },
      ),
    );
  }
}
