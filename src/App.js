import React, { useEffect, useState } from 'react';
import './App.css';

// Angle helpers
function toRad(x, mode) { return mode === 'DEG' ? (x * Math.PI) / 180 : x; }
function fromRad(x, mode) { return mode === 'DEG' ? (x * 180) / Math.PI : x; }

// Tokenizer config
const FUNCTIONS = new Set([
  'sin','cos','tan','asin','acos','atan','sqrt','abs','log','ln','pow','exp'
]);
const CONSTANTS = { 'pi': Math.PI, 'e': Math.E };
const OPERATORS = {
  '+': { precedence: 2, assoc: 'L', args: 2 },
  '-': { precedence: 2, assoc: 'L', args: 2 },
  '×': { precedence: 3, assoc: 'L', args: 2 },
  '*': { precedence: 3, assoc: 'L', args: 2 },
  '÷': { precedence: 3, assoc: 'L', args: 2 },
  '/': { precedence: 3, assoc: 'L', args: 2 },
  '^': { precedence: 4, assoc: 'R', args: 2 },
  '%': { precedence: 5, assoc: 'R', args: 1 },
  '!': { precedence: 6, assoc: 'R', args: 1 },
};

function isDigit(ch) { return /[0-9]/.test(ch); }
function isLetter(ch) { return /[a-z]/i.test(ch); }

function tokenize(input) {
  const tokens = []; let i = 0;
  while (i < input.length) {
    const ch = input[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    if (isDigit(ch) || (ch === '.' && isDigit(input[i+1]))) {
      let num = ch; i++;
      while (i < input.length && /[0-9_.]/.test(input[i])) { num += input[i++]; }
      tokens.push({ type: 'number', value: parseFloat(num.replace(/_/g, '')) });
      continue;
    }
    if (isLetter(ch)) {
      let id = ch; i++;
      while (i < input.length && /[a-z0-9_]/i.test(input[i])) { id += input[i++]; }
      if (FUNCTIONS.has(id)) tokens.push({ type: 'func', value: id });
      else if (id in CONSTANTS) tokens.push({ type: 'number', value: CONSTANTS[id] });
      else tokens.push({ type: 'var', value: id });
      continue;
    }
    if (ch === '(' || ch === ')') { tokens.push({ type: ch }); i++; continue; }
    if (ch === ',') { tokens.push({ type: 'comma' }); i++; continue; }
    if ('+-*/^%!×÷'.includes(ch)) { tokens.push({ type: 'op', value: ch }); i++; continue; }
    if (ch === '√') { tokens.push({ type: 'func', value: 'sqrt' }); i++; continue; }
    throw new Error('Unknown character: ' + ch);
  }
  return tokens;
}

function toRPN(tokens) {
  const out = []; const stack = []; let prev = null;
  for (const t of tokens) {
    if (t.type === 'number') out.push(t);
    else if (t.type === 'func') stack.push(t);
    else if (t.type === 'comma') { while (stack.length && stack[stack.length-1].type !== '(') out.push(stack.pop()); }
    else if (t.type === 'op') {
      const op = t.value;
      const isUnary = (op === '+' || op === '-') && (!prev || (prev.type !== 'number' && prev.type !== ')' && !(prev.type==='op' && (prev.value==='%'||prev.value==='!'))));
      const opInfo = isUnary ? { precedence: 5, assoc: 'R', args: 1, unary: op } : OPERATORS[op];
      if (!opInfo) throw new Error('Unknown operator: ' + op);
      while (stack.length) {
        const top = stack[stack.length-1];
        if (top.type === 'op') {
          const topInfo = OPERATORS[top.value] || (top.unary ? { precedence: 5, assoc: 'R' } : null);
          if (topInfo && ((opInfo.assoc === 'L' && opInfo.precedence <= topInfo.precedence) || (opInfo.assoc === 'R' && opInfo.precedence < topInfo.precedence))) { out.push(stack.pop()); continue; }
        } else if (top.type === 'func') { out.push(stack.pop()); continue; }
        break;
      }
      stack.push(isUnary ? { type: 'op', value: op, unary: op } : t);
    } else if (t.type === '(') stack.push(t);
    else if (t.type === ')') {
      while (stack.length && stack[stack.length-1].type !== '(') out.push(stack.pop());
      if (!stack.length) throw new Error('Mismatched parentheses');
      stack.pop();
      if (stack.length && stack[stack.length-1].type === 'func') out.push(stack.pop());
    }
    prev = t;
  }
  while (stack.length) {
    const s = stack.pop();
    if (s.type === '(' || s.type === ')') throw new Error('Mismatched parentheses');
    out.push(s);
  }
  return out;
}

function factorial(n) {
  if (n < 0) throw new Error('Factorial of negative');
  if (!Number.isInteger(n)) throw new Error('Factorial of non-integer');
  let res = 1; for (let i = 2; i <= n; i++) res *= i; return res;
}

function evaluateRPN(rpn, angleMode) {
  const stack = [];
  for (const t of rpn) {
    if (t.type === 'number') stack.push(t.value);
    else if (t.type === 'func') {
      const a = stack.pop(); if (a === undefined) throw new Error('Bad expression');
      switch (t.value) {
        case 'sin': stack.push(Math.sin(toRad(a, angleMode))); break;
        case 'cos': stack.push(Math.cos(toRad(a, angleMode))); break;
        case 'tan': stack.push(Math.tan(toRad(a, angleMode))); break;
        case 'asin': stack.push(fromRad(Math.asin(a), angleMode)); break;
        case 'acos': stack.push(fromRad(Math.acos(a), angleMode)); break;
        case 'atan': stack.push(fromRad(Math.atan(a), angleMode)); break;
        case 'sqrt': stack.push(Math.sqrt(a)); break;
        case 'abs': stack.push(Math.abs(a)); break;
        case 'log': stack.push(Math.log10(a)); break;
        case 'ln': stack.push(Math.log(a)); break;
        case 'exp': stack.push(Math.exp(a)); break;
        default: throw new Error('Unknown function: ' + t.value);
      }
    } else if (t.type === 'op') {
      if (t.unary === '+') { const a = stack.pop(); stack.push(+a); continue; }
      if (t.unary === '-') { const a = stack.pop(); stack.push(-a); continue; }
      if (t.value === '%') { const a = stack.pop(); stack.push(a/100); continue; }
      if (t.value === '!') { const a = stack.pop(); stack.push(factorial(Math.round(a))); continue; }
      const b = stack.pop(); const a = stack.pop(); if (a === undefined || b === undefined) throw new Error('Bad expression');
      switch (t.value) {
        case '+': stack.push(a + b); break;
        case '-': stack.push(a - b); break;
        case '×':
        case '*': stack.push(a * b); break;
        case '÷':
        case '/': stack.push(a / b); break;
        case '^': stack.push(Math.pow(a, b)); break;
        default: throw new Error('Unknown operator: ' + t.value);
      }
    }
  }
  if (stack.length !== 1) throw new Error('Bad expression');
  return stack[0];
}

function safeEvaluate(expression, angleMode) {
  const tokens = tokenize(expression);
  const rpn = toRPN(tokens);
  return evaluateRPN(rpn, angleMode);
}

function TopBar({ theme, setTheme, angleMode, setAngleMode, onClear }) {
  return (
    <div className="topbar">
      <div className="segmented" role="group" aria-label="Angle mode">
        <button className={angleMode==='DEG'?'active':''} onClick={()=>setAngleMode('DEG')}>DEG</button>
        <button className={angleMode==='RAD'?'active':''} onClick={()=>setAngleMode('RAD')}>RAD</button>
      </div>
      <div className="toggle-group">
        <button className="key danger" onClick={onClear}>AC</button>
        <div className="segmented" role="group" aria-label="Theme">
          <button className={theme==='dark'?'active':''} onClick={()=>setTheme('dark')}>Dark</button>
          <button className={theme==='light'?'active':''} onClick={()=>setTheme('light')}>Light</button>
        </div>
      </div>
    </div>
  );
}

function Display({ expression, result }) {
  return (
    <div className="display" aria-live="polite">
      <div className="expression">{expression}</div>
      <div className="result">{result}</div>
    </div>
  );
}

function Key({ label, onPress, className }) {
  return (
    <button className={`key ${className||''}`} onClick={() => onPress(label)}>{label}</button>
  );
}

function History({ items, onReuse, onClear }) {
  return (
    <aside className="history">
      <header>
        <div>History</div>
        <div className="toggle-group">
          <button className="key" onClick={onClear}>Clear</button>
        </div>
      </header>
      <div className="history-list">
        {items.length===0 && <div className="muted">No calculations yet</div>}
        {items.map((h, idx) => (
          <div key={idx} className="h-item" onClick={()=>onReuse(h)}>
            <div className="h-expr">{h.expr}</div>
            <div className="h-res">{h.res}</div>
          </div>
        ))}
      </div>
    </aside>
  );
}

function usePersistentState(key, initial) {
  const [value, setValue] = useState(() => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : initial; } catch { return initial; }
  });
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(value)); } catch {} }, [key, value]);
  return [value, setValue];
}

function App() {
  const [theme, setTheme] = usePersistentState('calc_theme', 'dark');
  const [angleMode, setAngleMode] = usePersistentState('calc_angle', 'DEG');
  const [expression, setExpression] = useState('');
  const [result, setResult] = useState('0');
  const [memory, setMemory] = usePersistentState('calc_memory', 0);
  const [history, setHistory] = usePersistentState('calc_history', []);

  useEffect(() => { document.documentElement.setAttribute('data-theme', theme); }, [theme]);

  useEffect(() => {
    if (!expression) { setResult('0'); return; }
    try {
      const value = safeEvaluate(expression, angleMode);
      const abs = Math.abs(value);
      const formatted = !isFinite(value) ? 'Error' : (abs!==0 && (abs<1e-6||abs>=1e9)) ? value.toExponential(8).replace(/\.0+e/, 'e') : Number(value.toFixed(12)).toString();
      setResult(formatted);
    } catch {
      setResult('');
    }
  }, [expression, angleMode]);

  function append(text) { setExpression(prev => prev + text); }

  function handleEquals() {
    try {
      const value = safeEvaluate(expression, angleMode);
      const abs = Math.abs(value);
      const formatted = !isFinite(value) ? 'Error' : (abs!==0 && (abs<1e-6||abs>=1e9)) ? value.toExponential(8).replace(/\.0+e/, 'e') : Number(value.toFixed(12)).toString();
      setResult(formatted);
      setHistory([{ expr: expression, res: formatted }, ...history].slice(0, 50));
      setExpression(formatted);
    } catch {
      setResult('Error');
    }
  }

  function handleKey(label) {
    switch (label) {
      case 'AC': setExpression(''); setResult('0'); return;
      case 'DEL': setExpression(e => e.slice(0, -1)); return;
      case '=': handleEquals(); return;
      case 'M+': setMemory(memory + parseFloat(result || '0')); return;
      case 'M-': setMemory(memory - parseFloat(result || '0')); return;
      case 'MR': append(String(memory)); return;
      case 'MC': setMemory(0); return;
      case 'π': append('pi'); return;
      case 'e': append('e'); return;
      case 'x²': append('^2'); return;
      case 'xʸ': append('^'); return;
      case '√x': append('sqrt('); return;
      case '1/x': append('^(-1)'); return;
      case '|x|': append('abs('); return;
      case 'sin': case 'cos': case 'tan': case 'asin': case 'acos': case 'atan': case 'ln': case 'log': case 'exp': append(label + '('); return;
      default: append(label); return;
    }
  }

  function onHistoryReuse(h) { setExpression(h.res); }

  useEffect(() => {
    const onKey = (e) => {
      const k = e.key;
      if (k === 'Enter' || k === '=') { e.preventDefault(); handleEquals(); return; }
      if (k === 'Backspace') { e.preventDefault(); handleKey('DEL'); return; }
      if (k === 'Escape') { e.preventDefault(); handleKey('AC'); return; }
      if (k === 'p' && e.ctrlKey) { e.preventDefault(); append('pi'); return; }
      const allowed = '0123456789.+-*/^()%,';
      if (allowed.includes(k)) { append(k); return; }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [expression, angleMode, result, memory, history]);

  return (
    <div className="app">
      <div className="calculator">
        <div className="left">
          <TopBar theme={theme} setTheme={setTheme} angleMode={angleMode} setAngleMode={setAngleMode} onClear={()=>{setExpression(''); setResult('0');}} />
          <Display expression={expression} result={result} />
          <div className="keypad">
            <Key label="sin" onPress={handleKey} className="op" />
            <Key label="cos" onPress={handleKey} className="op" />
            <Key label="tan" onPress={handleKey} className="op" />
            <Key label="asin" onPress={handleKey} className="op" />
            <Key label="acos" onPress={handleKey} className="op" />
            <Key label="atan" onPress={handleKey} className="op" />
            <Key label="ln" onPress={handleKey} className="op" />
            <Key label="log" onPress={handleKey} className="op" />

            <Key label="π" onPress={handleKey} />
            <Key label="e" onPress={handleKey} />
            <Key label="M+" onPress={handleKey} />
            <Key label="M-" onPress={handleKey} />
            <Key label="MR" onPress={handleKey} />
            <Key label="MC" onPress={handleKey} />
            <Key label="|x|" onPress={handleKey} className="op" />
            <Key label="exp" onPress={handleKey} className="op" />

            <Key label="x²" onPress={handleKey} className="op" />
            <Key label="xʸ" onPress={handleKey} className="op" />
            <Key label="√x" onPress={handleKey} className="op" />
            <Key label="1/x" onPress={handleKey} className="op" />
            <Key label="%" onPress={handleKey} className="op" />
            <Key label="!" onPress={handleKey} className="op" />
            <Key label="(" onPress={handleKey} />
            <Key label=")" onPress={handleKey} />

            <Key label="AC" onPress={handleKey} className="danger" />
            <Key label="DEL" onPress={handleKey} className="danger" />
            <Key label="÷" onPress={handleKey} className="op" />
            <Key label="×" onPress={handleKey} className="op" />
            <Key label="-" onPress={handleKey} className="op" />
            <Key label="+" onPress={handleKey} className="op" />
            <Key label="," onPress={handleKey} />
            <Key label="=" onPress={handleKey} className="eq" />

            <Key label="7" onPress={handleKey} />
            <Key label="8" onPress={handleKey} />
            <Key label="9" onPress={handleKey} />
            <Key label="4" onPress={handleKey} />
            <Key label="5" onPress={handleKey} />
            <Key label="6" onPress={handleKey} />
            <Key label="1" onPress={handleKey} />
            <Key label="2" onPress={handleKey} />
            <Key label="3" onPress={handleKey} />
            <Key label="0" onPress={handleKey} className="wide" />
            <Key label="." onPress={handleKey} />
          </div>
        </div>
        <History items={history} onReuse={onHistoryReuse} onClear={()=>setHistory([])} />
      </div>
    </div>
  );
}

export default App;
