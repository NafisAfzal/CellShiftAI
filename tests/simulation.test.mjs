import test from 'node:test';
import assert from 'node:assert/strict';
import {defaultScenario,simulate,validateChange,MODEL_VERSION} from '../lib/simulation.ts';
test('100 seeded synthetic users and 5 cells',()=>{
 const s=defaultScenario(); assert.equal(s.users.length,100); assert.equal(s.cells.length,5); assert.equal(s.modelVersion,MODEL_VERSION);
});
test('deterministic output and no mutation',()=>{
 const s=defaultScenario(); const copy=JSON.stringify(s); const a=simulate(s,{siteId:'cell-b',deltaPowerDb:3}); const b=simulate(s,{siteId:'cell-b',deltaPowerDb:3});
 assert.deepEqual(a,b);assert.equal(JSON.stringify(s),copy);assert.equal(a.before.length,100);assert.equal(a.after.length,100);
});
test('zero change produces no KPI delta and no re-associations',()=>{
 const o=simulate(defaultScenario(),{siteId:'cell-b',deltaPowerDb:0}); assert.equal(o.delta.coveragePct,0);assert.equal(o.delta.avgSinrDb,0); assert.equal(o.proposed.handovers,0);
});
test('user deltas are internally consistent',()=>{
 const o=simulate(defaultScenario(),{siteId:'cell-b',deltaPowerDb:5});assert.equal(o.proposed.coveredUsers-o.baseline.coveredUsers,o.proposed.newlyCovered.length-o.proposed.newlyUncovered.length);
});
test('invalid IDs, non-integral deltas and out-of-range power blocked',()=>{
 const s=defaultScenario();assert.ok(validateChange({siteId:'cell-z',deltaPowerDb:2},s)); assert.ok(validateChange({siteId:'cell-b',deltaPowerDb:2.4},s));assert.ok(validateChange({siteId:'cell-b',deltaPowerDb:9},s));assert.ok(validateChange({siteId:'cell-b',deltaPowerDb:-9},s));
});
test('no identity or actual tower coordinates stored',()=>{
 const s=defaultScenario();assert.ok(s.users.every(x=>x.id.startsWith('user-')));assert.ok(s.cells.every(c=>c.x<1000&&c.y<1000));
});
