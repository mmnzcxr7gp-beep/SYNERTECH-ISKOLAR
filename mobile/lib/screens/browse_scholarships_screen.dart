import 'dart:async';
import 'package:flutter/material.dart';

import '../models/scholarship_model.dart';
import '../services/scholarship_service.dart';
import '../utils/app_colors.dart';
import 'scholarship_detail_screen.dart';

class BrowseScholarshipsScreen extends StatefulWidget {
  const BrowseScholarshipsScreen({
    super.key,
    required this.token,
  });

  final String token;

  @override
  State<BrowseScholarshipsScreen> createState() =>
      _BrowseScholarshipsScreenState();
}

class _BrowseScholarshipsScreenState
    extends State<BrowseScholarshipsScreen> with WidgetsBindingObserver {
  final _searchController = TextEditingController();

  String _query = '';
  bool _loading = true;
  String? _error;
  List<Scholarship> _items = [];
  
  Timer? _autoRefreshTimer;
  AppLifecycleState _lastLifecycleState = AppLifecycleState.resumed;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _startAutoRefresh();
  }

  void _startAutoRefresh() {
    _autoRefreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (_lastLifecycleState == AppLifecycleState.resumed && mounted) {
        _load();
      }
    });
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    super.didChangeAppLifecycleState(state);
    _lastLifecycleState = state;
  }

  @override
  void dispose() {
    _autoRefreshTimer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    _searchController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final data = await ScholarshipService.browseScholarships(
        token: widget.token,
      );

      data.sort((a, b) => b.createdAt.compareTo(a.createdAt));

      setState(() {
        _items = data;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
        });
      }
    }
  }

  List<Scholarship> get _filtered {
    final q = _query.trim().toLowerCase();

    if (q.isEmpty) return _items;

    return _items.where((s) {
      return s.title.toLowerCase().contains(q) ||
          s.description.toLowerCase().contains(q) ||
          s.sponsorName.toLowerCase().contains(q);
    }).toList();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 540),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                const Text(
                  'BROWSE SCHOLARSHIPS',
                  style: TextStyle(
                    fontSize: 22,
                    fontWeight: FontWeight.w900,
                    color: AppColors.floralWhite,
                    letterSpacing: 1.1,
                  ),
                ),
                const SizedBox(height: 6),
                const Text(
                  'Discover verified scholarships. Tap any opportunity to view requirements and apply.',
                  style: TextStyle(
                    fontSize: 13.5,
                    color: AppColors.textSecondary,
                    height: 1.4,
                  ),
                ),
                const SizedBox(height: 16),

                TextField(
                  controller: _searchController,
                  onChanged: (value) => setState(() => _query = value),
                  style: const TextStyle(
                    color: AppColors.floralWhite,
                    fontWeight: FontWeight.w600,
                  ),
                  decoration: InputDecoration(
                    hintText: 'Search by scholarship or sponsor...',
                    hintStyle: const TextStyle(color: AppColors.textSecondary, fontSize: 14),
                    prefixIcon: const Icon(Icons.search, color: AppColors.antiqueBrass),
                    suffixIcon: _query.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, color: AppColors.antiqueBrass),
                            onPressed: () {
                              _searchController.clear();
                              setState(() => _query = '');
                            },
                          )
                        : null,
                  ),
                ),

                const SizedBox(height: 16),

                if (_loading)
                  const Expanded(
                    child: Center(
                      child: CircularProgressIndicator(color: AppColors.antiqueBrass),
                    ),
                  )
                else if (_error != null)
                  Expanded(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.error_outline,
                            size: 48,
                            color: AppColors.antiqueBrass,
                          ),
                          const SizedBox(height: 12),
                          const Text(
                            'Failed to load scholarships',
                            style: TextStyle(color: AppColors.floralWhite, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 8),
                          Text(
                            _error!,
                            style: const TextStyle(color: AppColors.textSecondary, fontSize: 12),
                            textAlign: TextAlign.center,
                          ),
                          const SizedBox(height: 16),
                          ElevatedButton(
                            onPressed: _load,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: AppColors.spaceCadet,
                              foregroundColor: AppColors.floralWhite,
                            ),
                            child: const Text('Try Again'),
                          ),
                        ],
                      ),
                    ),
                  )
                else if (_filtered.isEmpty)
                  Expanded(
                    child: Center(
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(
                            Icons.search_off,
                            size: 48,
                            color: AppColors.antiqueBrass,
                          ),
                          const SizedBox(height: 12),
                          Text(
                            _query.isEmpty
                                ? 'No scholarships available yet'
                                : 'No matches found',
                            style: const TextStyle(
                              color: AppColors.floralWhite,
                              fontWeight: FontWeight.bold,
                              fontSize: 16,
                            ),
                          ),
                        ],
                      ),
                    ),
                  )
                else
                  Expanded(
                    child: RefreshIndicator(
                      onRefresh: _load,
                      color: AppColors.antiqueBrass,
                      child: ListView.separated(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        itemCount: _filtered.length,
                        separatorBuilder: (_, _) => const SizedBox(height: 12),
                        itemBuilder: (context, index) {
                          final scholarship = _filtered[index];
                          return _ScholarshipCard(
                            scholarship: scholarship,
                            token: widget.token,
                          );
                        },
                      ),
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ScholarshipCard extends StatelessWidget {
  const _ScholarshipCard({
    required this.scholarship,
    required this.token,
  });

  final Scholarship scholarship;
  final String token;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(20),
        onTap: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (_) => ScholarshipDetailScreen(
                scholarship: scholarship,
                token: token,
                alreadyApplied: false,
              ),
            ),
          );
        },
        child: Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surface,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: AppColors.antiqueBrass.withValues(alpha: 0.3),
            ),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.15),
                blurRadius: 12,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          scholarship.sponsorName.toUpperCase(),
                          style: const TextStyle(
                            color: AppColors.desertSand,
                            fontWeight: FontWeight.w800,
                            fontSize: 11,
                            letterSpacing: 0.8,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          scholarship.title,
                          style: const TextStyle(
                            color: AppColors.floralWhite,
                            fontWeight: FontWeight.w800,
                            fontSize: 16,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 8),
                  const Icon(
                    Icons.arrow_forward_ios_rounded,
                    size: 16,
                    color: AppColors.antiqueBrass,
                  ),
                ],
              ),
              const SizedBox(height: 10),
              if (scholarship.description.isNotEmpty)
                Text(
                  scholarship.description,
                  style: const TextStyle(
                    color: AppColors.textSecondary,
                    fontSize: 13,
                    height: 1.4,
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                ),
              const SizedBox(height: 14),
              Wrap(
                spacing: 8,
                runSpacing: 8,
                children: [
                  const _StatusChip(
                    icon: Icons.verified_rounded,
                    label: 'VERIFIED SPONSOR',
                    color: AppColors.spaceCadet,
                    textColor: AppColors.desertSand,
                  ),
                  if (scholarship.requirements.isNotEmpty)
                    _StatusChip(
                      icon: Icons.assignment_turned_in_rounded,
                      label: '${scholarship.requirements.length} REQUIREMENTS',
                      color: AppColors.antiqueBrass.withValues(alpha: 0.2),
                      textColor: AppColors.floralWhite,
                    ),
                ],
              ),
              const SizedBox(height: 14),
              Row(
                children: [
                  _InfoBadge(
                    icon: Icons.calendar_today_rounded,
                    label: 'DEADLINE',
                    value: scholarship.deadline,
                  ),
                  const SizedBox(width: 10),
                  _InfoBadge(
                    icon: Icons.confirmation_number_rounded,
                    label: 'SLOTS LEFT',
                    value: '${scholarship.slots}',
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _StatusChip extends StatelessWidget {
  const _StatusChip({
    required this.icon,
    required this.label,
    required this.color,
    this.textColor,
  });

  final IconData icon;
  final String label;
  final Color color;
  final Color? textColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.antiqueBrass.withValues(alpha: 0.3)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: textColor ?? AppColors.floralWhite),
          const SizedBox(width: 5),
          Text(
            label,
            style: TextStyle(
              color: textColor ?? AppColors.floralWhite,
              fontWeight: FontWeight.w800,
              fontSize: 10.5,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }
}

class _InfoBadge extends StatelessWidget {
  const _InfoBadge({
    required this.icon,
    required this.label,
    required this.value,
  });

  final IconData icon;
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.panelDark,
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: AppColors.primaryOrange.withValues(alpha: 0.2)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 13, color: AppColors.primaryOrange),
          const SizedBox(width: 6),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: const TextStyle(
                  color: AppColors.textSecondary,
                  fontSize: 9.5,
                  fontWeight: FontWeight.w700,
                  letterSpacing: 0.5,
                ),
              ),
              Text(
                value,
                style: const TextStyle(
                  color: AppColors.floralWhite,
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}