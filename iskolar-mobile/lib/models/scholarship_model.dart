class Scholarship {
  Scholarship({
    required this.id,
    required this.title,
    required this.description,
    required this.slots,
    required this.deadline,
    required this.requirements,
    required this.sponsorId,
    required this.createdAt,
    this.sponsorName = '',
    this.sponsorVerified = false,
    this.organizationVerified = false,
  });

  final String id;
  final String title;
  final String description;
  final int slots;
  final String deadline;
  final List<String> requirements;
  final int sponsorId;
  final DateTime createdAt;
  final String sponsorName;
  final bool sponsorVerified;
  final bool organizationVerified;

  factory Scholarship.fromJson(Map<String, dynamic> json) {
    // Handle requirements as either array or string for backward compatibility
    List<String> parseRequirements(dynamic req) {
      if (req == null) return [];
      if (req is List) {
        return req.where((r) => r is String && r.isNotEmpty).cast<String>().toList();
      }
      if (req is String && req.isNotEmpty) {
        return [req];
      }
      return [];
    }

    // Some API routes (opportunities browse) return an `id` of 0 and provide
    // the real identifier in `_id` or `opportunityId`. Prefer `_id` when the
    // `id` field is missing or is the legacy placeholder value 0.
    dynamic rawId = json['id'];
    if ((rawId == null || rawId == 0) && json.containsKey('_id')) {
      rawId = json['_id'];
    }
    if ((rawId == null || rawId == 0) && json.containsKey('opportunityId')) {
      rawId = json['opportunityId'];
    }

    String parseId(dynamic value) {
      if (value == null) return '';
      if (value is String) return value;
      if (value is int) return value.toString();
      return value.toString();
    }

    return Scholarship(
      id: parseId(rawId),
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      slots: json['slots'] is int ? json['slots'] as int : int.tryParse('${json['slots']}') ?? 0,
      deadline: json['deadline'] as String? ?? '',
      requirements: parseRequirements(json['requirements']),
      sponsorId: json['sponsor_id'] is int ? json['sponsor_id'] as int : int.tryParse('${json['sponsor_id']}') ?? 0,
      createdAt: json['createdAt'] != null
          ? DateTime.tryParse(json['createdAt'] as String) ?? DateTime.fromMillisecondsSinceEpoch(0)
          : DateTime.fromMillisecondsSinceEpoch(0),
      sponsorName: json['sponsor_name'] as String? ?? '',
      sponsorVerified: json['sponsor_verified'] == true || json['sponsor_verified'] == 1,
      organizationVerified: json['organization_verified'] == true || json['organization_verified'] == 1,
    );
  }
}
