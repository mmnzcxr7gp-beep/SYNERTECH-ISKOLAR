import 'package:flutter/foundation.dart';

/// App-level constants and text.
class AppConstants {
  static const String appName = 'ISKOLAR';

  static const String slogan = 'Connecting Students to Opportunities';

  static final String backendBaseUrl = _buildBackendUrl();

  static String _buildBackendUrl() {
    const envUrl = String.fromEnvironment('BACKEND_BASE_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }

    // Flutter web must default to the deployed backend.
    // If BACKEND_BASE_URL is not provided at build/runtime, fall back to Vercel backend.
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

