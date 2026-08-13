import '../models/application_model.dart';
import '../models/scholarship_model.dart';
import '../models/scholarship_ranking_model.dart';
import '../services/api_service.dart';

class ScholarshipService {
  static Future<List<Scholarship>> getScholarships(String token) async {
    final response = await ApiService.get('/scholarships', token: token);
    final items = response['scholarships'] as List<dynamic>? ?? [];
    return items.map((item) => Scholarship.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<List<ApplicationEntry>> getApplications(String token) async {
    final response = await ApiService.get('/applications', token: token);
    final dynamic rawItems = response['applications'] ?? response['data'];
    final items = rawItems is List<dynamic> ? rawItems : [];
    return items
        .map((item) => ApplicationEntry.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  static Future<Scholarship> createScholarship({
    required String title,
    required String description,
    required int slots,
    required String deadline,
    required List<String> requirements,
    required String token,
  }) async {
    final response = await ApiService.post(
      '/scholarships',
      token: token,
      body: {
        'title': title,
        'description': description,
        'slots': slots,
        'deadline': deadline,
        'requirements': requirements,
      },
    );

    return Scholarship.fromJson(response['scholarship'] as Map<String, dynamic>);
  }

  static Future<Scholarship> updateScholarship({
    required String id,
    required String title,
    required String description,
    required int slots,
    required String deadline,
    required List<String> requirements,
    required String token,
  }) async {
    final response = await ApiService.put(
      '/scholarships/$id',
      token: token,
      body: {
        'title': title,
        'description': description,
        'slots': slots,
        'deadline': deadline,
        'requirements': requirements,
      },
    );

    return Scholarship.fromJson(response['scholarship'] as Map<String, dynamic>);
  }

  static Future<void> updateApplicationStatus(
    int applicationId,
    String status,
    String token,
  ) async {
    await ApiService.put(
      '/applications/$applicationId/status',
      token: token,
      body: {'status': status},
    );
  }

  static Future<List<ApplicationEntry>> getScholarshipApplications(
    String scholarshipId,
    String token,
  ) async {
    final response = await ApiService.get('/scholarships/$scholarshipId/applications', token: token);
    final items = response['applications'] as List<dynamic>? ?? [];
    return items.map((item) => ApplicationEntry.fromJson(item as Map<String, dynamic>)).toList();
  }

  static Future<List<ScholarshipRankingEntry>> getScholarshipRankings(
    String scholarshipId,
    String token,
  ) async {
    final response = await ApiService.get('/rankings/scholarship/$scholarshipId', token: token);
    final items = response['rankings'] as List<dynamic>? ?? [];
    return items
        .map((item) => ScholarshipRankingEntry.fromJson(item as Map<String, dynamic>))
        .toList();
  }

  static Future<void> applyToScholarship(String scholarshipId, String token) async {
    await ApiService.post(
      '/applications',
      token: token,
      body: {
        'scholarship_id': scholarshipId,
      },
    );
  }

  /// Browse open scholarship opportunities and scholarships.
  static Future<List<dynamic>> browseOpportunities({
    String? type,
    int page = 1,
    int limit = 10,
  }) async {
    try {
      final path = type != null
          ? '/scholarship-opportunities/browse?type=$type&page=$page&limit=$limit'
          : '/scholarship-opportunities/browse?page=$page&limit=$limit';

      final response = await ApiService.get(path);
      return response['scholarships'] as List<dynamic>? ??
          response['opportunities'] as List<dynamic>? ?? [];
    } catch (e) {
      throw ApiException('Error browsing opportunities: ${e.toString()}');
    }
  }

  /// Browse open scholarships using the current scholarships payload.
  static Future<List<Scholarship>> browseScholarships({
    String? type,
    int page = 1,
    int limit = 10,
    String? token,
  }) async {
    try {
      final path = type != null
          ? '/scholarship-opportunities/browse?type=$type&page=$page&limit=$limit'
          : '/scholarship-opportunities/browse?page=$page&limit=$limit';

      final response = await ApiService.get(path, token: token);
      final items = response['scholarships'] as List<dynamic>? ??
          response['opportunities'] as List<dynamic>? ?? [];
      return items
          .map((item) => Scholarship.fromJson(item as Map<String, dynamic>))
          .toList();
    } catch (e) {
      throw ApiException('Error browsing scholarships: ${e.toString()}');
    }
  }

  /// Get opportunity by ID
  static Future<Map<String, dynamic>> getOpportunityById(String opportunityId) async {
    try {
      final response = await ApiService.get('/scholarship-opportunities/$opportunityId');
      return response;
    } catch (e) {
      throw ApiException('Error loading opportunity: ${e.toString()}');
    }
  }

  /// Get opportunity details with application status
  static Future<Map<String, dynamic>> getOpportunityDetails(
    String opportunityId,
    String token,
  ) async {
    try {
      final response = await ApiService.get(
        '/scholarship-opportunities/$opportunityId/details',
        token: token,
      );
      return response;
    } catch (e) {
      throw ApiException('Error loading opportunity details: ${e.toString()}');
    }
  }
}
