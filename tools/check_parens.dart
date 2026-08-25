import 'dart:io';

void main(){
  final path='iskolar_mobile/lib/screens/student_verification_screen.dart';
  final s=File(path).readAsStringSync();
  final stack=<int>[];
  for(var i=0;i<s.length;i++){
    final ch=s[i];
    if(ch=='(') stack.add(i);
    else if(ch==')'){
      if(stack.isEmpty){
        print('unmatched ) at ${i+1} line ${_lineAt(s,i)}');
      } else stack.removeLast();
    }
  }
  if(stack.isNotEmpty){
    for(var idx in stack){
      print('unmatched ( at index ${idx+1} line ${_lineAt(s,idx)}');
      final start=(idx-40).clamp(0,s.length-1);
      final end=(idx+40).clamp(0,s.length-1);
      print('context:');
      print(s.substring(start,end));
    }
  } else print('parens balanced');
}

int _lineAt(String s,int idx)=>'\n'.allMatches(s.substring(0,idx)).length+1;
