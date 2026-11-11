const assert = require('assert');
const calc = require('./calc.js');
let failures = 0;
function test(name, fn) { try { fn(); console.log('PASS ' + name); } catch (e) { failures++; console.log('FAIL ' + name + ': ' + e.message); } }
test('ZnGa2Se4 parsing and molar mass', () => {
  assert.deepStrictEqual(calc.parseFormula('ZnGa2Se4'), { Zn: 1, Ga: 2, Se: 4 });
  assert(Math.abs(calc.molarMass({ Zn: 1, Ga: 2, Se: 4 }) - 520.710) < 1e-12);
});
test('reference mode', () => {
  const r = calc.calculate('ZnGa2Se4', { mode: 'reference', element: 'Zn', amount: 1, unit: 'g' });
  assert(Math.abs(r.rows[1].massG - 2 * 69.723 / 65.38) < 1e-12);
  assert(Math.abs(r.rows[2].massG - 4 * 78.971 / 65.38) < 1e-12);
  assert(Math.abs(r.formulaMoles - 520.710 / 520.710 / 65.38) < 1e-12);
});
test('total-mass mode', () => {
  const r = calc.calculate('ZnGa2Se4', { mode: 'total', amount: 1, unit: 'g' });
  assert(Math.abs(r.rows[0].massG - 65.38 / 520.710) < 1e-12);
  assert(Math.abs(r.totalMassG - 1) < 1e-9);
});
test('nested and decimal formulas', () => {
  assert.deepStrictEqual(calc.parseFormula('Ca3(PO4)2'), { Ca: 3, P: 2, O: 8 });
  assert.deepStrictEqual(calc.parseFormula('Fe0.98O'), { Fe: 0.98, O: 1 });
});
test('malformed formulas throw', () => {
  ['ZnGa2Se4)', 'Xx2O3', ''].forEach(value => assert.throws(() => calc.parseFormula(value)));
});
test('atomic weights match CIAAW 2024 table', () => {
  const ciaaw = require('./ciaaw_weights.json');
  const CONVENTIONAL = {
    H: 1.008, Li: 6.94, B: 10.81, C: 12.011, N: 14.007, O: 15.999, Mg: 24.305,
    Si: 28.085, S: 32.06, Cl: 35.45, Ar: 39.95, Br: 79.904, Tl: 204.38, Pb: 207.2,
  };
  const mismatches = [];
  for (const [sym, value] of Object.entries(ciaaw.values)) {
    const expected = sym in CONVENTIONAL ? CONVENTIONAL[sym] : value;
    const actual = calc.atomicWeights[sym];
    if (actual === undefined) mismatches.push(`${sym} missing`);
    else if (Math.abs(actual - expected) > 1e-9) mismatches.push(`${sym} ${actual} != ${expected}`);
  }
  assert.deepStrictEqual(mismatches, [], mismatches.join('; '));
});
test('characters mode: SnTe -> InSb', () => {
  const r = calc.calculateMixture('SnTe', 'InSb', { amount: 1, unit: 'g', ratio: 1 });
  const mmA = calc.molarMass({ Sn: 1, Te: 1 });
  const mmB = calc.molarMass({ In: 1, Sb: 1 });
  assert(Math.abs(r.compounds[0].moles - 1 / mmA) < 1e-12);
  assert(Math.abs(r.compounds[1].massG - (1 / mmA) * mmB) < 1e-12);
  assert(Math.abs(r.totalMassG - (1 + (1 / mmA) * mmB)) < 1e-12);
  const sum = r.rows.reduce((acc, row) => acc + row.massG, 0);
  assert(Math.abs(sum - r.totalMassG) < 1e-9, 'element masses must add up');
  assert.deepStrictEqual(r.rows.map(row => row.element).sort(), ['In', 'Sb', 'Sn', 'Te']);
});
test('mixture ratio scaling', () => {
  const one = calc.calculateMixture('SnTe', 'InSb', { amount: 1, unit: 'g', ratio: 1 });
  const two = calc.calculateMixture('SnTe', 'InSb', { amount: 1, unit: 'g', ratio: 2 });
  assert(Math.abs(two.compounds[1].massG - 2 * one.compounds[1].massG) < 1e-12);
  const half = calc.calculateMixture('SnTe', 'InSb', { amount: 0.5, unit: 'g', ratio: 1 });
  assert(Math.abs(half.compounds[1].massG - 0.5 * one.compounds[1].massG) < 1e-12);
  assert.throws(() => calc.calculateMixture('SnTe', 'InSb', { amount: 1, ratio: 0 }));
  assert.throws(() => calc.calculateMixture('SnTe', 'Xx', { amount: 1 }));
});
process.exitCode = failures ? 1 : 0;
