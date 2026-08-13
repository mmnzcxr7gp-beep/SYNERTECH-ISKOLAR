class OrganizationDocument {
  OrganizationDocument({
    required this.filename,
    this.id,
    this.originalname,
    this.mimeType,
    this.fileSize,
    this.type,
    this.uploadedAt,
    this.verified = false,
    this.notes = '',
  });

  final int? id;
  final String filename;
  final String? originalname;
  final String? mimeType;
  final int? fileSize;
  final String? type;
  final String? uploadedAt;
  final bool verified;
  final String? notes;

  String get displayName => originalname?.isNotEmpty == true ? originalname! : filename;

  factory OrganizationDocument.fromJson(Map<String, dynamic> json) {
    return OrganizationDocument(
      id: json['id'] as int?,
      filename: json['filename'] as String? ?? '',
      originalname: json['originalname'] as String?,
      mimeType: json['mime_type'] as String?,
      fileSize: json['file_size'] as int?,
      type: json['type'] as String?,
      uploadedAt: json['uploaded_at'] as String?,
      verified: json['verified'] == true || json['verified'] == 1,
      notes: json['notes'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      if (id != null) 'id': id,
      'filename': filename,
      if (originalname != null) 'originalname': originalname,
      if (mimeType != null) 'mime_type': mimeType,
      if (fileSize != null) 'file_size': fileSize,
      if (type != null) 'type': type,
      if (uploadedAt != null) 'uploaded_at': uploadedAt,
      'verified': verified,
      if (notes != null) 'notes': notes,
    };
  }
}
