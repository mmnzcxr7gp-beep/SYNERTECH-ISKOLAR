/// The role a user selects during onboarding.
enum AuthRole {
  student,
  sponsor;

  String get label {
    switch (this) {
      case AuthRole.student:
        return 'Student';
      case AuthRole.sponsor:
        return 'Sponsor';
    }
  }
}
