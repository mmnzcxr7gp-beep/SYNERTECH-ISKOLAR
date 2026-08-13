import 'package:flutter_test/flutter_test.dart';
import 'package:iskolar_mobile/services/api_service.dart';

void main() {
  group('ApiService.downloadDocumentBytes Tests', () {
    test('downloadDocumentBytes throws ApiException on invalid params in unit runner', () async {
      expect(
        () async => await ApiService.downloadDocumentBytes('123', token: 'invalid_token', timeout: const Duration(milliseconds: 100)),
        throwsA(isA<ApiException>()),
      );
    });
  });
}
