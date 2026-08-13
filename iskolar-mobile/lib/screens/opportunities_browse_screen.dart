import 'package:flutter/material.dart';
import '../services/scholarship_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';
import 'opportunity_details_screen.dart';

class OpportunitiesBrowseScreen extends StatefulWidget {
  const OpportunitiesBrowseScreen({super.key, required this.token});

  final String token;

  @override
  State<OpportunitiesBrowseScreen> createState() =>
      _OpportunitiesBrowseScreenState();
}

class _OpportunitiesBrowseScreenState extends State<OpportunitiesBrowseScreen> {
  final _searchController = TextEditingController();
  final _scrollController = ScrollController();

  List<dynamic> _opportunities = [];
  bool _loading = true;
  String? _error;
  String? _selectedType;
  int _currentPage = 1;
  final int _pageLimit = 10;
  final int _totalPages = 1;
  bool _loadingMore = false;

  @override
  void initState() {
    super.initState();
    _loadOpportunities();
    _scrollController.addListener(_onScroll);
  }

  @override
  void dispose() {
    _searchController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  void _onScroll() {
    if (_scrollController.position.pixels ==
        _scrollController.position.maxScrollExtent) {
      if (_currentPage < _totalPages && !_loadingMore) {
        _loadMore();
      }
    }
  }

  Future<void> _loadOpportunities({bool refresh = false}) async {
    if (refresh) {
      _currentPage = 1;
      _opportunities = [];
    }

    setState(() {
      _loading = true;
      _error = null;
    });

    try {
      final result = await ScholarshipService.browseOpportunities(
        type: _selectedType,
        page: _currentPage,
        limit: _pageLimit,
      );

      // The response should include pagination info
      setState(() {
        _opportunities = result;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  Future<void> _loadMore() async {
    if (_loadingMore || _currentPage >= _totalPages) return;

    setState(() {
      _loadingMore = true;
    });

    try {
      _currentPage++;
      final result = await ScholarshipService.browseOpportunities(
        type: _selectedType,
        page: _currentPage,
        limit: _pageLimit,
      );

      setState(() {
        _opportunities.addAll(result);
        _loadingMore = false;
      });
    } catch (e) {
      setState(() {
        _error = e.toString();
        _loadingMore = false;
      });
    }
  }

  String _formatDeadline(String deadline) {
    try {
      final date = DateTime.parse(deadline);
      final now = DateTime.now();
      final difference = date.difference(now).inDays;

      if (difference < 0) return 'Closed';
      if (difference == 0) return 'Today';
      if (difference == 1) return 'Tomorrow';
      return '$difference days left';
    } catch (e) {
      return deadline;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Scholarship Opportunities'),
        elevation: 0,
        backgroundColor: AppColors.background,
        foregroundColor: Colors.white,
      ),
      backgroundColor: AppColors.background,
      body: Column(
        children: [
          // Search and Filter
          Padding(
            padding: const EdgeInsets.all(16.0),
            child: Column(
              children: [
                // Search bar
                TextField(
                  controller: _searchController,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Search opportunities...',
                    hintStyle: const TextStyle(color: Colors.grey),
                    prefixIcon: const Icon(Icons.search, color: Colors.grey),
                    filled: true,
                    fillColor: Colors.grey.shade900,
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(12),
                      borderSide: BorderSide.none,
                    ),
                  ),
                  onChanged: (value) {
                    // Debounce and search
                  },
                ),
                const SizedBox(height: 12),
                // Type Filter
                SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(
                    children: [
                      _buildFilterChip('All', null),
                      _buildFilterChip('Scholarship', 'Scholarship'),
                      _buildFilterChip('Allowance', 'Allowance'),
                      _buildFilterChip(
                        'Scholarship + Allowance',
                        'Scholarship + Allowance',
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          // Opportunities List
          Expanded(
            child: _buildOpportunitiesList(),
          ),
        ],
      ),
    );
  }

  Widget _buildFilterChip(String label, String? type) {
    final isSelected = _selectedType == type;
    return Padding(
      padding: const EdgeInsets.only(right: 8.0),
      child: FilterChip(
        label: Text(label),
        selected: isSelected,
        onSelected: (selected) {
          setState(() {
            _selectedType = selected ? type : null;
            _currentPage = 1;
            _opportunities = [];
          });
          _loadOpportunities();
        },
        backgroundColor: Colors.grey.shade800,
        selectedColor: AppColors.primary,
        labelStyle: TextStyle(
          color: isSelected ? Colors.white : Colors.grey,
        ),
      ),
    );
  }

  Widget _buildOpportunitiesList() {
    if (_loading && _opportunities.isEmpty) {
      return const Center(
        child: CircularProgressIndicator(color: AppColors.primary),
      );
    }

    if (_error != null && _opportunities.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(_error ?? 'Error loading opportunities',
                style: const TextStyle(color: Colors.red)),
            const SizedBox(height: 16),
            PrimaryButton(
              label: 'Retry',
              onPressed: () => _loadOpportunities(refresh: true),
            ),
          ],
        ),
      );
    }

    if (_opportunities.isEmpty) {
      return const Center(
        child: Text(
          'No opportunities found',
          style: TextStyle(color: Colors.grey),
        ),
      );
    }

    return ListView.builder(
      controller: _scrollController,
      padding: const EdgeInsets.all(16),
      itemCount: _opportunities.length + (_loadingMore ? 1 : 0),
      itemBuilder: (context, index) {
        if (index == _opportunities.length) {
          return const Center(
            child: Padding(
              padding: EdgeInsets.all(16.0),
              child: CircularProgressIndicator(color: AppColors.primary),
            ),
          );
        }

        final opp = _opportunities[index];
        return _buildOpportunityCard(opp);
      },
    );
  }

  Widget _buildOpportunityCard(dynamic opp) {
    return GestureDetector(
      onTap: () {
        Navigator.push(
          context,
          MaterialPageRoute(
            builder: (context) => OpportunityDetailsScreen(
              token: widget.token,
              opportunityId: opp['_id'],
            ),
          ),
        );
      },
      child: Card(
        color: Colors.grey.shade900,
        margin: const EdgeInsets.only(bottom: 16),
        child: Padding(
          padding: const EdgeInsets.all(16),
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
                          opp['title'] ?? 'N/A',
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Colors.white,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                        const SizedBox(height: 4),
                        Text(
                          opp['type'] ?? 'Scholarship',
                          style: TextStyle(
                            fontSize: 12,
                            color: Colors.grey.shade400,
                          ),
                        ),
                      ],
                    ),
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 12,
                      vertical: 6,
                    ),
                    decoration: BoxDecoration(
                      color: AppColors.primary.withValues(alpha: 0.2),
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      _formatDeadline(opp['applicationDeadline'] ?? ''),
                      style: const TextStyle(
                        fontSize: 12,
                        color: AppColors.primary,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),
              Text(
                opp['description'] ?? '',
                style: TextStyle(
                  fontSize: 13,
                  color: Colors.grey.shade400,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              const SizedBox(height: 12),
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Row(
                    children: [
                      Icon(Icons.people, size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        '${opp['totalSlots'] ?? 0} slots',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade400,
                        ),
                      ),
                      const SizedBox(width: 12),
                      Icon(Icons.person_add,
                          size: 16, color: Colors.grey.shade500),
                      const SizedBox(width: 4),
                      Text(
                        '${opp['applicantsCount'] ?? 0} applicants',
                        style: TextStyle(
                          fontSize: 12,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ],
                  ),
                  const Icon(
                    Icons.arrow_forward_ios,
                    size: 16,
                    color: AppColors.primary,
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
