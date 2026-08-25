import 'dart:io';

void main(){
  final s=File('iskolar_mobile/lib/screens/student_verification_screen.dart').readAsStringSync();
  final lines=s.split('\n');
  final start=494-1; final end=650; // inclusive end index in 1-based
  final seg=lines.sublist(start,end).join('\n');
  int count(String ch)=>seg.split(ch).length-1;
  print('lines 494-650 counts: ('+count('(').toString()+') '+count(')').toString());
}
