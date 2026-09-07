import 'package:flutter/material.dart';

import '../services/api_service.dart';
import '../utils/app_colors.dart';

class ChatbotPage extends StatefulWidget {
  const ChatbotPage({super.key});

  @override
  State<ChatbotPage> createState() => _ChatbotPageState();
}

class _ChatbotPageState extends State<ChatbotPage> {
  final _controller = TextEditingController();
  final List<_ChatMessage> _messages = [
    _ChatMessage(
      from: MessageFrom.assistant,
      text:
          'Hi! I’m ISKOLAR’s assistant. Ask about scholarships, deadlines, or eligibility.',
    ),
  ];

  bool _isSending = false;

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  void _send() async {
    final raw = _controller.text;
    final text = raw.trim();
    if (text.isEmpty || _isSending) return;

    setState(() {
      _isSending = true;
      _messages.add(_ChatMessage(from: MessageFrom.student, text: text));
      _controller.clear();
    });

    String reply;
    try {
      final res = await ApiService.post(
        '/chatbot/query',
        body: {'query': text},
        timeout: const Duration(seconds: 8),
      );
      if (res['answer'] != null) {
        reply = res['answer'].toString();
      } else {
        reply = _fallbackReply(text);
      }
    } catch (_) {
      reply = _fallbackReply(text);
    }

    if (!mounted) return;
    setState(() {
      _messages.add(_ChatMessage(
        from: MessageFrom.assistant,
        text: reply,
      ));
      _isSending = false;
    });
  }

  String _fallbackReply(String text) {
    final lower = text.toLowerCase();
    if (lower.contains('gwa') || lower.contains('gpa') || lower.contains('grade')) {
      return 'GWA/GPA requirements are set by individual scholarship providers. Typically, merit programs require a GWA of 1.75 or higher, while assistance grants require passing marks.';
    }
    if (lower.contains('document') || lower.contains('requirement') || lower.contains('cor') || lower.contains('cog')) {
      return 'Common requirements include: Certificate of Registration (COR), Certificate of Grades (COG), Valid Student ID, and Proof of Income / Indigency.';
    }
    if (lower.contains('scholarship') || lower.contains('available') || lower.contains('open')) {
      return 'You can view and apply for all active scholarship opportunities in the Browse tab.';
    }
    if (lower.contains('ocr') || lower.contains('scan')) {
      return 'ISKOLAR automated OCR assists by extracting key details from your uploaded documents. You can review and confirm the extracted values before submission.';
    }
    return 'I can answer questions regarding open scholarships, document requirements, GWA criteria, and the application process.';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        title: const Text('ISKOLAR Assistant'),
        centerTitle: true,
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView.builder(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 18),
                itemCount: _messages.length,
                itemBuilder: (context, index) {
                  final msg = _messages[index];
                  final isStudent = msg.from == MessageFrom.student;

                  final bubbleColor = isStudent ? AppColors.primary : AppColors.surface;
                  final textColor = isStudent ? Colors.black : AppColors.textPrimary;

                  final align = isStudent ? Alignment.centerRight : Alignment.centerLeft;

                  return Align(
                    alignment: align,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      constraints: const BoxConstraints(maxWidth: 320),
                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                      decoration: BoxDecoration(
                        color: bubbleColor,
                        borderRadius: BorderRadius.circular(16),
                        boxShadow: isStudent
                            ? [
                                BoxShadow(
                                  color: AppColors.primary.withValues(alpha: 0.25),
                                  blurRadius: 14,
                                  offset: const Offset(0, 6),
                                ),
                              ]
                            : null,
                        border: isStudent
                            ? null
                            : Border.all(color: AppColors.border.withValues(alpha: 0.05)),
                      ),
                      child: Text(
                        msg.text,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: textColor,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 10, 16, 14),
              decoration: BoxDecoration(
                color: AppColors.background,
                border: Border(top: BorderSide(color: AppColors.border.withValues(alpha: 0.05))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      style: const TextStyle(color: AppColors.textPrimary),
                      decoration: InputDecoration(
                        hintText: 'Type your question...',
                        hintStyle: TextStyle(color: AppColors.textSecondary.withValues(alpha: 0.9)),
                        filled: true,
                        fillColor: AppColors.surface,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.05)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: AppColors.border.withValues(alpha: 0.05)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppColors.primary, width: 2),
                        ),
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  SizedBox(
                    height: 48,
                    child: ElevatedButton.icon(
                      onPressed: _isSending ? null : _send,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primary,
                        foregroundColor: Colors.black,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      icon: const Icon(Icons.send_rounded),
                      label: const Text('Send'),
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

enum MessageFrom { student, assistant }

class _ChatMessage {
  final MessageFrom from;
  final String text;

  _ChatMessage({required this.from, required this.text});
}

