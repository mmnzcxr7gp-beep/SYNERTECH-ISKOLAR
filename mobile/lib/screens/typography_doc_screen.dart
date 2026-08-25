import 'package:flutter/material.dart';
import '../utils/app_colors.dart';
import '../utils/app_typography.dart';

/// ISKOLAR Mobile Design System Typography Documentation Screen
class TypographyDocScreen extends StatelessWidget {
  const TypographyDocScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.nearBlack,
      appBar: AppBar(
        title: Text('Mobile Typography System', style: AppTypography.cardTitle(color: Colors.white)),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        children: [
          // Section 1: Font Families
          _buildSectionHeader('1. Font Pairing & Roles'),
          const SizedBox(height: 12),
          _buildFontCard(
            role: 'PRIMARY HEADING FONT',
            fontName: 'Manrope',
            weights: '800 (ExtraBold), 700 (Bold), 600 (SemiBold), 500 (Medium)',
            usage: 'Hero titles, page titles, cards, buttons, navigation',
            color: AppColors.primaryOrange,
            preview: Text('Manrope Display 800', style: AppTypography.h3(color: Colors.white)),
          ),
          const SizedBox(height: 12),
          _buildFontCard(
            role: 'SECONDARY CONTENT FONT',
            fontName: 'Source Sans 3',
            weights: '400 (Regular), 500 (Medium), 600 (SemiBold)',
            usage: 'Body copy, descriptions, input fields, labels, metadata',
            color: const Color(0xFF10B981),
            preview: Text('Source Sans 3 Regular Body Copy', style: AppTypography.body(color: Colors.white)),
          ),
          const SizedBox(height: 12),
          _buildFontCard(
            role: 'TECHNICAL MONOSPACE FONT',
            fontName: 'IBM Plex Mono',
            weights: '400 (Regular), 500 (Medium), 600 (SemiBold)',
            usage: 'Document IDs, audit references, file hashes, OCR confidence',
            color: const Color(0xFF818CF8),
            preview: Text('APP-2026-0891 • 98.4% CONF', style: AppTypography.technical(color: Colors.white)),
          ),

          const SizedBox(height: 28),

          // Section 2: Mobile Hierarchy
          _buildSectionHeader('2. Mobile Typography Hierarchy'),
          const SizedBox(height: 12),
          _buildHierarchyCard('Mobile Display', '36sp • Manrope 800', AppTypography.display(color: Colors.white)),
          _buildHierarchyCard('Mobile H1', '30sp • Manrope 700', AppTypography.h1(color: Colors.white)),
          _buildHierarchyCard('Mobile H2', '26sp • Manrope 700', AppTypography.h2(color: Colors.white)),
          _buildHierarchyCard('Mobile H3', '22sp • Manrope 600', AppTypography.h3(color: Colors.white)),
          _buildHierarchyCard('Mobile Card Title', '18sp • Manrope 600', AppTypography.cardTitle(color: Colors.white)),
          _buildHierarchyCard('Mobile Body Large', '18sp • Source Sans 3 400', AppTypography.bodyLarge(color: Colors.white)),
          _buildHierarchyCard('Mobile Body', '16sp • Source Sans 3 400', AppTypography.body(color: Colors.white)),
          _buildHierarchyCard('Mobile Secondary', '14sp • Source Sans 3 400', AppTypography.secondary(color: Colors.white70)),
          _buildHierarchyCard('Mobile Caption', '13sp • Source Sans 3 400', AppTypography.caption(color: Colors.white60)),
          _buildHierarchyCard('Mobile Button', '15sp • Manrope 600', AppTypography.button(color: AppColors.primaryOrange)),
          _buildHierarchyCard('Form Label', '14sp • Source Sans 3 600', AppTypography.formLabel(color: Colors.white)),

          const SizedBox(height: 28),

          // Section 3: OCR Review & Technical References
          _buildSectionHeader('3. OCR & Data Review Typography'),
          const SizedBox(height: 12),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: AppColors.elevatedBackground,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: AppColors.border),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text('OCR RAW EXTRACTED VALUE', style: AppTypography.caption(color: AppColors.textMuted)),
                const SizedBox(height: 4),
                Text('GWA: 1.250 (Confidence: 94.2%)', style: AppTypography.technical(fontSize: 14, color: AppColors.primaryOrange)),
                const SizedBox(height: 12),
                Text('STUDENT CONFIRMED VALUE', style: AppTypography.caption(color: AppColors.textMuted)),
                const SizedBox(height: 4),
                Text('General Weighted Average: 1.25', style: AppTypography.body(color: Colors.white)),
                const SizedBox(height: 12),
                Text('SYSTEM AUDIT IDENTIFIER', style: AppTypography.caption(color: AppColors.textMuted)),
                const SizedBox(height: 4),
                Text('DOC-REF: apps/154/docs/cor_v1.pdf', style: AppTypography.technical(fontSize: 12, color: Colors.white70)),
              ],
            ),
          ),
          const SizedBox(height: 32),
        ],
      ),
    );
  }

  Widget _buildSectionHeader(String title) {
    return Text(
      title,
      style: AppTypography.h3(color: Colors.white),
    );
  }

  Widget _buildFontCard({
    required String role,
    required String fontName,
    required String weights,
    required String usage,
    required Color color,
    required Widget preview,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.elevatedBackground,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(role, style: AppTypography.caption(color: color).copyWith(fontWeight: FontWeight.w700, fontSize: 11)),
              Text(fontName, style: AppTypography.technical(fontSize: 11, color: AppColors.textMuted)),
            ],
          ),
          const SizedBox(height: 8),
          preview,
          const SizedBox(height: 8),
          Text(usage, style: AppTypography.caption(color: AppColors.textSecondary)),
          const SizedBox(height: 4),
          Text('Weights: $weights', style: AppTypography.technical(fontSize: 10.5, color: AppColors.textMuted)),
        ],
      ),
    );
  }

  Widget _buildHierarchyCard(String label, String specs, TextStyle style) {
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.elevatedBackground,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: AppColors.border.withValues(alpha: 0.5)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          Expanded(
            flex: 2,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(label, style: style, maxLines: 1, overflow: TextOverflow.ellipsis),
                Text(specs, style: AppTypography.technical(fontSize: 11, color: AppColors.textMuted)),
              ],
            ),
          ),
        ],
      ),
    );
  }
}
