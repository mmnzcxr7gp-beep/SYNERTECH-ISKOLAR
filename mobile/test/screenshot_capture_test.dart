import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iskolar_mobile/models/scholarship_model.dart';
import 'package:iskolar_mobile/models/user_model.dart';
import 'package:iskolar_mobile/screens/application_upload_screen.dart';
import 'package:iskolar_mobile/screens/home_screen.dart';
import 'package:iskolar_mobile/screens/login_screen.dart';
import 'package:iskolar_mobile/screens/ocr_review_screen.dart';
import 'package:iskolar_mobile/screens/onboarding_screen.dart';
import 'package:iskolar_mobile/screens/profile_screen.dart';
import 'package:iskolar_mobile/screens/register_screen.dart';
import 'package:iskolar_mobile/screens/scholarship_detail_screen.dart';
import 'package:iskolar_mobile/screens/splash_screen.dart';
import 'package:iskolar_mobile/screens/sponsor_admin_notice_screen.dart';
import 'package:iskolar_mobile/screens/student_profile_edit_screen.dart';
import 'package:iskolar_mobile/services/ocr_service.dart';
import 'package:iskolar_mobile/utils/app_theme.dart';

void main() {
  final outputDir = Directory('../audit/screenshots/flutter');
  if (!outputDir.existsSync()) {
    outputDir.createSync(recursive: true);
  }

  final dummyUser = User(
    id: 1,
    email: 'maria.santos@iskolar.ph',
    name: 'Maria Clara Santos',
    firstName: 'Maria Clara',
    lastName: 'Santos',
    role: 'student',
    verificationStatus: 'verified',
    school: 'Polytechnic University of the Philippines',
    course: 'BS Computer Science',
    yearLevel: '3rd Year',
  );

  final dummyScholarship = Scholarship(
    id: '202601',
    title: 'Gokongwei STEM Leadership Grant 2026',
    description: 'Premier leadership and academic development grant supporting underprivileged STEM scholars with comprehensive tuition support, monthly stipends, and research mentorship.',
    slots: 50,
    deadline: '2026-11-30',
    requirements: [
      'Official Certificate of Registration (COR)',
      'Certified True Copy of Grades / TOR',
      'Latest Certificate of Indigency / ITR',
    ],
    sponsorId: 2,
    createdAt: DateTime(2026, 1, 15),
    sponsorName: 'Gokongwei Brothers Foundation',
    sponsorVerified: true,
    organizationVerified: true,
  );

  final dummyOcrResult = OcrResult(
    rawText: 'REPUBLIC OF THE PHILIPPINES\nPOLYTECHNIC UNIVERSITY OF THE PHILIPPINES\nSTUDENT ID: 2023-00123-MN-0\nNAME: MARIA CLARA SANTOS\nDEGREE: BS COMPUTER SCIENCE',
    extractedFields: {
      'fullName': 'Maria Clara Santos',
      'idNumber': '2023-00123-MN-0',
      'school': 'Polytechnic University of the Philippines',
      'course': 'BS Computer Science',
    },
    documentType: 'Student ID',
    confidence: 96,
    filePath: 'sample_id.jpg',
    message: 'Identity document successfully scanned and verified with 96% match confidence.',
  );

  Future<void> captureScreen(
    WidgetTester tester, {
    required Widget child,
    required String filename,
    required Size size,
    required bool isDark,
  }) async {
    tester.view.physicalSize = size;
    tester.view.devicePixelRatio = 1.0;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);

    final boundaryKey = GlobalKey();

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: isDark ? ThemeMode.dark : ThemeMode.light,
        home: RepaintBoundary(
          key: boundaryKey,
          child: MediaQuery(
            data: MediaQueryData(
              size: size,
              platformBrightness: isDark ? Brightness.dark : Brightness.light,
            ),
            child: child,
          ),
        ),
      ),
    );

    await tester.pump(const Duration(milliseconds: 100));

    final boundary = boundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
    if (boundary != null) {
      final image = await boundary.toImage(pixelRatio: 1.0);
      final byteData = await image.toByteData(format: ui.ImageByteFormat.png);
      if (byteData != null) {
        final pngBytes = byteData.buffer.asUint8List();
        final file = File('${outputDir.path}/$filename');
        await file.writeAsBytes(pngBytes);
      }
    }

    await tester.pumpWidget(const SizedBox());
    await tester.pump(const Duration(seconds: 4));
  }

  group('Visual QA Screenshot Generation', () {
    // 1. Splash Screen
    testWidgets('Capture Splash Screen (Light & Dark, 390x844)', (tester) async {
      await captureScreen(tester, child: const SplashScreen(), filename: 'flutter_splash_light_390x844.png', size: const Size(390, 844), isDark: false);
      await captureScreen(tester, child: const SplashScreen(), filename: 'flutter_splash_dark_390x844.png', size: const Size(390, 844), isDark: true);
    });

    // 2. Onboarding Screen
    testWidgets('Capture Onboarding Screen (Light & Dark, 390x844)', (tester) async {
      await captureScreen(tester, child: const OnboardingScreen(), filename: 'flutter_onboarding_light_390x844.png', size: const Size(390, 844), isDark: false);
      await captureScreen(tester, child: const OnboardingScreen(), filename: 'flutter_onboarding_dark_390x844.png', size: const Size(390, 844), isDark: true);
    });

    // 3. Login Screen (Multi-resolution + Light/Dark)
    testWidgets('Capture Login Screen', (tester) async {
      await captureScreen(tester, child: const LoginScreen(), filename: 'flutter_login_light_390x844.png', size: const Size(390, 844), isDark: false);
      await captureScreen(tester, child: const LoginScreen(), filename: 'flutter_login_dark_390x844.png', size: const Size(390, 844), isDark: true);
      await captureScreen(tester, child: const LoginScreen(), filename: 'flutter_login_light_360x800.png', size: const Size(360, 800), isDark: false);
      await captureScreen(tester, child: const LoginScreen(), filename: 'flutter_login_light_412x915.png', size: const Size(412, 915), isDark: false);
      await captureScreen(tester, child: const LoginScreen(), filename: 'flutter_login_light_768x1024.png', size: const Size(768, 1024), isDark: false);
    });

    // 4. Register Screen (Light & Dark)
    testWidgets('Capture Register Screen', (tester) async {
      await captureScreen(tester, child: const RegisterScreen(), filename: 'flutter_register_light_390x844.png', size: const Size(390, 844), isDark: false);
      await captureScreen(tester, child: const RegisterScreen(), filename: 'flutter_register_dark_390x844.png', size: const Size(390, 844), isDark: true);
    });

    // 5. Student Home Screen (Multi-resolution + Light/Dark)
    testWidgets('Capture Student Home Screen', (tester) async {
      await captureScreen(tester, child: HomeScreen(user: dummyUser, token: 'fake-token'), filename: 'flutter_student_home_light_390x844.png', size: const Size(390, 844), isDark: false);
      await captureScreen(tester, child: HomeScreen(user: dummyUser, token: 'fake-token'), filename: 'flutter_student_home_dark_390x844.png', size: const Size(390, 844), isDark: true);
      await captureScreen(tester, child: HomeScreen(user: dummyUser, token: 'fake-token'), filename: 'flutter_student_home_light_360x800.png', size: const Size(360, 800), isDark: false);
      await captureScreen(tester, child: HomeScreen(user: dummyUser, token: 'fake-token'), filename: 'flutter_student_home_light_412x915.png', size: const Size(412, 915), isDark: false);
      await captureScreen(tester, child: HomeScreen(user: dummyUser, token: 'fake-token'), filename: 'flutter_student_home_light_768x1024.png', size: const Size(768, 1024), isDark: false);
    });

    // 6. Scholarship Details
    testWidgets('Capture Scholarship Details Screen', (tester) async {
      await captureScreen(
        tester,
        child: ScholarshipDetailScreen(scholarship: dummyScholarship, token: 'fake-token', alreadyApplied: false),
        filename: 'flutter_scholarship_details_light_390x844.png',
        size: const Size(390, 844),
        isDark: false,
      );
      await captureScreen(
        tester,
        child: ScholarshipDetailScreen(scholarship: dummyScholarship, token: 'fake-token', alreadyApplied: false),
        filename: 'flutter_scholarship_details_dark_390x844.png',
        size: const Size(390, 844),
        isDark: true,
      );
    });

    // 7. Application Upload
    testWidgets('Capture Application Upload Screen', (tester) async {
      await captureScreen(
        tester,
        child: ApplicationUploadScreen(
          token: 'fake-token',
          scholarshipId: 202601,
          scholarshipTitle: dummyScholarship.title,
          requirements: dummyScholarship.requirements,
        ),
        filename: 'flutter_application_upload_light_390x844.png',
        size: const Size(390, 844),
        isDark: false,
      );
      await captureScreen(
        tester,
        child: ApplicationUploadScreen(
          token: 'fake-token',
          scholarshipId: 202601,
          scholarshipTitle: dummyScholarship.title,
          requirements: dummyScholarship.requirements,
        ),
        filename: 'flutter_application_upload_dark_390x844.png',
        size: const Size(390, 844),
        isDark: true,
      );
    });

    // 8. OCR Review
    testWidgets('Capture OCR Review Screen', (tester) async {
      await captureScreen(
        tester,
        child: OcrReviewScreen(
          token: 'fake-token',
          imagePath: 'test_doc.jpg',
          ocrResult: dummyOcrResult,
        ),
        filename: 'flutter_ocr_review_light_390x844.png',
        size: const Size(390, 844),
        isDark: false,
      );
      await captureScreen(
        tester,
        child: OcrReviewScreen(
          token: 'fake-token',
          imagePath: 'test_doc.jpg',
          ocrResult: dummyOcrResult,
        ),
        filename: 'flutter_ocr_review_dark_390x844.png',
        size: const Size(390, 844),
        isDark: true,
      );
    });

    // 9. Profile Screen
    testWidgets('Capture Profile Screen', (tester) async {
      await captureScreen(
        tester,
        child: ProfileScreen(user: dummyUser, token: 'fake-token'),
        filename: 'flutter_student_profile_light_390x844.png',
        size: const Size(390, 844),
        isDark: false,
      );
      await captureScreen(
        tester,
        child: ProfileScreen(user: dummyUser, token: 'fake-token'),
        filename: 'flutter_student_profile_dark_390x844.png',
        size: const Size(390, 844),
        isDark: true,
      );
    });

    // 10. Student Profile Edit Screen
    testWidgets('Capture Student Profile Edit Screen', (tester) async {
      await captureScreen(
        tester,
        child: StudentProfileEditScreen(user: dummyUser, token: 'fake-token'),
        filename: 'flutter_profile_edit_light_390x844.png',
        size: const Size(390, 844),
        isDark: false,
      );
      await captureScreen(
        tester,
        child: StudentProfileEditScreen(user: dummyUser, token: 'fake-token'),
        filename: 'flutter_profile_edit_dark_390x844.png',
        size: const Size(390, 844),
        isDark: true,
      );
    });

    // 11. Sponsor/Admin Notice Screen
    testWidgets('Capture Sponsor Admin Notice Screen', (tester) async {
      await captureScreen(
        tester,
        child: const SponsorAdminNoticeScreen(userRole: 'provider'),
        filename: 'flutter_sponsor_admin_notice_light_390x844.png',
        size: const Size(390, 844),
        isDark: false,
      );
      await captureScreen(
        tester,
        child: const SponsorAdminNoticeScreen(userRole: 'provider'),
        filename: 'flutter_sponsor_admin_notice_dark_390x844.png',
        size: const Size(390, 844),
        isDark: true,
      );
    });
  });
}
