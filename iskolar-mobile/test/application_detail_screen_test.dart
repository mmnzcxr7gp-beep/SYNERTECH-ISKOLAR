import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:iskolar_mobile/models/application_model.dart';
import 'package:iskolar_mobile/screens/application_detail_screen.dart';

void main() {
  final sampleApp = ApplicationEntry(
    id: 'app_100',
    scholarshipId: 'sch_1',
    scholarshipTitle: 'DOST Merit Scholarship',
    status: 'pending',
    score: 88.5,
    appliedAt: '2026-08-01',
    documents: [
      DocumentEntry(
        id: 'doc_img_1',
        requirementName: 'School ID',
        originalname: 'school_id.png',
        filename: '123-school_id.png',
        mimeType: 'image/png',
        uploadedAt: '2026-08-01',
        status: 'Uploaded',
      ),
      DocumentEntry(
        id: 'doc_pdf_1',
        requirementName: 'Transcript of Records',
        originalname: 'tor.pdf',
        filename: '456-tor.pdf',
        mimeType: 'application/pdf',
        uploadedAt: '2026-08-01',
        status: 'Uploaded',
      ),
      DocumentEntry(
        id: 'doc_other_1',
        requirementName: 'Custom Requirement',
        originalname: 'file.xyz',
        filename: '789-file.xyz',
        mimeType: 'application/octet-stream',
        uploadedAt: '2026-08-01',
        status: 'Uploaded',
      ),
    ],
  );

  testWidgets('1. Document list rendering displays all attached documents', (WidgetTester tester) async {
    await tester.pumpWidget(
      MaterialApp(
        home: ApplicationDetailScreen(application: sampleApp, token: 'test_token'),
      ),
    );

    expect(find.text('Attached Documents'), findsOneWidget);
    expect(find.text('School ID'), findsOneWidget);
    expect(find.text('Transcript of Records'), findsOneWidget);
    expect(find.text('Custom Requirement'), findsOneWidget);
    expect(find.text('View'), findsNWidgets(3));
  });

  testWidgets('2. DocumentEntry helper methods identify file types correctly', (WidgetTester tester) async {
    final imgDoc = sampleApp.documents[0];
    final pdfDoc = sampleApp.documents[1];
    final xyzDoc = sampleApp.documents[2];

    expect(imgDoc.isImage, true);
    expect(imgDoc.isPdf, false);

    expect(pdfDoc.isImage, false);
    expect(pdfDoc.isPdf, true);

    expect(xyzDoc.isImage, false);
    expect(xyzDoc.isPdf, false);
  });

  testWidgets('3. Renders empty attached document container when documents list is empty', (WidgetTester tester) async {
    final emptyApp = ApplicationEntry(
      id: 'app_empty',
      scholarshipId: 'sch_1',
      scholarshipTitle: 'DOST Merit Scholarship',
      status: 'pending',
      score: 80.0,
      appliedAt: '2026-08-01',
      documents: [],
    );

    await tester.pumpWidget(
      MaterialApp(
        home: ApplicationDetailScreen(application: emptyApp, token: 'test_token'),
      ),
    );

    expect(find.text('No attached documents found for this application.'), findsOneWidget);
  });
}
