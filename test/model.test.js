// Unit tests for the Jobs Clock model. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { SEC_PER_YEAR } from "clock-core";
import { jobsEntry, keepUpVerdict, keepUpRank, sdgDirection, worldSummary, subtractSeries, rateFromLevels } from "../js/model.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`);

// World-like numbers (people): employment grows, unemployment edges up.
const emp = { 2015: 3200e6, 2024: 3562e6, 2025: 3599e6, 2026: 3636e6, 2027: 3673e6 };
const une = { 2015: 202.6e6, 2024: 183e6, 2025: 184.2e6, 2026: 185.8e6, 2027: 186.9e6 };

test("jobsEntry: calendar-year net jobs from mid-year averages", () => {
  const e = jobsEntry(emp, une, {}, 2026);
  close(e.e0, (3599e6 + 3636e6) / 2);                 // 1 January 2026
  close(e.yearNet, (3673e6 - 3599e6) / 2);            // (E2027 - E2025) / 2
  close(e.yearUne, (186.9e6 - 184.2e6) / 2);
  close(e.newWorkers, e.yearNet + e.yearUne);
  close(e.keepUp ?? NaN, e.yearNet / e.newWorkers);
  assert.equal(e.per100, 96);                          // 37M jobs / 38.35M new workers = 96.5%, shown as 96
  close(e.jobsAt(2026), 0);
  close(e.jobsAt(2026.5), 3636e6 - e.e0);
  assert.deepEqual(e.years, [2015, 2024, 2025, 2026]);
});

test("jobsEntry: jobs per second is the counter's current speed", () => {
  const e = jobsEntry(emp, une, {}, 2026);
  close(e.jobsPerSecAt(2026.2), (3636e6 - 3599e6) / SEC_PER_YEAR, 1e-3);   // first half: slope from 2025.5 to 2026.5
  close(e.jobsPerSecAt(2026.8), (3673e6 - 3636e6) / SEC_PER_YEAR, 1e-3);   // second half: slope from 2026.5 to 2027.5
});

test("jobsEntry: rate falls back to levels when the ILO rate is missing", () => {
  const e = jobsEntry(emp, une, { 2026: 4.9 }, 2026);
  assert.equal(e.rateY, 4.9);
  close(e.ratePrev, (184.2e6 / (184.2e6 + 3599e6)) * 100);
});

test("per100 never goes below 0 when jobs fall while the workforce grows", () => {
  // employment falls 10k, unemployment rises 50k: workforce +40k, ratio -25%
  const e = jobsEntry({ 2025: 1000e3, 2026: 990e3, 2027: 980e3 }, { 2025: 100e3, 2026: 150e3, 2027: 200e3 }, {}, 2026);
  assert.ok((e.keepUp ?? 0) < 0);
  assert.equal(e.per100, 0);
  assert.equal(keepUpVerdict(e).text, "Falling behind");
});

test("keepUpVerdict: thresholds on jobs per 100 as displayed, and the shrinking-workforce case", () => {
  assert.equal(keepUpVerdict({ per100: 100, yearUne: 1 }).text, "Keeping up");     // 99.6 is shown as 100
  assert.equal(keepUpVerdict({ per100: 97, yearUne: 1 }).text, "Close");
  assert.equal(keepUpVerdict({ per100: 90, yearUne: 1 }).text, "Close");            // 89.51 is shown as 90
  assert.equal(keepUpVerdict({ per100: 60, yearUne: 1 }).text, "Falling behind");
  assert.equal(keepUpVerdict({ per100: null, yearUne: -100e3 }).text, "Unemployment falling");
  assert.equal(keepUpVerdict({ per100: null, yearUne: 100e3 }).text, "Unemployment rising");
  assert.equal(keepUpVerdict({ per100: null, yearUne: 300 }).text, "Unemployment falling");   // shown as 0 k
  const shrinking = jobsEntry({ 2025: 100, 2026: 99, 2027: 98 }, { 2025: 10, 2026: 9.8, 2027: 9.6 }, {}, 2026);
  assert.equal(shrinking.keepUp, null);
  assert.equal(shrinking.per100, null);
});

test("keepUpRank places shrinking workforces with keeping up (falling unemployment) or last (rising)", () => {
  assert.equal(keepUpRank({ per100: 80, yearUne: 1 }), 80);
  assert.equal(keepUpRank({ per100: null, yearUne: -1e6 }), 100);
  assert.equal(keepUpRank({ per100: null, yearUne: 1e6 }), -1);
});

test("sdgDirection compares next year's ILO estimate with this year", () => {
  assert.equal(sdgDirection(une, 2026).text, "Getting worse");
  assert.equal(sdgDirection({ 2026: 10, 2027: 9 }, 2026).text, "Improving");
  assert.deepEqual(sdgDirection({ 2026: 10 }, 2026), { cls: "", text: "No projection yet" });
});

test("worldSummary: years to employ everyone and change since the SDG base year", () => {
  const s = worldSummary(jobsEntry(emp, une, {}, 2026), 2015);
  close(s.yearsToEmployAll ?? NaN, 185.8e6 / ((3673e6 - 3599e6) / 2));
  close(s.sdgChangePct ?? NaN, (185.8 / 202.6 - 1) * 100);
  assert.equal(worldSummary(jobsEntry({ 2025: 10, 2026: 9, 2027: 8 }, une, {}, 2026), 2015).yearsToEmployAll, null);
});

test("subtractSeries only builds years every part has, and rateFromLevels", () => {
  const rest = subtractSeries({ 2026: 100, 2027: 110 }, [{ 2026: 30, 2027: 35 }, { 2026: 20 }]);
  assert.deepEqual(rest, { 2026: 50 });               // 2027 is missing for the second part: left out
  assert.deepEqual(rateFromLevels({ 2026: 95 }, { 2026: 5 }), { 2026: 5 });
});
