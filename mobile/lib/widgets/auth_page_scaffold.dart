import 'package:flutter/material.dart';

import '../utils/app_colors.dart';

/// Shared scaffold for auth pages (Login/Register).
///
/// - Vertically + horizontally centers the auth card.
/// - Uses a warm near-black background.
/// - Uses LayoutBuilder + SingleChildScrollView for short/tall viewports.
class AuthPageScaffold extends StatelessWidget {
  const AuthPageScaffold({
    super.key,
    required this.title,
    required this.subtitle,
    required this.card,
    this.appBar,
    this.roleLabel,
  });

  final String title;
  final String subtitle;
  final Widget card;
  final PreferredSizeWidget? appBar;
  final String? roleLabel;

  @override
  Widget build(BuildContext context) {
    final mq = MediaQuery.of(context);

    return Scaffold(
      backgroundColor: AppColors.nearBlack,
      extendBodyBehindAppBar: true,
      appBar: appBar != null
          ? AppBar(
              toolbarHeight: appBar!.preferredSize.height,
              backgroundColor: Colors.transparent,
              elevation: 0,
              flexibleSpace: appBar,
            )
          : AppBar(
              backgroundColor: Colors.transparent,
              elevation: 0,
              centerTitle: false,
            ),
      body: LayoutBuilder(
        builder: (context, constraints) {
          final minHeight = mq.size.height;

          return Stack(
            children: [
              Positioned.fill(
                child: Container(
                  decoration: const BoxDecoration(
                    gradient: AppColors.liquidHeroGradient,
                  ),
                ),
              ),
              // Subtle brand glow blobs
              Positioned(
                top: -mq.size.height * 0.05,
                left: -mq.size.width * 0.2,
                child: Container(
                  width: mq.size.width * 0.55,
                  height: mq.size.width * 0.55,
                  decoration: BoxDecoration(
                    color: AppColors.primaryOrange.withAlpha(20),
                    shape: BoxShape.circle,
                  ),
                ),
              ),
              Positioned(
                top: mq.size.height * 0.08,
                right: -mq.size.width * 0.25,
                child: Container(
                  width: mq.size.width * 0.65,
                  height: mq.size.width * 0.65,
                  decoration: BoxDecoration(
                    color: AppColors.orangeDarkAction.withAlpha(18),
                    shape: BoxShape.circle,
                  ),
                ),
              ),

              // Centered content
              SafeArea(
                child: ConstrainedBox(
                  constraints: BoxConstraints(minHeight: minHeight),
                  child: SingleChildScrollView(
                    physics: const ClampingScrollPhysics(),
                    padding: const EdgeInsets.fromLTRB(18, 14, 18, 20),
                    child: ConstrainedBox(
                      constraints: BoxConstraints(
                        minHeight: minHeight - mq.padding.top,
                      ),
                      child: IntrinsicHeight(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const SizedBox(height: 6),
                            Text(
                              title,
                              style: Theme.of(context)
                                  .textTheme
                                  .headlineMedium
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: -0.8,
                                    color: Colors.white,
                                  ),
                            ),
                            const SizedBox(height: 8),
                            Text(
                              roleLabel != null
                                  ? subtitle.replaceAll('{role}', roleLabel!)
                                  : subtitle,
                              style: Theme.of(context)
                                  .textTheme
                                  .bodyLarge
                                  ?.copyWith(
                                    color: AppColors.textSecondaryDark,
                                    fontWeight: FontWeight.w500,
                                  ),
                            ),
                            const SizedBox(height: 22),

                            // This expands to push the card into vertical center.
                            Expanded(
                              child: Center(child: card),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          );
        },
      ),
    );
  }
}
