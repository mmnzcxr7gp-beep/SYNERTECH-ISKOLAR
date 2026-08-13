import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';

import 'screens/splash_screen.dart';
import 'utils/app_constants.dart';
import 'utils/app_theme.dart';
import 'utils/theme_provider.dart';

import 'package:sentry_flutter/sentry_flutter.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Pillar 1 & 12: Global UI & Async Error Boundary Protection
  FlutterError.onError = (FlutterErrorDetails details) {
    FlutterError.presentError(details);
    Sentry.captureException(details.exception, stackTrace: details.stack);
    // ignore: avoid_print
    print('🛡️ [FLUTTER UI ERROR CAUGHT]: ${details.exception}');
  };

  PlatformDispatcher.instance.onError = (Object error, StackTrace stack) {
    Sentry.captureException(error, stackTrace: stack);
    // ignore: avoid_print
    print('🛡️ [ASYNC PLATFORM ERROR CAUGHT]: $error');
    return true; // Prevents process termination
  };

  // ignore: avoid_print
  print(
    '[AppStartup] platform=${kIsWeb ? 'web' : defaultTargetPlatform} backend=${AppConstants.backendBaseUrl}',
  );

  runApp(
    ChangeNotifierProvider(
      create: (_) => ThemeProvider(),
      child: const MyApp(),
    ),
  );

  // Initialize Sentry telemetry in background safely
  // NOTE: Replace the placeholder DSN below with your real Sentry project DSN.
  // Sentry init is skipped when the DSN contains placeholder values.
  const sentryDsn = 'https://47721864195147819142858605891395@o4500000000000000.ingest.sentry.io/4500000000000000';
  final isPlaceholderDsn = sentryDsn.contains('o4500000000000000');
  if (!isPlaceholderDsn) {
    try {
      await SentryFlutter.init(
        (options) {
          options.dsn = sentryDsn;
          options.tracesSampleRate = 1.0;
        },
      );
    } catch (e) {
      // ignore: avoid_print
      print('⚠️ Sentry mobile init notice: $e');
    }
  }
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeProvider = Provider.of<ThemeProvider>(context);

    return MaterialApp(
      title: 'ISKOLAR',
      theme: AppTheme.lightTheme,
      darkTheme: AppTheme.theme,
      themeMode: themeProvider.themeMode,
      debugShowCheckedModeBanner: false,
      home: const SplashScreen(),
    );
  }
}
