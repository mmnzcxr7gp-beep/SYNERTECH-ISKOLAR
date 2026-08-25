import 'package:flutter/material.dart';

import '../services/verification_service.dart';
import '../utils/app_colors.dart';

/// Luxury verification banner + related widgets.
/// Strictly uses ISKOLAR luxury palette: ultra-dark + deep navy surfaces + electric cyan accents.
/// No amber/gold/orange styling.
class VerificationStatusBanner extends StatelessWidget {
  final VerificationStatus status;
  final VoidCallback? onVerifyPressed;

  const VerificationStatusBanner({
    super.key,
    required this.status,
    this.onVerifyPressed,
  });

  @override
  Widget build(BuildContext context) {
    final bool isVerified = status.isVerified;

    Color bg;
    Color border;
    Widget leading;
    String title;
    String body;
    Widget? cta;

    if (isVerified) {
      bg = AppColors.primary.withValues(alpha: 0.10);
      border = AppColors.primary.withValues(alpha: 0.65);
      leading = const Icon(
        Icons.verified_rounded,
        color: AppColors.primary,
        size: 24,
      );
      title = 'Verified';
      body = 'Your account has been verified. All features are now available.';
    } else if (status.status == 'pending') {
      // pending: still use cyan (luxury neutral), never orange.
      bg = AppColors.primary.withValues(alpha: 0.08);
      border = AppColors.primary.withValues(alpha: 0.55);
      leading = const Icon(
        Icons.schedule_rounded,
        color: AppColors.primary,
        size: 24,
      );
      title = 'Verification in Review';
      body =
          'Your account is pending admin review. Some features may be temporarily limited.';

      if (status.submittedAt != null) {
        body =
            'Your account is pending admin review. Submitted: ${status.submittedAt?.toString().split(' ')[0]}';
      }
    } else if (status.status == 'rejected') {
      // rejected: use a deep red surface tint, not amber.
      bg = const Color(0xFFEF4444).withValues(alpha: 0.10);
      border = const Color(0xFFEF4444).withValues(alpha: 0.65);
      leading = const Icon(
        Icons.cancel_rounded,
        color: Color(0xFFEF4444),
        size: 24,
      );
      title = 'Verification Rejected';
      body =
          status.rejectionReason ??
          'Your verification was rejected. Please resubmit.';

      if (onVerifyPressed != null) {
        cta = ElevatedButton(
          onPressed: onVerifyPressed,
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFFEF4444),
            foregroundColor: AppColors.textPrimary,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
          child: const Text(
            'Resubmit',
            style: TextStyle(fontSize: 12, fontWeight: FontWeight.w800),
          ),
        );
      }
    } else {
      bg = AppColors.surface;
      border = AppColors.border.withValues(alpha: 0.10);
      leading = const Icon(
        Icons.info_rounded,
        color: AppColors.primary,
        size: 24,
      );
      title = 'Complete Your Verification';
      body =
          'Verify your account to unlock all features and receive allowances.';

      if (onVerifyPressed != null) {
        cta = OutlinedButton.icon(
          onPressed: onVerifyPressed,
          icon: const Icon(Icons.lock_open_rounded, color: AppColors.primary),
          label: const Text('Start Verification'),
          style: OutlinedButton.styleFrom(
            foregroundColor: AppColors.primary,
            side: BorderSide(color: AppColors.primary.withValues(alpha: 0.65)),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(14),
            ),
          ),
        );
      }
    }

    return Container(
      padding: const EdgeInsets.all(12),
      margin: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: border, width: 1.5),
        borderRadius: BorderRadius.circular(14),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Padding(padding: const EdgeInsets.only(top: 2), child: leading),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  body,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary.withValues(alpha: 0.95),
                    height: 1.25,
                  ),
                ),
                if (cta != null) ...[const SizedBox(height: 10), cta],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Badge widget (single-icon) to show verification state.
class VerificationStatusBadge extends StatelessWidget {
  final VerificationStatus status;
  final double size;

  const VerificationStatusBadge({
    super.key,
    required this.status,
    this.size = 24,
  });

  @override
  Widget build(BuildContext context) {
    final Widget icon;

    if (status.isVerified) {
      icon = const Icon(
        Icons.verified_rounded,
        color: AppColors.primary,
        size: 24,
      );
    } else if (status.status == 'pending') {
      icon = const Icon(
        Icons.schedule_rounded,
        color: AppColors.primary,
        size: 24,
      );
    } else if (status.status == 'rejected') {
      icon = const Icon(
        Icons.cancel_rounded,
        color: Color(0xFFEF4444),
        size: 24,
      );
    } else {
      icon = const Icon(
        Icons.warning_rounded,
        color: AppColors.textSecondary,
        size: 24,
      );
    }

    return Tooltip(
      message: status.isVerified
          ? 'Verified'
          : status.status == 'pending'
          ? 'Pending'
          : status.status == 'rejected'
          ? 'Rejected'
          : 'Not Verified',
      child: icon,
    );
  }
}

/// Widget to disable features for unverified users.
class VerificationLockedWidget extends StatelessWidget {
  final Widget child;
  final bool isVerified;
  final String? message;

  const VerificationLockedWidget({
    super.key,
    required this.child,
    required this.isVerified,
    this.message,
  });

  @override
  Widget build(BuildContext context) {
    if (isVerified) return child;

    return Stack(
      children: [
        Opacity(opacity: 0.55, child: IgnorePointer(child: child)),
        Center(
          child: Container(
            width: double.infinity,
            margin: const EdgeInsets.symmetric(horizontal: 18),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.surface.withValues(alpha: 0.9),
              border: Border.all(
                color: AppColors.primary.withValues(alpha: 0.55),
                width: 1.5,
              ),
              borderRadius: BorderRadius.circular(16),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                const Icon(
                  Icons.lock_outline_rounded,
                  size: 34,
                  color: AppColors.primary,
                ),
                const SizedBox(height: 10),
                Text(
                  message ?? 'Feature Locked',
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: AppColors.textPrimary,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  'Complete verification to use this feature',
                  textAlign: TextAlign.center,
                  style: TextStyle(
                    fontSize: 12,
                    color: AppColors.textSecondary.withValues(alpha: 0.9),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}
