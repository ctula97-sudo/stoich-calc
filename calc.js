(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.StoichCalc = factory();
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  var weights = {
    Ag: 107.8682, Al: 26.9815384, Ar: 39.95, As: 74.921595, Au: 196.96657, B: 10.81,
    Ba: 137.327, Be: 9.0121831, Bi: 208.9804, Br: 79.904, C: 12.011, Ca: 40.078,
    Cd: 112.414, Ce: 140.116, Cl: 35.45, Co: 58.933194, Cr: 51.9961, Cs: 132.90545196,
    Cu: 63.546, Dy: 162.5, Er: 167.259, Eu: 151.964, F: 18.998403162, Fe: 55.845,
    Ga: 69.723, Gd: 157.249, Ge: 72.63, H: 1.008, He: 4.002602, Hf: 178.486,
    Hg: 200.592, Ho: 164.930329, I: 126.90447, In: 114.818, Ir: 192.217, K: 39.0983,
    Kr: 83.798, La: 138.90547, Li: 6.94, Lu: 174.96669, Mg: 24.305, Mn: 54.938043,
    Mo: 95.95, N: 14.007, Na: 22.98976928, Nb: 92.90637, Nd: 144.242, Ne: 20.1797,
    Ni: 58.6934, O: 15.999, Os: 190.23, P: 30.973761998, Pa: 231.03588, Pb: 207.2,
    Pd: 106.42, Pr: 140.90766, Pt: 195.084, Rb: 85.4678, Re: 186.207, Rh: 102.90549,
    Ru: 101.07, S: 32.06, Sb: 121.76, Sc: 44.955907, Se: 78.971, Si: 28.085,
    Sm: 150.36, Sn: 118.71, Sr: 87.62, Ta: 180.94788, Tb: 158.925354, Te: 127.6,
    Th: 232.0377, Ti: 47.867, Tl: 204.38, Tm: 168.934219, U: 238.02891, V: 50.9415,
    W: 183.84, Xe: 131.293, Y: 88.905838, Yb: 173.045, Zn: 65.38, Zr: 91.222
  };

  function parseFormula(formula) {
    if (typeof formula !== 'string' || !formula.trim()) throw new Error('화학식을 입력해 주세요.');
    var text = formula.trim(), index = 0;
    function number() {
      var start = index, seenDot = false;
      while (index < text.length && /[0-9.]/.test(text[index])) {
        if (text[index] === '.') {
          if (seenDot) break;
          seenDot = true;
        }
        index++;
      }
      if (start === index || text.slice(start, index) === '.') return 1;
      var value = Number(text.slice(start, index));
      if (!Number.isFinite(value) || value <= 0) throw new Error('첨자는 0보다 큰 숫자여야 합니다.');
      return value;
    }
    function group(stopAtClose) {
      var result = {};
      while (index < text.length && text[index] !== ')') {
        if (text[index] === '(') {
          index++;
          var nested = group(true);
          if (text[index] !== ')') throw new Error('괄호가 닫히지 않았습니다.');
          index++;
          if (!Object.keys(nested).length) throw new Error('빈 괄호는 사용할 수 없습니다.');
          var multiplier = number();
          Object.keys(nested).forEach(function (el) { result[el] = (result[el] || 0) + nested[el] * multiplier; });
        } else if (/[A-Z]/.test(text[index])) {
          var symbol = text[index++];
          if (index < text.length && /[a-z]/.test(text[index])) symbol += text[index++];
          if (!Object.prototype.hasOwnProperty.call(weights, symbol)) throw new Error('알 수 없는 원소입니다: ' + symbol);
          var count = number();
          result[symbol] = (result[symbol] || 0) + count;
        } else {
          throw new Error('화학식 형식이 올바르지 않습니다.');
        }
      }
      if (stopAtClose && index >= text.length) throw new Error('괄호가 닫히지 않았습니다.');
      return result;
    }
    var composition = group(false);
    if (index < text.length && text[index] === ')') throw new Error('닫는 괄호가 너무 많습니다.');
    if (!Object.keys(composition).length) throw new Error('화학식을 입력해 주세요.');
    return composition;
  }

  function molarMass(composition) {
    return Object.keys(composition).reduce(function (sum, el) { return sum + composition[el] * weights[el]; }, 0);
  }

  function calculate(formula, options) {
    var composition = parseFormula(formula), totalMolarMass = molarMass(composition);
    options = options || {};
    var unitFactor = options.unit === 'mg' ? 0.001 : 1;
    var reference = options.mode === 'reference';
    var supplied = Number(options.amount);
    if (!Number.isFinite(supplied) || supplied <= 0) throw new Error('수량은 0보다 큰 숫자로 입력해 주세요.');
    var targetMass = supplied * unitFactor, formulaMoles;
    if (reference) {
      var ref = options.element;
      if (!Object.prototype.hasOwnProperty.call(composition, ref)) throw new Error('기준 원소가 화학식에 없습니다.');
      formulaMoles = targetMass / (composition[ref] * weights[ref]);
    } else {
      formulaMoles = targetMass / totalMolarMass;
    }
    var rows = Object.keys(composition).map(function (element) {
      var ratio = composition[element], moles = formulaMoles * ratio;
      return {
        element: element, ratio: ratio, atomicWeight: weights[element], moleAmount: moles,
        massG: moles * weights[element], massPercent: (ratio * weights[element] / totalMolarMass) * 100
      };
    });
    var totalG = rows.reduce(function (sum, row) { return sum + row.massG; }, 0);
    return { formula: formula.trim(), composition: composition, molarMass: totalMolarMass, formulaMoles: formulaMoles, totalMassG: totalG, rows: rows };
  }

  

  // 화합물 조성식: SnTe(InSb)0.9 — 괄호로 묶은 화합물에 계수를 붙일 수 있고, 개수 제한은 없다.
  function parseComposition(text) {
    var source = String(text || '').replace(/\s+/g, '');
    if (!source) throw new Error('화합물 조성을 입력해 주세요.');
    var terms = [], index = 0;
    while (index < source.length) {
      var char = source[index];
      if ('·×*+, '.indexOf(char) >= 0) { index++; continue; }
      if (char === '(') {
        var depth = 0, cursor = index + 1, inner = '';
        for (; cursor < source.length; cursor++) {
          var current = source[cursor];
          if (current === '(') depth++;
          else if (current === ')') { if (depth === 0) break; depth--; }
          inner += current;
        }
        if (cursor >= source.length) throw new Error('괄호가 닫히지 않았습니다: ' + text);
        var matched = /^(\d*\.?\d+)/.exec(source.slice(cursor + 1));
        var coefficient = matched ? Number(matched[1]) : 1;
        if (!(coefficient > 0)) throw new Error('계수는 0보다 커야 합니다: ' + inner);
        parseFormula(inner);
        terms.push({ formula: inner, coefficient: coefficient });
        index = cursor + 1 + (matched ? matched[1].length : 0);
        continue;
      }
      var end = index;
      while (end < source.length && '·×*+, ()'.indexOf(source[end]) < 0) end++;
      var token = source.slice(index, end);
      if (!token) throw new Error('조성식을 읽을 수 없습니다: ' + text);
      if (token.indexOf('.') >= 0) throw new Error('소수 계수는 괄호로 묶어 주세요. 예: SnTe(InSb)0.9');
      parseFormula(token);
      terms.push({ formula: token, coefficient: 1 });
      index = end;
    }
    if (!terms.length) throw new Error('화합물 조성을 입력해 주세요.');
    return terms;
  }

  function elementRows(terms, totalMassG) {
    var totals = {};
    terms.forEach(function (term) {
      Object.keys(term.composition).forEach(function (element) {
        totals[element] = (totals[element] || 0) + term.moles * term.composition[element] * weights[element];
      });
    });
    return Object.keys(totals).map(function (element) {
      return {
        element: element, atomicWeight: weights[element], massG: totals[element],
        moleAmount: totals[element] / weights[element], massPercent: (totals[element] / totalMassG) * 100
      };
    });
  }

  function scaledTerms(prepared, scale) {
    return prepared.map(function (term) {
      var copy = {
        formula: term.formula, coefficient: term.coefficient,
        molarMass: term.molarMass, composition: term.composition
      };
      copy.moles = term.coefficient * scale;
      copy.massG = copy.moles * copy.molarMass;
      return copy;
    });
  }

  // 조성식 + 총 질량 → 화합물별/원소별 칭량량
  function calculateComposition(text, options) {
    options = options || {};
    var unitFactor = options.unit === 'mg' ? 0.001 : 1;
    var totalMassG = Number(options.amount) * unitFactor;
    if (!Number.isFinite(totalMassG) || totalMassG <= 0) throw new Error('수량은 0보다 큰 숫자로 입력해 주세요.');
    var prepared = parseComposition(text).map(function (term) {
      var composition = parseFormula(term.formula);
      return { formula: term.formula, coefficient: term.coefficient, composition: composition, molarMass: molarMass(composition) };
    });
    var perUnitMass = prepared.reduce(function (sum, term) { return sum + term.coefficient * term.molarMass; }, 0);
    var terms = scaledTerms(prepared, totalMassG / perUnitMass);
    return { terms: terms, totalMassG: totalMassG, perUnitMass: perUnitMass, rows: elementRows(terms, totalMassG) };
  }

  // 화합물 하나의 질량을 직접 지정 → 나머지는 같은 몰비로 따라온다
  function rebalanceComposition(terms, index, massG) {
    var target = terms[index];
    if (!target) throw new Error('없는 화합물입니다.');
    if (!Number.isFinite(massG) || massG <= 0) throw new Error('질량은 0보다 큰 숫자로 입력해 주세요.');
    var scale = massG / (target.coefficient * target.molarMass);
    var scaled = scaledTerms(terms, scale);
    var totalMassG = scaled.reduce(function (sum, term) { return sum + term.massG; }, 0);
    return { terms: scaled, totalMassG: totalMassG, perUnitMass: 0, rows: elementRows(scaled, totalMassG) };
  }

  return {
    atomicWeights: weights, parseFormula: parseFormula, molarMass: molarMass,
    calculate: calculate, parseComposition: parseComposition,
    calculateComposition: calculateComposition, rebalanceComposition: rebalanceComposition
  };
}));
