class StudentProfile {
  StudentProfile({
    required this.school,
    required this.course,
    required this.gpa,
    required this.familyIncome,
    required this.achievements,
    required this.status,
    this.firstName = '',
    this.middleName = '',
    this.lastName = '',
    this.profilePicture = '',
    this.mobileNumber = '',
    this.yearLevel = '',
    this.verificationStatus = 'unverified',
    this.corUrl = '',
    this.schoolIdUrl = '',
    this.selfieWithIdUrl = '',
    this.email = '',
  });

  final String school;
  final String course;
  final String gpa;
  final String familyIncome;
  final String achievements;
  final String status;
  final String firstName;
  final String middleName;
  final String lastName;
  final String profilePicture;
  final String mobileNumber;
  final String yearLevel;
  final String verificationStatus; // unverified, pending, verified, rejected
  final String corUrl;
  final String schoolIdUrl;
  final String selfieWithIdUrl;
  final String email;

  factory StudentProfile.fromJson(Map<String, dynamic> json) {
    return StudentProfile(
      school: json['school'] as String? ?? '',
      course: json['course'] as String? ?? '',
      gpa: json['gpa']?.toString() ?? '',
      familyIncome: json['family_income']?.toString() ?? '',
      achievements: json['achievements'] as String? ?? '',
      status: json['status'] as String? ?? '',
      firstName: json['firstName'] as String? ?? json['first_name'] as String? ?? '',
      middleName: json['middleName'] as String? ?? json['middle_name'] as String? ?? '',
      lastName: json['lastName'] as String? ?? json['last_name'] as String? ?? '',
      profilePicture: json['profilePicture'] as String? ?? json['profile_picture'] as String? ?? '',
      mobileNumber: json['mobileNumber'] as String? ?? json['mobile_number'] as String? ?? '',
      yearLevel: json['yearLevel'] as String? ?? json['year_level'] as String? ?? '',
      verificationStatus: json['verificationStatus'] as String? ?? json['verification_status'] as String? ?? 'unverified',
      corUrl: json['corUrl'] as String? ?? json['cor_url'] as String? ?? '',
      schoolIdUrl: json['schoolIdUrl'] as String? ?? json['school_id_url'] as String? ?? '',
      selfieWithIdUrl: json['selfieWithIdUrl'] as String? ?? json['selfie_with_id_url'] as String? ?? '',
      email: json['email'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'school': school,
      'course': course,
      'gpa': gpa,
      'family_income': familyIncome,
      'achievements': achievements,
      'status': status,
      'firstName': firstName,
      'middleName': middleName,
      'lastName': lastName,
      'profilePicture': profilePicture,
      'mobileNumber': mobileNumber,
      'yearLevel': yearLevel,
      'verificationStatus': verificationStatus,
      'corUrl': corUrl,
      'schoolIdUrl': schoolIdUrl,
      'selfieWithIdUrl': selfieWithIdUrl,
      'email': email,
    };
  }
}

