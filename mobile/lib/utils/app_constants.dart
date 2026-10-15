import 'package:flutter/foundation.dart';

/// App-level constants and text.
class AppConstants {
  static const String appName = 'ISKOLAR';

  static const String slogan = 'Connecting Students to Opportunities';

  /// Primary deployed HTTPS backend URL (Vercel Singapore edge CDN)
  static const String primaryProductionUrl = 'https://client-gamma-hazel-97.vercel.app/api';

  /// Direct Render backend fallback
  static const String fallbackProductionUrl = 'https://iskolar-api.onrender.com/api';

  /// Currently active backend base URL. Mutable so ApiService can dynamically
  /// fail over to working endpoints during transient network issues.
  static String backendBaseUrl = _buildBackendUrl();

  /// Fallback candidates list for automatic network failover
  static List<String> fallbackBackendUrls = _buildFallbackUrls();

  static String _buildBackendUrl() {
    const envUrl = String.fromEnvironment('BACKEND_BASE_URL');
    if (envUrl.isNotEmpty) {
      return envUrl;
    }

    if (kReleaseMode) {
      return primaryProductionUrl;
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

  static List<String> _buildFallbackUrls() {
    final list = <String>[];
    final candidates = [
      'https://iskolar.org/api',
      'https://api.iskolar.org/api',
      primaryProductionUrl,
      fallbackProductionUrl,
      'http://10.0.2.2:4000/api',
      'http://localhost:4000/api',
    ];
    for (final c in candidates) {
      if (c != backendBaseUrl && !list.contains(c)) {
        list.add(c);
      }
    }
    return list;
  }

  static const Duration splashDuration = Duration(seconds: 2);

  static const Duration transitionDuration = Duration(milliseconds: 450);
}

