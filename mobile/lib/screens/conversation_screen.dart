import 'dart:async';
import 'package:flutter/material.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../utils/app_colors.dart';

class ConversationScreen extends StatefulWidget {
  const ConversationScreen({
    super.key,
    required this.applicationId,
    required this.scholarshipTitle,
    this.token,
  });

  final String applicationId;
  final String scholarshipTitle;
  final String? token;

  @override
  State<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends State<ConversationScreen> {
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();

  List<dynamic> _messages = [];
  bool _isLoading = true;
  bool _isSending = false;
  String? _errorMessage;
  Timer? _pollingTimer;

  @override
  void initState() {
    super.initState();
    _fetchConversation();
    // Poll every 4 seconds for new incoming provider messages
    _pollingTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (mounted) _fetchConversation(silent: true);
    });
  }

  @override
  void dispose() {
    _pollingTimer?.cancel();
    _textController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _fetchConversation({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _errorMessage = null;
      });
    }

    try {
      final token = widget.token ?? await AuthService.getToken();
      if (token == null) return;

      final res = await ApiService.get(
        '/applications/${widget.applicationId}/conversation',
        token: token,
      );

      if (mounted && res['success'] == true) {
        setState(() {
          _messages = res['messages'] as List<dynamic>? ?? [];
          _isLoading = false;
        });
        if (!silent) {
          _scrollToBottom();
        }
      }
    } catch (e) {
      if (mounted && !silent) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isSending) return;

    setState(() => _isSending = true);

    try {
      final token = widget.token ?? await AuthService.getToken();
      if (token == null) return;

      final res = await ApiService.post(
        '/applications/${widget.applicationId}/messages',
        token: token,
        body: {'body': text, 'messageType': 'TEXT'},
      );

      if (mounted && res['success'] == true) {
        _textController.clear();
        final msg = res['message'];
        setState(() {
          _messages.add(msg);
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to send: $e'), backgroundColor: AppColors.error),
        );
      }
    } finally {
      if (mounted) setState(() => _isSending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final scaffoldBg = isDark ? AppColors.darkBackground : AppColors.mainBackground;
    final headerBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final headerTitleColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final headerIconColor = isDark ? Colors.white : AppColors.primaryNavy;
    final cardBorder = isDark ? AppColors.darkBorder : AppColors.border;
    final otherBubbleBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final otherTextColor = isDark ? AppColors.darkTextPrimary : AppColors.primaryNavy;
    final inputBarBg = isDark ? AppColors.darkSurface : AppColors.pureWhite;
    final inputFieldBg = isDark ? AppColors.darkBackground : AppColors.lightBlueSurface;
    final hintColor = isDark ? AppColors.darkTextSecondary : AppColors.secondaryText;

    return Scaffold(
      backgroundColor: scaffoldBg,
      appBar: AppBar(
        backgroundColor: headerBg,
        elevation: 0,
        leading: IconButton(
          icon: Icon(Icons.arrow_back_ios_new_rounded, color: headerIconColor, size: 20),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Provider Message Thread',
              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: headerTitleColor),
            ),
            Text(
              widget.scholarshipTitle,
              style: const TextStyle(fontSize: 11, color: AppColors.actionBlue),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: Icon(Icons.refresh_rounded, color: headerIconColor),
            onPressed: () => _fetchConversation(),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            // Message List
            Expanded(
              child: _isLoading
                  ? const Center(child: CircularProgressIndicator())
                  : _errorMessage != null
                      ? Center(
                          child: Text(
                            _errorMessage!,
                            style: const TextStyle(color: AppColors.error),
                          ),
                        )
                      : _messages.isEmpty
                          ? Center(
                              child: Column(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Icon(Icons.chat_bubble_outline_rounded, size: 48, color: hintColor.withValues(alpha: 0.5)),
                                  const SizedBox(height: 12),
                                  Text(
                                    'No messages yet.\nYour conversation with the provider will appear here.',
                                    textAlign: TextAlign.center,
                                    style: TextStyle(color: hintColor, fontSize: 13),
                                  ),
                                ],
                              ),
                            )
                          : ListView.separated(
                              controller: _scrollController,
                              padding: const EdgeInsets.all(16),
                              itemCount: _messages.length,
                              separatorBuilder: (_, __) => const SizedBox(height: 12),
                              itemBuilder: (context, index) {
                                final msg = _messages[index] as Map<String, dynamic>;
                                final role = (msg['senderRole'] ?? msg['sender_role'] ?? '').toString().toLowerCase();
                                final isMe = role == 'student';
                                final isSystem = (msg['messageType'] ?? msg['message_type']) != 'TEXT';
                                final body = msg['body'] ?? '';

                                if (isSystem) {
                                  return Container(
                                    padding: const EdgeInsets.all(12),
                                    decoration: BoxDecoration(
                                      color: Colors.indigo.withValues(alpha: 0.15),
                                      borderRadius: BorderRadius.circular(12),
                                      border: Border.all(color: Colors.indigo.withValues(alpha: 0.3)),
                                    ),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        const Row(
                                          children: [
                                            Icon(Icons.info_outline_rounded, size: 16, color: Colors.indigoAccent),
                                            SizedBox(width: 6),
                                            Text(
                                              'SYSTEM UPDATE',
                                              style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.indigoAccent),
                                            ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),
                                        Text(
                                          body,
                                          style: TextStyle(color: otherTextColor, fontSize: 13, height: 1.4),
                                        ),
                                      ],
                                    ),
                                  );
                                }

                                return Align(
                                  alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                                  child: Container(
                                    constraints: BoxConstraints(
                                      maxWidth: MediaQuery.of(context).size.width * 0.78,
                                    ),
                                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                                    decoration: BoxDecoration(
                                      color: isMe ? AppColors.actionBlue : otherBubbleBg,
                                      borderRadius: BorderRadius.only(
                                        topLeft: const Radius.circular(16),
                                        topRight: const Radius.circular(16),
                                        bottomLeft: Radius.circular(isMe ? 16 : 4),
                                        bottomRight: Radius.circular(isMe ? 4 : 16),
                                      ),
                                      border: isMe ? null : Border.all(color: cardBorder),
                                      boxShadow: [
                                        if (!isMe)
                                          BoxShadow(
                                            color: isDark
                                                ? Colors.black.withValues(alpha: 0.15)
                                                : const Color(0xFF15265C).withValues(alpha: 0.04),
                                            blurRadius: 6,
                                            offset: const Offset(0, 2),
                                          ),
                                      ],
                                    ),
                                    child: Column(
                                      crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
                                      children: [
                                        Text(
                                          isMe ? 'You' : 'Scholarship Provider',
                                          style: TextStyle(
                                            fontSize: 10,
                                            fontWeight: FontWeight.bold,
                                            color: isMe ? Colors.white70 : AppColors.actionBlue,
                                          ),
                                        ),
                                        const SizedBox(height: 4),
                                        Text(
                                          body,
                                          style: TextStyle(
                                            color: isMe ? Colors.white : otherTextColor,
                                            fontSize: 13,
                                            height: 1.3,
                                          ),
                                        ),
                                      ],
                                    ),
                                  ),
                                );
                              },
                            ),
            ),

            // Message Composer Input
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              decoration: BoxDecoration(
                color: inputBarBg,
                border: Border(top: BorderSide(color: cardBorder)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      style: TextStyle(color: otherTextColor, fontSize: 13),
                      decoration: InputDecoration(
                        hintText: 'Type message to provider...',
                        hintStyle: TextStyle(color: hintColor, fontSize: 13),
                        filled: true,
                        fillColor: inputFieldBg,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: cardBorder),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: BorderSide(color: cardBorder),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(24),
                          borderSide: const BorderSide(color: AppColors.actionBlue),
                        ),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: 8),
                  CircleAvatar(
                    backgroundColor: AppColors.actionBlue,
                    radius: 20,
                    child: IconButton(
                      icon: _isSending
                          ? const SizedBox(
                              width: 16,
                              height: 16,
                              child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                            )
                          : const Icon(Icons.send_rounded, size: 18, color: Colors.white),
                      onPressed: _sendMessage,
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
