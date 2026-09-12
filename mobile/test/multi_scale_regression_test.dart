import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iskolar_mobile/models/user_model.dart';
import 'package:iskolar_mobile/screens/splash_screen.dart';
import 'package:iskolar_mobile/screens/onboarding_screen.dart';
import 'package:iskolar_mobile/screens/login_screen.dart';
import 'package:iskolar_mobile/screens/home_screen.dart';
import 'package:iskolar_mobile/screens/student_profile_edit_screen.dart';
import 'package:iskolar_mobile/screens/sponsor_admin_notice_screen.dart';
import 'package:iskolar_mobile/screens/register_screen.dart';
import 'package:iskolar_mobile/screens/profile_screen.dart';

void main() {
  final viewports = [
    const Size(360, 800),
    const Size(390, 844),
    const Size(412, 915),
    const Size(768, 1024),
  ];

  final textScales = [1.0, 1.5, 2.0];

  final dummyUser = User(
    id: 1,
    email: 'test.student@iskolar.ph',
    name: 'Juan Dela Cruz',
    firstName: 'Juan',
    lastName: 'Dela Cruz',
    role: 'student',
    verificationStatus: 'verified',
  );

  final screens = <String, Widget Function()>{
    'MOB-01: SplashScreen': () => const SplashScreen(),
    'MOB-02: OnboardingScreen': () => const OnboardingScreen(),
    'MOB-03: LoginScreen': () => const LoginScreen(),
    'MOB-04: RegisterScreen': () => const RegisterScreen(),
    'MOB-06: HomeScreen': () => HomeScreen(user: dummyUser, token: 'fake-token'),
    'MOB-14: ProfileScreen': () => ProfileScreen(user: dummyUser, token: 'fake-token'),
    'MOB-15: StudentProfileEditScreen': () => StudentProfileEditScreen(user: dummyUser, token: 'fake-token'),
    'MOB-16: SponsorAdminNoticeScreen': () => const SponsorAdminNoticeScreen(userRole: 'provider'),
  };

  group('Multi-Scale & Responsive Layout Verification', () {
    for (final screenEntry in screens.entries) {
      for (final size in viewports) {
        for (final scale in textScales) {
          testWidgets('${screenEntry.key} renders cleanly at ${size.width}x${size.height} @ ${(scale * 100).toInt()}% scale', (tester) async {
            tester.view.physicalSize = size;
            tester.view.devicePixelRatio = 1.0;
            addTearDown(tester.view.resetPhysicalSize);
            addTearDown(tester.view.resetDevicePixelRatio);

            await tester.pumpWidget(
              MediaQuery(
                data: MediaQueryData(
                  size: size,
                  textScaler: TextScaler.linear(scale),
                ),
                child: MaterialApp(
                  home: screenEntry.value(),
                ),
              ),
            );

            await tester.pump(const Duration(milliseconds: 100));
            expect(tester.takeException(), isNull, reason: 'Zero RenderFlex overflows permitted');
            await tester.pumpWidget(const SizedBox());
            await tester.pump(const Duration(seconds: 4));
          });
        }
      }
    }
  });
}
