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
      backgroundColor: const Color(0xFF0A090C),
      appBar: AppBar(
        backgroundColor: const Color(0xFF0A090C),
        elevation: 0,
        centerTitle: true,
        iconTheme: const IconThemeData(color: Colors.white),
        title: const Text(
          'ISKOLAR Assistant',
          style: TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w700,
            fontSize: 18,
            letterSpacing: 0.5,
          ),
        ),
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

                  final bubbleColor = isStudent
                      ? AppColors.actionBlue
                      : const Color(0xFF17151E);
                  final textColor = isStudent
                      ? Colors.white
                      : const Color(0xFFF3EFF8);

                  final align = isStudent ? Alignment.centerRight : Alignment.centerLeft;

                  return Align(
                    alignment: align,
                    child: Container(
                      margin: const EdgeInsets.symmetric(vertical: 6),
                      constraints: const BoxConstraints(maxWidth: 320),
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: bubbleColor,
                        borderRadius: BorderRadius.only(
                          topLeft: const Radius.circular(18),
                          topRight: const Radius.circular(18),
                          bottomLeft: Radius.circular(isStudent ? 18 : 4),
                          bottomRight: Radius.circular(isStudent ? 4 : 18),
                        ),
                        boxShadow: isStudent
                            ? [
                                BoxShadow(
                                  color: AppColors.actionBlue.withValues(alpha: 0.35),
                                  blurRadius: 14,
                                  offset: const Offset(0, 4),
                                ),
                              ]
                            : [
                                BoxShadow(
                                  color: Colors.black.withValues(alpha: 0.35),
                                  blurRadius: 10,
                                  offset: const Offset(0, 3),
                                ),
                              ],
                        border: isStudent
                            ? null
                            : Border.all(color: Colors.white.withValues(alpha: 0.12)),
                      ),
                      child: Text(
                        msg.text,
                        style: TextStyle(
                          color: textColor,
                          fontWeight: isStudent ? FontWeight.w500 : FontWeight.w400,
                          fontSize: 14.5,
                          height: 1.45,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Container(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 14),
              decoration: BoxDecoration(
                color: const Color(0xFF0A090C),
                border: Border(top: BorderSide(color: Colors.white.withValues(alpha: 0.10))),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      style: const TextStyle(color: Colors.white, fontSize: 14.5),
                      decoration: InputDecoration(
                        hintText: 'Type your question...',
                        hintStyle: TextStyle(color: Colors.white.withValues(alpha: 0.45), fontSize: 14),
                        filled: true,
                        fillColor: const Color(0xFF17151E),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.12)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppColors.actionBlue, width: 1.8),
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
                        backgroundColor: AppColors.actionBlue,
                        foregroundColor: Colors.white,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(16),
                        ),
                      ),
                      icon: const Icon(Icons.send_rounded, size: 18),
                      label: const Text('Send', style: TextStyle(fontWeight: FontWeight.w600)),
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

