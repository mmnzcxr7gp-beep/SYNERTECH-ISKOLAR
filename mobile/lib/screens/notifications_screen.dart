import 'package:flutter/material.dart';
import '../services/notification_api_service.dart';
import '../utils/app_colors.dart';
import 'application_history_screen.dart';
import 'browse_scholarships_screen.dart';

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

                            return RepaintBoundary(
                              child: Card(
                                margin: const EdgeInsets.only(bottom: 12),
                                color: isRead ? AppColors.surface.withValues(alpha: 0.5) : AppColors.surface,
                                shape: RoundedRectangleBorder(
                                  borderRadius: BorderRadius.circular(16),
                                  side: BorderSide(
                                    color: isRead ? Colors.transparent : AppColors.primary.withValues(alpha: 0.3),
                                  ),
                                ),
                                child: ListTile(
                                  onTap: () {
                                    final notifId = (notif['_id'] ?? notif['id'])?.toString();
                                    if (notifId != null && !isRead) {
                                      _markRead(notifId);
                                    }
                                    _showNotificationDetails(notif);
                                  },
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
                                          onPressed: () => _markRead((notif['_id'] ?? notif['id']).toString()),
                                        )
                                      : const Icon(Icons.chevron_right, size: 18, color: Colors.white24),
                                ),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }

  void _showNotificationDetails(dynamic notif) {
    if (notif is! Map) return;
    final type = (notif['type'] as String? ?? 'general').toLowerCase();
    final title = notif['title'] as String? ?? 'Notification Details';
    final message = notif['message'] as String? ?? notif['body'] as String? ?? '';
    final createdAt = notif['createdAt'] != null
        ? DateTime.tryParse(notif['createdAt'].toString())?.toLocal().toString().substring(0, 16) ?? ''
        : '';
    final data = notif['data'] is Map ? notif['data'] as Map : {};
    final route = notif['route'] as String? ?? data['route'] as String?;
    final status = notif['status'] as String? ?? data['status'] as String? ?? 'Delivered & Verified';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) {
        return Container(
          decoration: const BoxDecoration(
            color: AppColors.panelDark,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            border: Border(top: BorderSide(color: AppColors.border, width: 1)),
          ),
          padding: const EdgeInsets.fromLTRB(20, 12, 20, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Drag handle
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  margin: const EdgeInsets.only(bottom: 16),
                  decoration: BoxDecoration(
                    color: Colors.white24,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              // Header: Icon + Title + Close Button
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  CircleAvatar(
                    backgroundColor: _getColor(type).withValues(alpha: 0.15),
                    radius: 20,
                    child: Icon(_getIcon(type), color: _getColor(type), size: 22),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          title,
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        if (createdAt.isNotEmpty) ...[
                          const SizedBox(height: 2),
                          Text(
                            createdAt,
                            style: const TextStyle(color: AppColors.textMuted, fontSize: 11),
                          ),
                        ],
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Colors.white54, size: 20),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Message Content Card
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surface,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppColors.border),
                ),
                child: Text(
                  message,
                  style: const TextStyle(
                    color: AppColors.textPrimary,
                    fontSize: 14,
                    height: 1.5,
                  ),
                ),
              ),
              const SizedBox(height: 14),
              // Status & Metadata Badges
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.check_circle, color: AppColors.success, size: 14),
                        const SizedBox(width: 6),
                        Text(
                          status,
                          style: const TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                    decoration: BoxDecoration(
                      color: AppColors.surface,
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: AppColors.border),
                    ),
                    child: Text(
                      type.toUpperCase().replaceAll('_', ' '),
                      style: const TextStyle(color: AppColors.primary, fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
              // Action Buttons
              Row(
                children: [
                  if (type.contains('application') || route == 'applications') ...[
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.description_outlined, size: 16),
                        label: const Text('View Applications'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          Navigator.pop(ctx);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => ApplicationHistoryScreen(token: widget.token),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                  ] else if (type.contains('scholarship') || route == 'scholarships') ...[
                    Expanded(
                      child: ElevatedButton.icon(
                        icon: const Icon(Icons.school_outlined, size: 16),
                        label: const Text('Browse Grants'),
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppColors.primary,
                          foregroundColor: Colors.white,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                          padding: const EdgeInsets.symmetric(vertical: 12),
                        ),
                        onPressed: () {
                          Navigator.pop(ctx);
                          Navigator.push(
                            context,
                            MaterialPageRoute(
                              builder: (_) => BrowseScholarshipsScreen(token: widget.token),
                            ),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                  ],
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      foregroundColor: Colors.white70,
                      side: const BorderSide(color: AppColors.border),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
                    ),
                    onPressed: () => Navigator.pop(ctx),
                    child: const Text('Dismiss'),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }
}
