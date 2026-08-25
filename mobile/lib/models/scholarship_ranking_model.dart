class ScholarshipRankingEntry {
  ScholarshipRankingEntry({
    required this.applicationId,
    required this.score,
    required this.status,
    required this.appliedAt,
    required this.studentId,
    required this.studentName,
    required this.school,
    required this.course,
    required this.gpa,
    required this.familyIncome,
    required this.achievements,
  });

  final int applicationId;
  final double score;
  final String status;
  final String appliedAt;
  final int studentId;
  final String studentName;
  final String school;
  final String course;
  final String gpa;
  final String familyIncome;
  final String achievements;

  factory ScholarshipRankingEntry.fromJson(Map<String, dynamic> json) {
    return ScholarshipRankingEntry(
      applicationId: json['application_id'] as int,
      score: (json['score'] is num ? (json['score'] as num).toDouble() : double.tryParse('${json['score']}') ?? 0),
      status: json['status'] as String? ?? '',
      appliedAt: json['applied_at'] as String? ?? '',
      studentId: json['student_id'] is int ? json['student_id'] as int : int.tryParse('${json['student_id']}') ?? 0,
      studentName: json['student_name'] as String? ?? '',
      school: json['school'] as String? ?? '',
      course: json['course'] as String? ?? '',
      gpa: json['gpa']?.toString() ?? '',
      familyIncome: json['family_income']?.toString() ?? '',
      achievements: json['achievements']?.toString() ?? '',
    );
  }
}
