import 'package:flutter/foundation.dart';
import 'api_service.dart';

class ScheduleService {
  /// Fetch all schedules assigned to the current user
  static Future<List<dynamic>> fetchMySchedules(String token) async {
    try {
      final response = await ApiService.get('/schedules', token: token);
      return response['schedules'] as List<dynamic>? ?? [];
    } catch (e) {
      debugPrint('[ScheduleService.fetchMySchedules] Error: $e');
      return [];
    }
  }

  /// Confirm attendance for a scheduled exam/interview
  static Future<void> confirmAttendance(String token, String scheduleId) async {
    try {
      await ApiService.post('/schedules/$scheduleId/confirm', token: token);
    } catch (e) {
      debugPrint('[ScheduleService.confirmAttendance] Error: $e');
      rethrow;
    }
  }
}
