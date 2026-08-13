// This file is deprecated. The student identity verification screen
// is now in student_identity_verification_screen.dart.
//
// This file re-exports StudentVerificationScreen from the identity
// verification screen so that any existing imports continue to work.

import 'student_identity_verification_screen.dart';

export 'student_identity_verification_screen.dart'
    show StudentVerificationScreen;

/// Alias for backward compatibility — screens that referenced
/// `StudentVerificationScreenV2` will now use the same class.
typedef StudentVerificationScreenV2 = StudentVerificationScreen;
