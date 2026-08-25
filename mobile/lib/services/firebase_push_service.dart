import 'package:firebase_core/firebase_core.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import 'package:flutter/foundation.dart';
import 'api_service.dart';
import 'notification_service.dart';

/// Top-level background message handler for FCM
@pragma('vm:entry-point')
Future<void> firebaseMessagingBackgroundHandler(RemoteMessage message) async {
  debugPrint('📬 Background FCM message received: ${message.messageId}');
}

class FirebasePushService {
  static final FirebasePushService _instance = FirebasePushService._internal();

  factory FirebasePushService() {
    return _instance;
  }

  FirebasePushService._internal();

  bool _initialized = false;
  String? _token;

  String? get token => _token;

  /// Initialize Firebase Push Notifications
  Future<void> initialize(String token) async {
    if (_initialized) return;

    try {
      // 1. Try to initialize Firebase
      if (Firebase.apps.isEmpty) {
        await Firebase.initializeApp();
      }

      final messaging = FirebaseMessaging.instance;

      // Register background message handler
      FirebaseMessaging.onBackgroundMessage(firebaseMessagingBackgroundHandler);

      // 2. Request permissions (iOS and Android 13+)
      final settings = await messaging.requestPermission(
        alert: true,
        announcement: false,
        badge: true,
        carPlay: false,
        criticalAlert: false,
        provisional: false,
        sound: true,
      );

      if (settings.authorizationStatus == AuthorizationStatus.authorized) {
        debugPrint('✓ Firebase Messaging permission granted');
      } else if (settings.authorizationStatus == AuthorizationStatus.provisional) {
        debugPrint('✓ Firebase Messaging provisional permission granted');
      } else {
        debugPrint('✗ Firebase Messaging permission denied');
        return;
      }

      // 3. Get token
      _token = await messaging.getToken();
      if (_token != null) {
        debugPrint('✓ FCM Device Token: $_token');
        await registerTokenWithBackend(token, _token!);
      }

      // 4. Token refresh listener
      messaging.onTokenRefresh.listen((newToken) async {
        _token = newToken;
        await registerTokenWithBackend(token, newToken);
      });

      // 5. Foreground messages listener
      FirebaseMessaging.onMessage.listen((RemoteMessage message) {
        debugPrint('📬 Received foreground FCM message: ${message.messageId}');
        _handleIncomingMessage(message);
      });

      // 6. Background/Terminated notification tap listener
      FirebaseMessaging.onMessageOpenedApp.listen((RemoteMessage message) {
        debugPrint('📬 App opened via FCM message: ${message.messageId}');
      });

      _initialized = true;
    } catch (e) {
      // Gracefully degrade when Firebase is not configured (e.g., missing google-services.json)
      debugPrint('⚠️ Firebase Push Service initialization skipped or failed: $e');
      debugPrint('   Make sure Firebase is configured via `flutterfire configure`.');
    }
  }

  /// Register FCM token with backend API
  Future<void> registerTokenWithBackend(String authToken, String deviceToken) async {
    try {
      debugPrint('📡 Registering device token with backend...');
      final platform = kIsWeb
          ? 'web'
          : defaultTargetPlatform == TargetPlatform.iOS
              ? 'ios'
              : 'android';

      await ApiService.post(
        '/users/device-token',
        token: authToken,
        body: {
          'token': deviceToken,
          'platform': platform,
        },
      );
      debugPrint('✓ Device token registered successfully');
    } catch (e) {
      debugPrint('✗ Failed to register device token with backend: $e');
    }
  }

  /// Process incoming FCM message and route to local notification service
  void _handleIncomingMessage(RemoteMessage message) {
    try {
      final notification = message.notification;
      if (notification == null) return;

      final title = notification.title ?? 'New Notification';
      final body = notification.body ?? '';
      final data = message.data;

      // Extract custom type or default to adminAlert
      NotificationType type = NotificationType.adminAlert;
      final typeStr = data['type'] as String?;
      
      if (typeStr != null) {
        if (typeStr.contains('approved')) {
          type = NotificationType.verificationApproved;
        } else if (typeStr.contains('rejected')) {
          type = NotificationType.verificationRejected;
        } else if (typeStr.contains('completed')) {
          type = NotificationType.transactionCompleted;
        }
      }

      // Add to local service
      NotificationService().addNotification(
        title: title,
        message: body,
        type: type,
        data: data,
      );
    } catch (e) {
      debugPrint('✗ Error handling incoming FCM message: $e');
    }
  }
}
