import 'package:flutter/material.dart';
import '../utils/app_colors.dart';

/// Premium verification badge widget
class VerificationBadge extends StatelessWidget {
  const VerificationBadge({
    super.key,
    required this.status,
    this.size = 'medium',
  });

  final String status; // unverified, pending, verified, rejected
  final String size; // small, medium, large

  String get _normalizedStatus {
    final key = status.toLowerCase();
    if (key == 'under_review' || key == 'pending_review') {
      return 'pending';
    }
    return key;
  }

  Color _getStatusColor() {
    switch (_normalizedStatus) {
      case 'verified':
        return AppColors.success;
      case 'pending':
        return Colors.orange;
      case 'rejected':
        return Colors.red;
      default:
        return AppColors.textSecondary;
    }
  }

  IconData _getStatusIcon() {
    switch (_normalizedStatus) {
      case 'verified':
        return Icons.verified_outlined;
      case 'pending':
        return Icons.schedule_outlined;
      case 'rejected':
        return Icons.cancel_outlined;
      default:
        return Icons.radio_button_unchecked;
    }
  }

  String _getStatusLabel() {
    switch (_normalizedStatus) {
      case 'verified':
        return 'Verified';
      case 'pending':
        return 'Pending';
      case 'rejected':
        return 'Rejected';
      default:
        return 'Unverified';
    }
  }

  double _getSize() {
    switch (size) {
      case 'small':
        return 24;
      case 'large':
        return 40;
      default:
        return 32;
    }
  }

  double _getFontSize() {
    switch (size) {
      case 'small':
        return 11;
      case 'large':
        return 16;
      default:
        return 13;
    }
  }

  @override
  Widget build(BuildContext context) {
    if (size == 'small') {
      return Container(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
        decoration: BoxDecoration(
          color: _getStatusColor().withValues(alpha: 0.1),
          borderRadius: BorderRadius.circular(6),
          border: Border.all(color: _getStatusColor().withValues(alpha: 0.3)),
        ),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(_getStatusIcon(), size: 12, color: _getStatusColor()),
            const SizedBox(width: 4),
            Text(
              _getStatusLabel(),
              style: TextStyle(
                fontSize: _getFontSize(),
                fontWeight: FontWeight.w600,
                color: _getStatusColor(),
              ),
            ),
          ],
        ),
      );
    }

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: _getStatusColor().withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _getStatusColor().withValues(alpha: 0.2)),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(_getStatusIcon(), size: _getSize(), color: _getStatusColor()),
          const SizedBox(height: 8),
          Text(
            _getStatusLabel(),
            style: TextStyle(
              fontSize: _getFontSize(),
              fontWeight: FontWeight.w600,
              color: _getStatusColor(),
            ),
          ),
        ],
      ),
    );
  }
}
