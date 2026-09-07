import 'package:flutter/foundation.dart';

/// App-level constants and text.
class AppConstants {
  static const String appName = 'ISKOLAR';

  static const String slogan = 'Connecting Students to Opportunities';

  static final String backendBaseUrl = _buildBackendUrl();

  static String _buildBackendUrl() {
    const envUrl = String.fromEnvironment('BACKEND_BASE_URL');

    // Production release guard: Release builds MUST NEVER contain or default to 10.0.2.2 or localhost
    if (kReleaseMode) {
      final releaseUrl = envUrl.isNotEmpty ? envUrl : 'https://iskolar-api.onrender.com/api';
      if (releaseUrl.contains('10.0.2.2') ||
          releaseUrl.contains('localhost') ||
          releaseUrl.contains('127.0.0.1')) {
        throw StateError(
          'RELEASE BUILD CONFIGURATION ERROR: Release application cannot target emulator or local host ("$releaseUrl"). '
          'Provide a valid deployed HTTPS backend via --dart-define=BACKEND_BASE_URL=https://your-api.onrender.com/api',
        );
      }
      return releaseUrl;
    }

    if (envUrl.isNotEmpty) {
      return envUrl;
    }

    // Flutter web development fallback
    if (kIsWeb) {
      return 'http://localhost:4000/api';
    }

    switch (defaultTargetPlatform) {
      case TargetPlatform.android:
        return 'http://10.0.2.2:4000/api';
      case TargetPlatform.iOS:
      case TargetPlatform.macOS:
      case TargetPlatform.windows:
      case TargetPlatform.linux:
      case TargetPlatform.fuchsia:
        return 'http://127.0.0.1:4000/api';
    }
  }

  static const Duration splashDuration = Duration(seconds: 2);

  static const Duration transitionDuration = Duration(milliseconds: 450);
}

