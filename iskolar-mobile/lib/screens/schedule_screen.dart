import 'package:flutter/material.dart';
import '../services/schedule_service.dart';
import '../utils/app_colors.dart';
import '../widgets/primary_button.dart';

class ScheduleScreen extends StatefulWidget {
  const ScheduleScreen({
    super.key,
    required this.token,
    required this.currentUserId,
  });

  final String token;
  final int currentUserId;

  @override
  State<ScheduleScreen> createState() => _ScheduleScreenState();
}

class _ScheduleScreenState extends State<ScheduleScreen> {
  List<dynamic> _schedules = [];
  bool _isLoading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _loadSchedules();
  }

  Future<void> _loadSchedules() async {
    setState(() {
      _isLoading = true;
      _error = null;
    });

    try {
      final list = await ScheduleService.fetchMySchedules(widget.token);
      setState(() => _schedules = list);
    } catch (err) {
      setState(() => _error = err.toString());
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _confirm(String id) async {
    try {
      await ScheduleService.confirmAttendance(widget.token, id);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Attendance confirmed successfully!'), backgroundColor: Colors.green),
      );
      _loadSchedules();
    } catch (err) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Failed to confirm: $err'), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: const Text('Exams & Interviews'),
        backgroundColor: Colors.transparent,
        elevation: 0,
      ),
      body: SafeArea(
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _error != null
                ? Center(child: Text('Error: $_error', style: const TextStyle(color: Colors.red)))
                : _schedules.isEmpty
                    ? const Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(Icons.calendar_today_outlined, size: 64, color: Colors.white24),
                            SizedBox(height: 16),
                            Text('No scheduled exams or interviews', style: TextStyle(color: Colors.white54, fontSize: 16)),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadSchedules,
                        child: ListView.builder(
                          padding: const EdgeInsets.all(16),
                          itemCount: _schedules.length,
                          itemBuilder: (context, index) {
                            final s = _schedules[index];
                            final type = s['type'] as String? ?? 'exam';
                            final dateStr = s['date'] as String? ?? '';
                            final date = DateTime.parse(dateStr).toLocal();

                            // Find current student confirmation status
                            final assigned = s['assignedStudents'] as List? ?? [];
                            final studentRecord = assigned.firstWhere(
                              (item) => item['userId'] == widget.currentUserId,
                              orElse: () => null,
                            );
                            final isConfirmed = studentRecord != null && studentRecord['confirmed'] == true;

                            return Card(
                              margin: const EdgeInsets.only(bottom: 16),
                              color: AppColors.surface,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(20),
                                side: BorderSide(
                                  color: isConfirmed ? Colors.green.withValues(alpha: 0.3) : AppColors.primary.withValues(alpha: 0.3),
                                ),
                              ),
                              child: Padding(
                                padding: const EdgeInsets.all(18),
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Row(
                                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                      children: [
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: type == 'exam' ? Colors.cyan.withValues(alpha: 0.1) : Colors.deepPurple.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            type.toUpperCase(),
                                            style: TextStyle(
                                              color: type == 'exam' ? Colors.cyan : Colors.deepPurpleAccent,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ),
                                        Container(
                                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                          decoration: BoxDecoration(
                                            color: isConfirmed ? Colors.green.withValues(alpha: 0.1) : Colors.amber.withValues(alpha: 0.1),
                                            borderRadius: BorderRadius.circular(8),
                                          ),
                                          child: Text(
                                            isConfirmed ? 'CONFIRMED' : 'PENDING CONFIRMATION',
                                            style: TextStyle(
                                              color: isConfirmed ? Colors.green : Colors.amber,
                                              fontWeight: FontWeight.bold,
                                              fontSize: 11,
                                            ),
                                          ),
                                        ),
                                      ],
                                    ),
                                    const SizedBox(height: 14),

                                    Text(
                                      s['title'] as String? ?? 'Scheduled Event',
                                      style: const TextStyle(
                                        color: Colors.white,
                                        fontSize: 18,
                                        fontWeight: FontWeight.bold,
                                      ),
                                    ),
                                    if (s['description'] != null && (s['description'] as String).isNotEmpty) ...[
                                      const SizedBox(height: 6),
                                      Text(
                                        s['description'] as String,
                                        style: const TextStyle(color: AppColors.textSecondary, fontSize: 13),
                                      ),
                                    ],
                                    const Divider(color: Colors.white12, height: 28),

                                    // Details Info
                                    Row(
                                      children: [
                                        const Icon(Icons.event, size: 16, color: Colors.white54),
                                        const SizedBox(width: 8),
                                        Text(
                                          '${date.toString().substring(0, 10)} at ${s['time']}',
                                          style: const TextStyle(color: Colors.white, fontSize: 13),
                                        ),
                                      ],
                                    ),
                                    if (s['venue'] != null && (s['venue'] as String).isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.place_outlined, size: 16, color: Colors.white54),
                                          const SizedBox(width: 8),
                                          Text(
                                            s['venue'] as String,
                                            style: const TextStyle(color: Colors.white, fontSize: 13),
                                          ),
                                        ],
                                      ),
                                    ],
                                    if (s['meetingLink'] != null && (s['meetingLink'] as String).isNotEmpty) ...[
                                      const SizedBox(height: 8),
                                      Row(
                                        children: [
                                          const Icon(Icons.videocam_outlined, size: 16, color: Colors.white54),
                                          const SizedBox(width: 8),
                                          Expanded(
                                            child: Text(
                                              s['meetingLink'] as String,
                                              style: const TextStyle(color: AppColors.primary, fontSize: 13),
                                              overflow: TextOverflow.ellipsis,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],

                                    if (!isConfirmed) ...[
                                      const SizedBox(height: 20),
                                      PrimaryButton(
                                        label: 'Confirm Attendance',
                                        onPressed: () => _confirm(s['_id'] as String),
                                      ),
                                    ],
                                  ],
                                ),
                              ),
                            );
                          },
                        ),
                      ),
      ),
    );
  }
}
