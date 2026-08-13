import 'package:flutter/material.dart';
import '../services/notification_api_service.dart';
import '../utils/app_colors.dart';

class NotificationsScreen extends StatefulWidget {
  const NotificationsScreen({
    super.key,
    required this.token,
  });

  final String token;

  @override
  State<NotificationsScreen> createState() => _NotificationsScreenState();
}

class _NotificationsScreenState extends State<NotificationsScreen> {
  List<dynamic> _notifications = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadNotifications();
  }

  Future<void> _loadNotifications() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final list = await NotificationApiService.fetchNotifications(widget.token);
      setState(() => _notifications = list);
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _markRead(String id) async {
    await NotificationApiService.markAsRead(widget.token, id);
    _loadNotifications();
  }

  Future<void> _markAllRead() async {
    await NotificationApiService.markAllAsRead(widget.token);
    _loadNotifications();
  }

  IconData _getIcon(String type) {
    switch (type) {
      case 'verification_approved':
      case 'document_verified':
        return Icons.check_circle_outline;
      case 'verification_rejected':
      case 'document_rejected':
      case 'document_needs_correction':
        return Icons.cancel_outlined;
      case 'exam_scheduled':
        return Icons.event;
      case 'interview_scheduled':
        return Icons.video_call_outlined;
      case 'allowance_approved':
        return Icons.payments_outlined;
      default:
        return Icons.notifications_none;
    }
  }

  Color _getColor(String type) {
    if (type.contains('approved') || type.contains('verified')) {
      return Colors.green;
    }
    if (type.contains('rejected') || type.contains('needs_correction')) {
      return Colors.red;
    }
    if (type.contains('scheduled')) {
      return AppColors.primary;
    }
    return AppColors.textSecondary;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Notifications'),
        backgroundColor: Colors.transparent,
        elevation: 0,
        actions: [
          if (_notifications.isNotEmpty)
            TextButton(
              onPressed: _markAllRead,
              child: const Text('Mark all read'),
            ),
        ],
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text('Error: $_error', style: const TextStyle(color: Colors.red)))
                : _notifications.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.notifications_off_outlined, size: 64, color: Colors.white24),
                            SizedBox(height: 16),
                            Text('No notifications yet', style: TextStyle(color: Colors.white54, fontSize: 16)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadNotifications,
                        child: ListView.builder(
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          itemCount: _notifications.length,
                          itemBuilder: (context, index) {
                            final notif = _notifications[index];
                            final isRead = notif['read'] == true;
                            final type = notif['type'] as String? ?? 'general';

                            return Card(
                              margin: const EdgeInsets.only(bottom: 12),
                              color: isRead ? AppColors.surface.withValues(alpha: 0.5) : AppColors.surface,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: BorderSide(
                                  color: isRead ? Colors.transparent : AppColors.primary.withValues(alpha: 0.3),
                                ),
                              ),
                              child: ListTile(
                                leading: CircleAvatar(
                                  backgroundColor: _getColor(type).withValues(alpha: 0.12),
                                  child: Icon(_getIcon(type), color: _getColor(type)),
                                ),
                                title: Text(
                                  notif['title'] as String? ?? 'Notification',
                                  style: TextStyle(
                                    color: Colors.white,
                                    fontWeight: isRead ? FontWeight.normal : FontWeight.bold,
                                  ),
                                ),
                                subtitle: Padding(
                                  padding: const EdgeInsets.only(top: 4),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        notif['message'] as String? ?? '',
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                      ),
                                      const SizedBox(height: 6),
                                      Text(
                                        notif['createdAt'] != null
                                            ? DateTime.parse(notif['createdAt']).toLocal().toString().substring(0, 16)
                                            : '',
                                        style: const TextStyle(color: Colors.white30, fontSize: 10),
                                      ),
                                    ],
                                  ),
                                ),
                                trailing: !isRead
                                    ? IconButton(
                                        icon: const Icon(Icons.mark_chat_read_outlined, size: 20, color: AppColors.primary),
                                        onPressed: () => _markRead(notif['_id'] as String),
                                      )
                                    : null,
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }
}
