import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../utils/app_typography.dart';
import '../utils/app_spacing.dart';

/// ISKOLAR Mobile Design System Typography Documentation Screen (Fluent 2 & Apple HIG inspired)
class TypographyDocScreen extends StatelessWidget {
  const TypographyDocScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = isDark ? AppColors.background : AppColors.backgroundLight;
    final textColor = isDark ? AppColors.textPrimary : AppColors.lightTextPrimary;
    final cardBg = isDark ? AppColors.surface : AppColors.surfaceLight;
    final borderColor = isDark ? AppColors.border : AppColors.lightBorder;

    return Scaffold(
      backgroundColor: bgColor,
      appBar: AppBar(
        title: Text('Mobile Typography System', style: AppTypography.cardTitle(color: textColor)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: AppSpacing.screenHorizontal, vertical: 16),
        children: [
          // Section 1: Typography System
          _buildSectionHeader('1. Typography System & Typeface', textColor),
          const SizedBox(height: 12),
          _buildFontCard(
            role: 'NATIVE SYSTEM TYPEFACE',
            fontName: 'System Sans-Serif (Roboto / SF Pro)',
            weights: 'Regular (400), Medium (500), Semibold (600), Bold (700)',
            usage: 'All screens, titles, body copy, forms, buttons, and navigation',
            color: AppColors.primaryOrange,
            cardBg: cardBg,
            borderColor: borderColor,
            textColor: textColor,
            preview: Text('Enterprise Clarity & Usability', style: AppTypography.sectionTitle(color: textColor)),
          ),

          const SizedBox(height: 24),

          // Section 2: Standardized Mobile Type Scale
          _buildSectionHeader('2. Standardized Mobile Type Scale', textColor),
          const SizedBox(height: 12),
          _buildHierarchyCard('Screen Title', '28sp / 34sp • Semibold (600)', AppTypography.screenTitle(color: textColor), cardBg, borderColor),
          _buildHierarchyCard('Section Title', '20sp / 26sp • Semibold (600)', AppTypography.sectionTitle(color: textColor), cardBg, borderColor),
          _buildHierarchyCard('Card Title', '17sp / 24sp • Semibold (600)', AppTypography.cardTitle(color: textColor), cardBg, borderColor),
          _buildHierarchyCard('Body Text', '16sp / 24sp • Regular (400)', AppTypography.body(color: textColor), cardBg, borderColor),
          _buildHierarchyCard('Secondary Body', '14sp / 20sp • Regular (400)', AppTypography.secondaryBody(color: textColor), cardBg, borderColor),
          _buildHierarchyCard('Form Label', '14sp / 20sp • Medium (500)', AppTypography.label(color: textColor), cardBg, borderColor),
          _buildHierarchyCard('Caption / Metadata', '12sp / 16sp • Regular (400)', AppTypography.caption(color: isDark ? AppColors.textMuted : AppColors.lightTextMuted), cardBg, borderColor),

          const SizedBox(height: 24),

          // Section 3: Status Indicators (WCAG 2.2 AA)
          _buildSectionHeader('3. Semantic Status Indicators', textColor),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(AppSpacing.cardPadding),
            decoration: BoxDecoration(
              color: cardBg,
              borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
              border: Border.all(color: borderColor),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                _buildStatusRow('✓ Verified', AppColors.success, AppColors.successBg, 'Document successfully verified by authorized Provider.'),
                const Divider(height: 20),
                _buildStatusRow('⏱ Pending Review', AppColors.warning, AppColors.warningBg, 'Awaiting human review from Provider.'),
                const Divider(height: 20),
                _buildStatusRow('✗ Rejected', AppColors.danger, AppColors.dangerBg, 'Does not meet program eligibility criteria.'),
                const Divider(height: 20),
                _buildStatusRow('ℹ Resubmission Required', AppColors.information, AppColors.infoBg, 'Please upload a clearer copy of this document.'),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title, Color textColor) {
    return Text(
      title,
      style: AppTypography.sectionTitle(color: textColor),
    );
  }

  Widget _buildFontCard({
    required String role,
    required String fontName,
    required String weights,
    required String usage,
    required Color color,
    required Color cardBg,
    required Color borderColor,
    required Color textColor,
    required Widget preview,
  }) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusCard),
        border: Border.all(color: borderColor),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(role, style: AppTypography.caption(color: color).copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
          const SizedBox(height: 8),
          preview,
          const SizedBox(height: 8),
          Text(fontName, style: AppTypography.cardTitle(color: textColor)),
          const SizedBox(height: 4),
          Text('Weights: $weights', style: AppTypography.secondaryBody(color: textColor)),
          const SizedBox(height: 4),
          Text('Usage: $usage', style: AppTypography.caption()),
        ],
      ),
    );
  }

  Widget _buildHierarchyCard(String role, String spec, TextStyle style, Color cardBg, Color borderColor) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: cardBg,
        borderRadius: BorderRadius.circular(AppSpacing.radiusControl),
        border: Border.all(color: borderColor),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(role, style: style),
                const SizedBox(height: 2),
                Text(spec, style: AppTypography.caption()),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatusRow(String label, Color color, Color bgColor, String desc) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(
            color: bgColor,
            borderRadius: BorderRadius.circular(999),
            border: Border.all(color: color.withValues(alpha: 0.3)),
          ),
          child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: Text(desc, style: AppTypography.secondaryBody()),
        ),
      ],
    );
  }
}
