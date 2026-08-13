import 'package:flutter/foundation.dart';
import 'api_service.dart';

class NotificationApiService {
  /// Fetch all notifications for the authenticated user
  static Future<List<dynamic>> fetchNotifications(String token) async {
    try {
      final response = await ApiService.get('/notifications', token: token);
      return response['notifications'] as List<dynamic>? ?? [];
    } catch (e) {
      debugPrint('[NotificationApiService.fetchNotifications] Error: $e');
      return [];
    }
  }

  /// Mark a specific notification as read
  static Future<void> markAsRead(String token, String notificationId) async {
    try {
      await ApiService.put('/notifications/$notificationId/read', token: token);
    } catch (e) {
      debugPrint('[NotificationApiService.markAsRead] Error: $e');
    }
  }

  /// Mark all notifications as read
  static Future<void> markAllAsRead(String token) async {
    try {
      await ApiService.put('/notifications/read-all', token: token);
    } catch (e) {
      debugPrint('[NotificationApiService.markAllAsRead] Error: $e');
    }
  }
}
