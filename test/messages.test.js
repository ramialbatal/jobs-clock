// Unit tests for the plain-language messages. Run with: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { headline, keepUpStatus, rateStatus, sdgStatus, countryBadge } from "../js/messages.js";

test("headline: one clear answer from jobs per 100 new workers", () => {
  const close = headline(97, 1.3e6);
  assert.deepEqual([close.tone, close.title], ["warn", "Jobs are almost keeping up"]);
  assert.equal(close.text, "For every 100 people joining the workforce, there are 97 new jobs. Unemployment edges up.");
  assert.equal(headline(100, -1e5).tone, "ok");
  assert.equal(headline(60, 1e6).title, "Not enough new jobs");
  assert.equal(headline(null, -2e5).title, "Fewer people out of work");
  assert.equal(headline(null, 2e5).tone, "bad");
});

test("keepUpStatus uses the same thresholds as the headline (100 and 90)", () => {
  assert.equal(keepUpStatus(100, 0).title, "Yes, enough");
  assert.equal(keepUpStatus(90, 0).title, "Almost enough");
  assert.equal(keepUpStatus(89, 0).title, "Not enough");
  assert.equal(keepUpStatus(97, 0).text, "97 new jobs for every 100 new workers.");
});

test("rateStatus compares the rate as displayed with last year", () => {
  assert.deepEqual([rateStatus(4.86, 4.87).tone, rateStatus(4.86, 4.87).title], ["warn", "4.9% out of work"]);
  assert.equal(rateStatus(5.2, 4.9).text, "Up from 4.9% last year.");
  assert.equal(rateStatus(4.5, 4.9).tone, "ok");
});

test("sdgStatus: direction plus the change since the base year", () => {
  const m = sdgStatus("worse", -8.3, 2015);
  assert.deepEqual([m.tone, m.title], ["bad", "Moving away"]);
  assert.equal(m.text, "More people out of work expected next year. Unemployment is 8% lower than in 2015.");
  assert.equal(sdgStatus("better", 3, 2015).text, "Fewer people out of work expected next year. Unemployment is 3% higher than in 2015.");
  assert.equal(sdgStatus("none", null, 2015).title, "Standing still");
});

test("countryBadge", () => {
  assert.deepEqual(countryBadge(108, 0), { tone: "ok", label: "Keeping up" });
  assert.deepEqual(countryBadge(94, 0), { tone: "warn", label: "Almost" });
  assert.deepEqual(countryBadge(55, 0), { tone: "bad", label: "Falling behind" });
  assert.deepEqual(countryBadge(null, -1e5), { tone: "ok", label: "Fewer jobless" });
});
