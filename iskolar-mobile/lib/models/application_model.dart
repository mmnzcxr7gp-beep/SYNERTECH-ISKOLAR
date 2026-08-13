class DocumentEntry {
  DocumentEntry({
    required this.id,
    required this.requirementName,
    required this.originalname,
    required this.filename,
    required this.mimeType,
    required this.uploadedAt,
    this.status = 'Uploaded',
  });

  final String id;
  final String requirementName;
  final String originalname;
  final String filename;
  final String mimeType;
  final String uploadedAt;
  final String status;

  bool get isImage =>
      mimeType.startsWith('image/') ||
      RegExp(r'\.(png|jpe?g|gif|webp|bmp)$', caseSensitive: false).hasMatch(originalname.isNotEmpty ? originalname : filename);

  bool get isPdf =>
      mimeType == 'application/pdf' ||
      RegExp(r'\.pdf$', caseSensitive: false).hasMatch(originalname.isNotEmpty ? originalname : filename);

  factory DocumentEntry.fromJson(Map<String, dynamic> json) {
    return DocumentEntry(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      requirementName: json['requirement_name'] as String? ?? json['type'] as String? ?? json['requirement_field'] as String? ?? 'Document',
      originalname: json['originalname'] as String? ?? '',
      filename: json['filename'] as String? ?? '',
      mimeType: json['mime_type'] as String? ?? json['mimeType'] as String? ?? '',
      uploadedAt: json['uploaded_at'] as String? ?? json['uploadedAt'] as String? ?? '',
      status: json['status'] as String? ?? 'Uploaded',
    );
  }
}

class ApplicationEntry {
  ApplicationEntry({
    required this.id,
    required this.scholarshipId,
    required this.scholarshipTitle,
    required this.status,
    required this.score,
    required this.appliedAt,
    this.studentName = '',
    this.studentEmail = '',
    this.gpa = '',
    this.familyIncome = '',
    this.achievements = '',
    this.documents = const [],
  });

  final String id;
  final String scholarshipId;
  final String scholarshipTitle;
  final String status;
  final double score;
  final String appliedAt;
  final String studentName;
  final String studentEmail;
  final String gpa;
  final String familyIncome;
  final String achievements;
  final List<DocumentEntry> documents;

  factory ApplicationEntry.fromJson(Map<String, dynamic> json) {
    return ApplicationEntry(
      id: json['id']?.toString() ?? json['_id']?.toString() ?? '',
      scholarshipId: json['scholarship_id']?.toString() ?? '',
      scholarshipTitle: json['scholarship_title'] as String? ?? '',
      status: json['status'] as String? ?? 'pending',
      score: (json['score'] is num ? (json['score'] as num).toDouble() : double.tryParse('${json['score']}') ?? 0),
      appliedAt: json['applied_at'] as String? ?? '',
      studentName: json['student_name'] as String? ?? '',
      studentEmail: json['student_email'] as String? ?? '',
      gpa: json['gpa']?.toString() ?? '',
      familyIncome: json['family_income']?.toString() ?? '',
      achievements: json['achievements']?.toString() ?? '',
      documents: (json['documents'] as List<dynamic>?)
              ?.map((d) => DocumentEntry.fromJson(d as Map<String, dynamic>))
              .toList() ??
          const [],
    );
  }
}
