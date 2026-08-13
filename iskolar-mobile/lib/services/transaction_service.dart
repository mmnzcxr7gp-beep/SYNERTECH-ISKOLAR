import 'api_service.dart';

class TransactionService {
  // Create Transaction (Provider only)
  static Future<Map<String, dynamic>> createTransaction({
    required String token,
    required double amount,
    required String
    transactionType, // scholarship_payment, allowance_payment, tuition_payment
    required String
    transferDirection, // provider_to_school, provider_to_student
    required String paymentMethod,
    String? studentId,
    String? schoolId,
    String? scholarshipId,
    String? programName,
    String? description,
  }) async {
    return await ApiService.post(
      '/transactions/create',
      body: {
        'amount': amount,
        'transactionType': transactionType,
        'transferDirection': transferDirection,
        'paymentMethod': paymentMethod,
        if (studentId != null) 'studentId': studentId,
        if (schoolId != null) 'schoolId': schoolId,
        if (scholarshipId != null) 'scholarshipId': scholarshipId,
        if (programName != null) 'programName': programName,
        if (description != null) 'description': description,
      },
      token: token,
    );
  }

  // Get Provider Transactions
  static Future<Map<String, dynamic>> getProviderTransactions({
    required String token,
    String? status,
    String? transactionType,
    int page = 1,
    int limit = 10,
  }) async {
    String queryString = '?page=$page&limit=$limit';
    if (status != null) queryString += '&status=$status';
    if (transactionType != null)
      queryString += '&transactionType=$transactionType';

    return await ApiService.get(
      '/transactions/provider/list$queryString',
      token: token,
    );
  }

  // Get Student Transactions
  static Future<Map<String, dynamic>> getStudentTransactions({
    required String token,
    String? status,
    String? transactionType,
    int page = 1,
    int limit = 10,
  }) async {
    String queryString = '?page=$page&limit=$limit';
    if (status != null) queryString += '&status=$status';
    if (transactionType != null)
      queryString += '&transactionType=$transactionType';

    return await ApiService.get(
      '/transactions/student/list$queryString',
      token: token,
    );
  }

  // Get Transaction Details
  static Future<Map<String, dynamic>> getTransactionDetails({
    required String token,
    required String transactionId,
  }) async {
    return await ApiService.get('/transactions/$transactionId', token: token);
  }

  // Approve Allowance Transaction (Student action)
  static Future<Map<String, dynamic>> approveAllowanceTransaction({
    required String token,
    required String transactionId,
  }) async {
    return await ApiService.post(
      '/transactions/$transactionId/approve',
      token: token,
    );
  }

  // Get Transaction Statistics
  static Future<Map<String, dynamic>> getTransactionStatistics({
    required String token,
    String dateRange = 'month',
  }) async {
    return await ApiService.get(
      '/transactions/provider/statistics?dateRange=$dateRange',
      token: token,
    );
  }
}

class Transaction {
  final String transactionId;
  final String referenceNumber;
  final String
  transactionType; // scholarship_payment, allowance_payment, tuition_payment
  final String transferDirection; // provider_to_school, provider_to_student
  final double amount;
  final String paymentMethod;
  final String status; // pending, processing, completed, failed, cancelled
  final String? studentName;
  final String? schoolName;
  final String? programName;
  final DateTime createdAt;
  final DateTime? completedAt;

  Transaction({
    required this.transactionId,
    required this.referenceNumber,
    required this.transactionType,
    required this.transferDirection,
    required this.amount,
    required this.paymentMethod,
    required this.status,
    this.studentName,
    this.schoolName,
    this.programName,
    required this.createdAt,
    this.completedAt,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      transactionId: json['transactionId'] ?? '',
      referenceNumber: json['referenceNumber'] ?? '',
      transactionType: json['transactionType'] ?? '',
      transferDirection: json['transferDirection'] ?? '',
      amount: (json['amount'] ?? 0).toDouble(),
      paymentMethod: json['paymentMethod'] ?? '',
      status: json['status'] ?? 'pending',
      studentName: json['studentId']?['firstName'] != null
          ? '${json['studentId']['firstName']} ${json['studentId']['lastName']}'
          : null,
      schoolName: json['schoolId']?['schoolName'],
      programName: json['programName'],
      createdAt: json['createdAt'] != null
          ? DateTime.parse(json['createdAt'])
          : DateTime.now(),
      completedAt: json['completedAt'] != null
          ? DateTime.parse(json['completedAt'])
          : null,
    );
  }

  String get statusDisplay {
    switch (status) {
      case 'completed':
        return '✓ Completed';
      case 'pending':
        return '⏳ Pending';
      case 'processing':
        return '⚙️ Processing';
      case 'failed':
        return '✗ Failed';
      case 'cancelled':
        return '⊘ Cancelled';
      default:
        return status;
    }
  }

  String get typeDisplay {
    switch (transactionType) {
      case 'scholarship_payment':
        return 'Scholarship Payment';
      case 'allowance_payment':
        return 'Allowance';
      case 'tuition_payment':
        return 'Tuition Fee';
      default:
        return transactionType;
    }
  }
}
