import 'package:flutter/material.dart';

import '../services/auth_service.dart';
import '../services/transaction_service.dart';
import '../utils/app_colors.dart';
import '../utils/app_typography.dart';

class TransactionHistoryScreen extends StatefulWidget {
  const TransactionHistoryScreen({super.key});

  @override
  State<TransactionHistoryScreen> createState() => _TransactionHistoryScreenState();
}

class _TransactionHistoryScreenState extends State<TransactionHistoryScreen> {
  bool _isLoading = true;
  List<Map<String, dynamic>> _transactions = [];
  String _selectedFilter = 'all';
  int _currentPage = 1;
  final int _pageSize = 10;

  @override
  void initState() {
    super.initState();
    _loadTransactions();
  }

  Future<void> _loadTransactions() async {
    setState(() => _isLoading = true);
    try {
      final token = await AuthService.getToken();
      if (token == null) return;

      final response = await TransactionService.getStudentTransactions(
        token: token,
        status: _selectedFilter == 'all' ? null : _selectedFilter,
        page: _currentPage,
        limit: _pageSize,
      );

      setState(() {
        _transactions =
            List<Map<String, dynamic>>.from(response['transactions'] ?? []);
      });
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading transactions: $e')),
        );
      }
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scaffoldBg = isDark ? AppColors.darkBackground : AppColors.mainBackground;
    final titleColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: Text(
          'Transaction History',
          style: AppTypography.cardTitle(color: titleColor),
        ),
      ),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
          child: Center(
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 520),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Filter tabs
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    padding:
                        const EdgeInsets.symmetric(horizontal: 0, vertical: 6),
                    child: Row(
                      children: [
                        _buildFilterChip('all', 'All', isDark),
                        const SizedBox(width: 8),
                        _buildFilterChip('completed', 'Completed', isDark),
                        const SizedBox(width: 8),
                        _buildFilterChip('pending', 'Pending', isDark),
                        const SizedBox(width: 8),
                        _buildFilterChip('failed', 'Failed', isDark),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),

                  // Transactions list
                  Expanded(
                    child: _isLoading
                        ? const Center(child: CircularProgressIndicator())
                        : _transactions.isEmpty
                            ? Center(
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Icon(
                                      Icons.receipt_long_outlined,
                                      size: 64,
                                      color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                                    ),
                                    const SizedBox(height: 16),
                                    Text(
                                      'No transactions found',
                                      style: AppTypography.secondary(
                                        color: isDark ? AppColors.darkTextSecondary : AppColors.secondaryText,
                                      ),
                                    ),
                                  ],
                                ),
                              )
                            : ListView.builder(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 0),
                                itemCount: _transactions.length,
                                itemBuilder: (context, index) {
                                  final transaction = _transactions[index];
                                  return RepaintBoundary(
                                    child: _buildTransactionTile(transaction, isDark),
                                  );
                                },
                              ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildFilterChip(String value, String label, bool isDark) {
    final isSelected = _selectedFilter == value;
    final unselectedLabelColor = isDark ? AppColors.darkTextSecondary : AppColors.primaryNavy;
    final unselectedBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final borderColor = isSelected
        ? AppColors.actionBlue
        : (isDark ? AppColors.darkBorder : AppColors.border);

    return FilterChip(
      label: Text(
        label,
        style: AppTypography.caption(
          color: isSelected ? Colors.white : unselectedLabelColor,
        ),
      ),
      selected: isSelected,
      onSelected: (selected) {
        setState(() {
          _selectedFilter = value;
          _currentPage = 1;
        });
        _loadTransactions();
      },
      backgroundColor: unselectedBg,
      selectedColor: AppColors.actionBlue,
      side: BorderSide(color: borderColor),
    );
  }

  Widget _buildTransactionTile(Map<String, dynamic> transaction, bool isDark) {
    final status = transaction['status'] as String? ?? 'unknown';
    final amount = transaction['amount'] as num? ?? 0;
    final date = transaction['createdAt'] as String?;
    final type = transaction['transactionType'] as String? ?? 'unknown';
    final referenceNumber =
        transaction['referenceNumber'] as String? ?? '-';

    final statusColor = _getStatusColor(status);
    final statusIcon = _getStatusIcon(status);

    final cardBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.border;
    final textPrimary = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final textSecondary = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        border: Border.all(color: cardBorder),
        borderRadius: BorderRadius.circular(16),
        color: cardBg,
        boxShadow: [
          BoxShadow(
            color: isDark
                ? Colors.black.withValues(alpha: 0.15)
                : const Color(0xFF15265C).withValues(alpha: 0.04),
            blurRadius: 8,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      _formatTransactionType(type),
                      style: AppTypography.cardTitle(color: textPrimary).copyWith(fontSize: 14),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      'Ref: $referenceNumber',
                      style: AppTypography.technical(
                        fontSize: 12,
                        color: textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Text(
                    'PHP ${amount.toStringAsFixed(2)}',
                    style: AppTypography.cardTitle(color: textPrimary).copyWith(fontSize: 14),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: statusColor.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(6),
                    ),
                    child: Row(
                      children: [
                        Icon(statusIcon, size: 12, color: statusColor),
                        const SizedBox(width: 4),
                        Text(
                          status.toUpperCase(),
                          style: AppTypography.caption(
                            color: statusColor,
                          ).copyWith(fontWeight: FontWeight.w700, fontSize: 10.5),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 12),
          if (date != null)
            Text(
              date,
              style: AppTypography.caption(
                color: textSecondary,
              ),
            ),
        ],
      ),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'completed':
        return AppColors.success;
      case 'pending':
      case 'processing':
        return AppColors.warning;
      case 'failed':
      case 'cancelled':
        return AppColors.error;
      default:
        return AppColors.textSecondaryDark;
    }
  }

  IconData _getStatusIcon(String status) {
    switch (status) {
      case 'completed':
        return Icons.check_circle_outline;
      case 'pending':
      case 'processing':
        return Icons.pending_actions;
      case 'failed':
      case 'cancelled':
        return Icons.cancel_outlined;
      default:
        return Icons.help_outline;
    }
  }

  String _formatTransactionType(String type) {
    final parts = type.split('_');
    return parts
        .map((part) => part.isEmpty ? part : (part[0].toUpperCase() + part.substring(1)))
        .join(' ');
  }
}

