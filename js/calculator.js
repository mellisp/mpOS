(function () {
  'use strict';

  /* ── State ── */
  const calcDisplay = document.getElementById('calcDisplay');
  let calcCurrent = '0';
  let calcPrev = null;
  let calcOperation = null;
  let calcReset = false;
  let calcScientific = false;

  /* ── Display ── */
  const calcUpdateDisplay = () => {
    calcDisplay.textContent = calcCurrent;
    calcDisplay.style.fontSize = calcCurrent.length > 12 ? '1.125rem' : '';
  };

  /* ── Core operations ── */
  const openCalculator = () => {
    openWindow('calculator');
    document.getElementById('calculator').focus();
  };

  const calcDigit = (d) => {
    if (calcReset) { calcCurrent = '0'; calcReset = false; }
    if (calcCurrent === '0') calcCurrent = d;
    else calcCurrent += d;
    if (calcCurrent.length > 15) calcCurrent = calcCurrent.slice(0, 15);
    calcUpdateDisplay();
  };

  const calcDecimal = () => {
    if (calcReset) { calcCurrent = '0'; calcReset = false; }
    if (!calcCurrent.includes('.')) calcCurrent += '.';
    calcUpdateDisplay();
  };

  const calcOp = (op) => {
    if (calcPrev !== null && calcOperation && !calcReset) calcEquals();
    calcPrev = parseFloat(calcCurrent);
    calcOperation = op;
    calcReset = true;
  };

  const calcEquals = () => {
    if (calcPrev === null || !calcOperation) {
      if (calcCurrent === '58008') { calcCurrent = '(.Y.)'; calcReset = true; calcUpdateDisplay(); return; }
      return;
    }
    const curr = parseFloat(calcCurrent);
    let result;
    switch (calcOperation) {
      case '+': result = calcPrev + curr; break;
      case '-': result = calcPrev - curr; break;
      case '*': result = calcPrev * curr; break;
      case '/': result = curr === 0 ? 'Error' : calcPrev / curr; break;
      case 'pow': result = Math.pow(calcPrev, curr); break;
    }
    if (typeof result === 'number' && !isFinite(result)) result = 'Error';
    calcCurrent = typeof result === 'string' ? result : String(result);
    if (calcCurrent !== 'Error' && calcCurrent.length > 15) calcCurrent = parseFloat(calcCurrent).toPrecision(10);
    calcPrev = null;
    calcOperation = null;
    calcReset = true;
    calcUpdateDisplay();
  };

  const calcClear = () => {
    calcCurrent = '0'; calcPrev = null; calcOperation = null; calcReset = false;
    calcUpdateDisplay();
  };

  const calcClearEntry = () => {
    calcCurrent = '0'; calcReset = false;
    calcUpdateDisplay();
  };

  const calcBackspace = () => {
    if (calcReset) return;
    calcCurrent = calcCurrent.length > 1 ? calcCurrent.slice(0, -1) : '0';
    calcUpdateDisplay();
  };

  /* ── Scientific Mode ── */
  const calcToggleScientific = () => {
    const toggle = document.getElementById('calcSciToggle');
    calcScientific = toggle.checked;
    const sciButtons = document.getElementById('calcSciButtons');
    const calcWin = document.getElementById('calculator');
    sciButtons.style.display = calcScientific ? '' : 'none';
    if (calcScientific) calcWin.classList.add('calc-scientific');
    else calcWin.classList.remove('calc-scientific');
  };

  const calcFactorial = (n) => {
    if (n < 0 || n !== Math.floor(n)) return NaN;
    if (n > 170) return Infinity;
    let result = 1;
    for (let i = 2; i <= n; i++) result *= i;
    return result;
  };

  const calcSciFn = (fn) => {
    const val = parseFloat(calcCurrent);
    let result;
    switch (fn) {
      case 'sin': result = Math.sin(val * Math.PI / 180); break;
      case 'cos': result = Math.cos(val * Math.PI / 180); break;
      case 'tan':
        if (Math.abs(val % 180) === 90) { result = Infinity; }
        else { result = Math.tan(val * Math.PI / 180); }
        break;
      case 'sqrt':
        if (val < 0) { result = NaN; }
        else { result = Math.sqrt(val); }
        break;
      case 'sq': result = val * val; break;
      case 'log':
        if (val <= 0) { result = NaN; }
        else { result = Math.log10(val); }
        break;
      case 'ln':
        if (val <= 0) { result = NaN; }
        else { result = Math.log(val); }
        break;
      case 'inv':
        if (val === 0) { result = NaN; }
        else { result = 1 / val; }
        break;
      case 'fact': result = calcFactorial(val); break;
      case 'pi': result = Math.PI; break;
      case 'negate': result = -val; break;
      default: return;
    }
    if (isNaN(result) || !isFinite(result)) {
      calcCurrent = 'Error';
    } else {
      calcCurrent = String(result);
      if (calcCurrent.length > 15) calcCurrent = parseFloat(calcCurrent).toPrecision(10);
    }
    calcReset = true;
    calcUpdateDisplay();
  };

  /* ── Delegated click listener for calculator buttons ── */
  document.getElementById('calculator').addEventListener('click', (e) => {
    const btn = e.target.closest('[data-calc]');
    if (!btn) return;
    const type = btn.dataset.calc;
    const val = btn.dataset.val;
    if (type === 'digit') calcDigit(val);
    else if (type === 'op') calcOp(val);
    else if (type === 'sci') calcSciFn(val);
    else if (type === 'clear') calcClear();
    else if (type === 'ce') calcClearEntry();
    else if (type === 'bs') calcBackspace();
    else if (type === 'decimal') calcDecimal();
    else if (type === 'eq') calcEquals();
  });

  /* ── Scientific toggle listener ── */
  document.getElementById('calcSciToggle').addEventListener('change', calcToggleScientific);

  /* ── Keyboard support ── */
  document.getElementById('calculator').addEventListener('keydown', (e) => {
    const key = e.key;
    if (key >= '0' && key <= '9') { calcDigit(key); e.preventDefault(); }
    else if (key === '.') { calcDecimal(); e.preventDefault(); }
    else if (key === '+' || key === '-' || key === '*' || key === '/') { calcOp(key); e.preventDefault(); }
    else if (key === 'Enter' || key === '=') { calcEquals(); e.preventDefault(); }
    else if (key === 'Escape') { calcClear(); e.preventDefault(); }
    else if (key === 'Backspace') { calcBackspace(); e.preventDefault(); }
  });

  /* ── Register with core ── */
  window.mpRegisterActions({ openCalculator });
  window.mpRegisterWindows({ calculator: 'Calculator' });

  /* ── Exports ── */
  window.openCalculator = openCalculator;
})();
