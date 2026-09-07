import 'dart:convert';

import 'organization_document_model.dart';
import 'student_profile_model.dart';

class User {
  User({
    required this.id,
    required this.name,
    required this.email,
    required this.role,
    this.company = '',
    this.sponsorVerified = false,
    this.organizationVerified = false,
    this.studentVerified = false,
    this.organizationDocuments = const [],
    this.profile,
    this.firstName = '',
    this.middleName = '',
    this.lastName = '',
    this.emailVerified = false,
    this.verificationStatus = 'unverified',
    this.verificationSubmittedAt = '',
    this.profilePicture = '',
    this.mobileNumber = '',
    this.school = '',
    this.course = '',
    this.yearLevel = '',
    this.corUrl = '',
    this.schoolIdUrl = '',
    this.selfieWithIdUrl = '',
  });

  final int id;
  final String name;
  final String email;
  final String role;

  final String company;

  final bool sponsorVerified;
  final bool organizationVerified;
  final bool studentVerified;

  final List<OrganizationDocument> organizationDocuments;

  final StudentProfile? profile;

  final String firstName;
  final String middleName;
  final String lastName;

  final bool emailVerified;

  final String verificationStatus;

  final String verificationSubmittedAt;

  final String profilePicture;

  final String mobileNumber;
  final String school;
  final String course;
  final String yearLevel;

  final String corUrl;
  final String schoolIdUrl;
  final String selfieWithIdUrl;

  bool get isSponsor =>
      role.toLowerCase() == 'sponsor' ||
      role.toLowerCase() == 'provider';

  String get normalizedVerificationStatus {
    final status = verificationStatus.toLowerCase();

    if (status == 'under_review' ||
        status == 'pending_review') {
      return 'pending';
    }

    if (studentVerified || sponsorVerified || organizationVerified) {
      return 'verified';
    }

    return status;
  }

  bool get isPendingVerification =>
      normalizedVerificationStatus == 'pending';

  bool get isVerified =>
      normalizedVerificationStatus == 'verified' ||
      sponsorVerified ||
      organizationVerified ||
      studentVerified;

  bool get isRejected =>
      normalizedVerificationStatus == 'rejected';

  String? get organizationDocument =>
      organizationDocuments.isNotEmpty
          ? organizationDocuments.first.displayName
          : null;

  User copyWith({
    int? id,
    String? name,
    String? email,
    String? role,
    String? company,
    bool? sponsorVerified,
    bool? organizationVerified,
    bool? studentVerified,
    List<OrganizationDocument>? organizationDocuments,
    StudentProfile? profile,
    String? firstName,
    String? middleName,
    String? lastName,
    bool? emailVerified,
    String? verificationStatus,
    String? verificationSubmittedAt,
    String? profilePicture,
    String? mobileNumber,
    String? school,
    String? course,
    String? yearLevel,
    String? corUrl,
    String? schoolIdUrl,
    String? selfieWithIdUrl,
  }) {
    return User(
      id: id ?? this.id,
      name: name ?? this.name,
      email: email ?? this.email,
      role: role ?? this.role,
      company: company ?? this.company,
      sponsorVerified: sponsorVerified ?? this.sponsorVerified,
      organizationVerified: organizationVerified ?? this.organizationVerified,
      studentVerified: studentVerified ?? this.studentVerified,
      organizationDocuments: organizationDocuments ?? this.organizationDocuments,
      profile: profile ?? this.profile,
      firstName: firstName ?? this.firstName,
      middleName: middleName ?? this.middleName,
      lastName: lastName ?? this.lastName,
      emailVerified: emailVerified ?? this.emailVerified,
      verificationStatus: verificationStatus ?? this.verificationStatus,
      verificationSubmittedAt: verificationSubmittedAt ?? this.verificationSubmittedAt,
      profilePicture: profilePicture ?? this.profilePicture,
      mobileNumber: mobileNumber ?? this.mobileNumber,
      school: school ?? this.school,
      course: course ?? this.course,
      yearLevel: yearLevel ?? this.yearLevel,
      corUrl: corUrl ?? this.corUrl,
      schoolIdUrl: schoolIdUrl ?? this.schoolIdUrl,
      selfieWithIdUrl: selfieWithIdUrl ?? this.selfieWithIdUrl,
    );
  }

  factory User.fromJson(Map<String, dynamic> json) {
    List<OrganizationDocument> docs = [];
    if (json['organization_documents'] is List) {
      for (final item in json['organization_documents'] as List) {
        if (item is Map<String, dynamic>) {
          docs.add(OrganizationDocument.fromJson(item));
        } else if (item is Map) {
          docs.add(OrganizationDocument.fromJson(Map<String, dynamic>.from(item)));
        }
      }
    }

    StudentProfile? userProfile;
    if (json['profile'] is Map<String, dynamic>) {
      userProfile = StudentProfile.fromJson(json['profile'] as Map<String, dynamic>);
    } else if (json['profile'] is Map) {
      userProfile = StudentProfile.fromJson(Map<String, dynamic>.from(json['profile'] as Map));
    }

    final rawId = json['id'];
    final parsedId = rawId is int ? rawId : (int.tryParse(rawId?.toString() ?? '') ?? 0);
    final isStudentVerified = json['student_verified'] == true ||
        json['is_verified'] == true ||
        json['isVerified'] == true ||
        json['student_verified'].toString() == 'true' ||
        json['is_verified'].toString() == 'true' ||
        json['isVerified'].toString() == 'true';

    final rawVerStatus = json['verificationStatus'] ?? json['verification_status'];
    final resolvedStatus = rawVerStatus != null
        ? rawVerStatus.toString()
        : (isStudentVerified ? 'verified' : 'unverified');

    return User(
      id: parsedId,
      name: (json['name'] ?? '').toString(),
      email: (json['email'] ?? '').toString(),
      role: (json['role'] ?? '').toString(),
      company: (json['company'] ?? json['organization_name'] ?? '').toString(),
      sponsorVerified: json['sponsor_verified'] == true || json['sponsor_verified'] == 1 || json['sponsor_verified'].toString() == 'true',
      organizationVerified: json['organization_verified'] == true || json['organization_verified'] == 1 || json['organization_verified'].toString() == 'true',
      studentVerified: isStudentVerified,
      organizationDocuments: docs,
      profile: userProfile,
      firstName: (json['firstName'] ?? json['first_name'] ?? '').toString(),
      middleName: (json['middleName'] ?? json['middle_name'] ?? '').toString(),
      lastName: (json['lastName'] ?? json['last_name'] ?? '').toString(),
      emailVerified: json['emailVerified'] == true || json['email_verified'] == true || json['emailVerified'].toString() == 'true',
      verificationStatus: resolvedStatus,
      verificationSubmittedAt: (json['verification_submitted_at'] ?? '').toString(),
      profilePicture: (json['profilePicture'] ?? json['profile_picture'] ?? '').toString(),
      mobileNumber: (json['mobileNumber'] ?? json['mobile_number'] ?? '').toString(),
      school: (json['school'] ?? '').toString(),
      course: (json['course'] ?? '').toString(),
      yearLevel: (json['yearLevel'] ?? json['year_level'] ?? '').toString(),
      corUrl: (json['corUrl'] ?? json['cor_url'] ?? '').toString(),
      schoolIdUrl: (json['schoolIdUrl'] ?? json['school_id_url'] ?? '').toString(),
      selfieWithIdUrl: (json['selfieWithIdUrl'] ?? json['selfie_with_id_url'] ?? '').toString(),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'name': name,
      'email': email,
      'role': role,
      'company': company,
      'sponsor_verified': sponsorVerified,
      'organization_verified': organizationVerified,
      'organization_documents':
          organizationDocuments
              .map((e) => e.toJson())
              .toList(),
      'profile': profile?.toJson(),
      'firstName': firstName,
      'middleName': middleName,
      'lastName': lastName,
      'emailVerified': emailVerified,
      'verificationStatus': verificationStatus,
      'verification_submitted_at':
          verificationSubmittedAt,
      'profilePicture': profilePicture,
      'mobileNumber': mobileNumber,
      'school': school,
      'course': course,
      'yearLevel': yearLevel,
      'corUrl': corUrl,
      'schoolIdUrl': schoolIdUrl,
      'selfieWithIdUrl': selfieWithIdUrl,
    };
  }

  String toJsonString() => json.encode(toJson());

  static User fromJsonString(
    String jsonString,
  ) {
    return User.fromJson(
      json.decode(jsonString)
          as Map<String, dynamic>,
    );
  }
}

class AuthResponse {
  AuthResponse({
    required this.user,
    required this.token,
    this.refreshToken,
  });

  final User user;
  final String token;
  final String? refreshToken;

  factory AuthResponse.fromJson(
    Map<String, dynamic> json,
  ) {
    return AuthResponse(
      user: User.fromJson(
        json['user']
            as Map<String, dynamic>,
      ),
      token: json['token'] as String,
      refreshToken:
          json['refreshToken'] as String?,
    );
  }
}

class LoginResult {
  final bool requiresMfa;
  final String? mfaToken;
  final String? email;
  final AuthResponse? authResponse;

  LoginResult({
    this.requiresMfa = false,
    this.mfaToken,
    this.email,
    this.authResponse,
  });
}