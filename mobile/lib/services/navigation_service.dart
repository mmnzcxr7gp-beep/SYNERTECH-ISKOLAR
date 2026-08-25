import 'package:flutter/material.dart';

import '../utils/app_constants.dart';

/// Central place for dummy navigation helpers.
class NavigationService {
  static Future<T?> pushFade<T>(
    BuildContext context,
    Widget page, {
    Object? arguments,
  }) {
    return Navigator.of(context).push(
      PageRouteBuilder(
        pageBuilder: (routeContext, animation, secondaryAnimation) => page,
        settings: RouteSettings(arguments: arguments),
        transitionDuration: AppConstants.transitionDuration,
        reverseTransitionDuration: AppConstants.transitionDuration,
        transitionsBuilder: (routeContext, animation, secondaryAnimation, child) {
          const curve = Curves.easeOutCubic;
          final fade = CurvedAnimation(parent: animation, curve: curve);
          return FadeTransition(opacity: fade, child: child);
        },
      ),
    );
  }

  static Future<void> pushReplacementFade(
    BuildContext context,
    Widget page, {
    Object? arguments,
  }) {
    return Navigator.of(context).pushReplacement(
      PageRouteBuilder(
        pageBuilder: (routeContext, animation, secondaryAnimation) => page,
        settings: RouteSettings(arguments: arguments),
        transitionDuration: AppConstants.transitionDuration,
        reverseTransitionDuration: AppConstants.transitionDuration,
        transitionsBuilder: (routeContext, animation, secondaryAnimation, child) {
          const curve = Curves.easeInOutCubic;
          final fade = CurvedAnimation(parent: animation, curve: curve);
          return FadeTransition(opacity: fade, child: child);
        },
      ),
    );
  }
}

