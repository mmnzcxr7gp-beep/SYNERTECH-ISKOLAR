import 'dart:io';

void main() {
  final path = 'iskolar_mobile/lib/screens/student_verification_screen.dart';
  final s = File(path).readAsStringSync();
  _debugCounts(s);
  final stack = <String>[];
  final indices = <int>[];
  final pairs = {')': '(', ']': '[', '}': '{'};
  for (var i = 0; i < s.length; i++) {
    final ch = s[i];
    if (ch == '(' || ch == '[' || ch == '{') {
      stack.add(ch);
      indices.add(i);
    } else if (ch == ')' || ch == ']' || ch == '}') {
      if (stack.isEmpty) {
        final line = _lineAt(s, i);
        print('mismatch $ch at index ${i + 1} (line $line)');
        return;
      }
      final last = stack.removeLast();
      final lastIdx = indices.removeLast();
      if (pairs[ch] != last) {
        final line = _lineAt(s, i);
        final lastLine = _lineAt(s, lastIdx);
        print('mismatch $ch at index ${i + 1} (line $line), expected ${pairs[ch]} but got $last opened at index ${lastIdx + 1} (line $lastLine)');
        print('current stack (top -> bottom):');
        for (var j = stack.length - 1; j >= 0; j--) {
          final idx = indices[j];
          print('  ${stack[j]} at index ${idx + 1} (line ${_lineAt(s, idx)})');
        }
        // print surrounding context for the offending positions
        final ctxStart = (lastIdx - 80).clamp(0, s.length - 1);
        final ctxEnd = (lastIdx + 80).clamp(0, s.length - 1);
        print('\nContext around opening at index ${lastIdx + 1}:');
        print(s.substring(ctxStart, ctxEnd));
        final ctx2Start = (i - 80).clamp(0, s.length - 1);
        final ctx2End = (i + 80).clamp(0, s.length - 1);
        print('\nContext around mismatch at index ${i + 1}:');
        print(s.substring(ctx2Start, ctx2End));
        return;
      }
    }
  }
  if (stack.isNotEmpty) {
    final lastIdx = indices.last;
    final last = stack.last;
    final lastLine = _lineAt(s, lastIdx);
    print('unclosed $last at index ${lastIdx + 1} (line $lastLine)');
  } else {
    print('balanced');
  }
}

int _lineAt(String s, int idx) {
  return '\n'.allMatches(s.substring(0, idx)).length + 1;
}

// Extra utility to print brace counts when run directly
void _debugCounts(String s) {
  final counts = <String,int>{'(':0, ')':0, '{':0, '}':0, '[':0, ']':0};
  for (var i=0;i<s.length;i++){
    final c=s[i]; if(counts.containsKey(c)) counts[c]=counts[c]!+1;
  }
  print('counts: '+counts.toString());
}
