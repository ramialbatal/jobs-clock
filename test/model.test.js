// Unit tests for the Jobs Clock model. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { jobsEntry, keepUpVerdict, keepUpRank, sdgDirection, subtractSeries, rateFromLevels } from "../js/model.js";

const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) < eps, `${a} is not close to ${b}`);

// World-like numbers (people): employment grows, unemployment edges up.
const emp = { 2024: 3562e6, 2025: 3599e6, 2026: 3636e6, 2027: 3673e6 };
const une = { 2024: 183e6, 2025: 184.2e6, 2026: 185.8e6, 2027: 186.9e6 };

test("jobsEntry: calendar-year net jobs from mid-year averages", () => {
  const e = jobsEntry(emp, une, {}, 2026);
  close(e.e0, (3599e6 + 3636e6) / 2);                 // 1 January 2026
  close(e.yearNet, (3673e6 - 3599e6) / 2);            // (E2027 - E2025) / 2
  close(e.yearUne, (186.9e6 - 184.2e6) / 2);
  close(e.newWorkers, e.yearNet + e.yearUne);
  close(e.keepUp ?? NaN, e.yearNet / e.newWorkers);
  close(e.jobsAt(2026), 0);
  close(e.jobsAt(2026.5), 3636e6 - e.e0);
  assert.deepEqual(e.years, [2024, 2025, 2026]);
});

test("jobsEntry: rate falls back to levels when the ILO rate is missing", () => {
  const e = jobsEntry(emp, une, { 2026: 4.9 }, 2026);
  assert.equal(e.rateY, 4.9);
  close(e.ratePrev, (184.2e6 / (184.2e6 + 3599e6)) * 100);
});

test("keepUpVerdict thresholds and the shrinking-workforce case", () => {
  assert.equal(keepUpVerdict({ keepUp: 1.05, yearUne: -1 }).text, "Keeping up");
  assert.equal(keepUpVerdict({ keepUp: 0.97, yearUne: 1 }).text, "Close");
  assert.equal(keepUpVerdict({ keepUp: 0.6, yearUne: 1 }).text, "Falling behind");
  assert.equal(keepUpVerdict({ keepUp: null, yearUne: -100 }).text, "Unemployment falling");
  assert.equal(keepUpVerdict({ keepUp: null, yearUne: 100 }).text, "Unemployment rising");
  // A shrinking workforce yields keepUp null, never a meaningless ratio
  const shrinking = jobsEntry({ 2025: 100, 2026: 99, 2027: 98 }, { 2025: 10, 2026: 9.8, 2027: 9.6 }, {}, 2026);
  assert.equal(shrinking.keepUp, null);
});

test("keepUpRank places shrinking workforces sensibly", () => {
  assert.equal(keepUpRank({ keepUp: 0.8, yearUne: 1 }), 0.8);
  assert.equal(keepUpRank({ keepUp: null, yearUne: -1 }), 1);
  assert.equal(keepUpRank({ keepUp: null, yearUne: 1 }), -1);
});

test("sdgDirection compares next year's ILO estimate with this year", () => {
  assert.equal(sdgDirection(une, 2026).text, "Getting worse");
  assert.equal(sdgDirection({ 2026: 10, 2027: 9 }, 2026).text, "Improving");
  assert.equal(sdgDirection({ 2026: 10 }, 2026).text, "No projection");
});

test("subtractSeries and rateFromLevels build the rest of the world", () => {
  const rest = subtractSeries({ 2026: 100, 2027: 110 }, [{ 2026: 30, 2027: 35 }, { 2026: 20 }]);
  assert.deepEqual(rest, { 2026: 50, 2027: 75 });
  assert.deepEqual(rateFromLevels({ 2026: 95 }, { 2026: 5 }), { 2026: 5 });
});
