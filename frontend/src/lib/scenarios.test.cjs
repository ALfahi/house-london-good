const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const ts = require('typescript');
const Module = require('node:module');
const result = ts.transpileModule(fs.readFileSync(__dirname + '/scenarios.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } });
const compiled = new Module(__dirname + '/scenarios.ts');
compiled._compile(result.outputText, __dirname + '/scenarios.ts');
const { predictVacancy, predictCombinedVacancy, sliderBounds } = compiled.exports;
const data = require('../data/borough-scenarios.json');
test('all 33 boroughs have house prices and matched factors; only City crime is missing', () => {
  assert.equal(Object.keys(data.boroughs).length, 33);
  assert.equal(Object.keys(data.models).length, 11);
  for (const [code, values] of Object.entries(data.boroughs)) {
    for (const key of Object.keys(data.models)) {
      if (code === 'E09000001' && key === 'crime_per_1000_2021') assert.equal(values[key], null);
      else assert.ok(Number.isFinite(values[key]), `${code}: ${key}`);
    }
  }
});
test('unchanged values return the exact observed vacancy for every available factor', () => {
  for (const values of Object.values(data.boroughs)) for (const [key, model] of Object.entries(data.models)) {
    if (values[key] != null) assert.equal(predictVacancy(2.5, values[key], values[key], model.slope).raw, 2.5);
  }
});
test('percentage point and pound units match the agreed scenarios', () => {
  assert.ok(Math.abs(predictVacancy(2, 20, 25, data.models.private_rented_pct.slope).raw - 2.140747885) < 1e-8);
  assert.ok(Math.abs(predictVacancy(2, 500000, 600000, data.models.house_price_gbp.slope).change - 2.514) < 0.001);
});
test('invalid and infeasible predictions are explicit, rather than silently clamped', () => {
  assert.equal(predictVacancy(2, NaN, 3, 1), null);
  assert.equal(predictVacancy(2, 10, 0, 1).feasible, false);
  assert.equal(predictVacancy(2, 10, 0, 1).raw, -8);
  assert.equal(predictVacancy(99, 0, 10, 1).feasible, false);
});
test('slider bounds include the exact starting value and enforce percentage limits', () => {
  for (const values of Object.values(data.boroughs)) for (const [key, model] of Object.entries(data.models)) {
    const initial = values[key]; if (initial == null) continue;
    const bounds = sliderBounds(initial, model.min, model.max, key.endsWith('_pct'));
    assert.ok(bounds.min >= 0 && bounds.min <= initial && bounds.max >= initial);
    if (key.endsWith('_pct')) assert.equal(bounds.max, 100);
  }
});
test('rendered cards contain eleven sliders per borough, observed outputs, and City missing-data message', () => {
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const source = fs.readFileSync(__dirname + '/../components/dashboard/ScenarioPanel.tsx', 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true } });
  const component = new Module(__dirname + '/ScenarioPanel.cjs');
  component.paths = module.paths;
  const originalRequire = component.require.bind(component);
  component.require = (id) => id === '@/data/borough-scenarios.json' ? data : id === '@/lib/scenarios' ? compiled.exports : originalRequire(id);
  component._compile(output.outputText, __dirname + '/ScenarioPanel.cjs');
  for (const code of Object.keys(data.boroughs)) {
    const html = renderToStaticMarkup(React.createElement(component.exports.ScenarioPanel, { area: {area_id:code,area_name:code,is_synthetic:false,vacancy_rate:2.5,year:2025} }));
    const count = (html.match(/type="range"/g) || []).length;
    assert.equal(count, code === 'E09000001' ? 10 : 11, code);
    assert.equal((html.match(/2\.50%/g)||[]).length, 2, code);
    assert.equal((html.match(/<output/g)||[]).length, 1, code);
    if (code === 'E09000001') assert.match(html, /City of London is outside the MPS dataset/);
    assert.doesNotMatch(html, /NaN|undefined/);
  }
  const demo = renderToStaticMarkup(React.createElement(component.exports.ScenarioPanel, { area:{area_id:'DEMO-001',is_synthetic:true} }));
  assert.doesNotMatch(demo, /type="range"/);
});

test('combined scenario adds multiple changes once and reset returns baseline', () => {
  const changes = [{initial:20,final:25,slope:0.1},{initial:30000,final:40000,slope:0.00002}];
  assert.equal(predictCombinedVacancy(2,changes).raw,2.7);
  assert.equal(predictCombinedVacancy(2,changes.map(x=>({...x,final:x.initial}))).raw,2);
  assert.equal(predictCombinedVacancy(2,[]).raw,2);
  assert.equal(predictCombinedVacancy(2,[{initial:0,final:NaN,slope:1}]),null);
  assert.equal(predictCombinedVacancy(2,[{initial:10,final:0,slope:1}]).feasible,false);
});
