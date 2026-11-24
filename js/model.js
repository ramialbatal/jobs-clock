// @ts-check
/**
 * Jobs Clock: pure data and model functions (no DOM, no network). Unit tested in test/model.test.js.
 *
 * The ILO gives yearly averages. Each is placed at mid-year and the level at any moment is a straight
 * line between neighbouring mid-years (clock-core's interpolateMidYear). "Net new jobs" is net: jobs
 * gained minus jobs lost. No source counts the gross churn for the whole world.
 */
import { interpolateMidYear, YEAR } from "clock-core";

/** @typedef {Record<number, number>} Series  People (or %) by year. */
/** @typedef {{ cls: "ok" | "near" | "bad", text: string }} Verdict */

/**
 * Model for one place.
 * @param {Series} emp    Employed people by year.
 * @param {Series} une    Unemployed people by year.
 * @param {Series} rate   Unemployment rate (%) by year; computed from emp and une where missing.
 * @param {number} [year] The current year (defaults to YEAR; set it in tests).
 */
export function jobsEntry(emp, une, rate, year = YEAR) {
  /** @param {Series} s @param {number} t */
  const at = (s, t) => interpolateMidYear(s, t);
  const e0 = at(emp, year), u0 = at(une, year);                       // 1 January
  const yearNet = at(emp, year + 1) - e0;                              // net new jobs over the calendar year
  const yearUne = at(une, year + 1) - u0;                              // change in unemployed over the year
  const newWorkers = yearNet + yearUne;                                // growth of the labour force
  /** @param {number} y */
  const rateOf = (y) => rate[y] ?? (une[y] / (une[y] + emp[y])) * 100;
  return {
    emp, une, rate, e0, u0, yearNet, yearUne, newWorkers,
    years: Object.keys(emp).map(Number).filter((y) => y <= year).sort((a, b) => a - b),
    empY: emp[year], uneY: une[year], uneDelta: une[year] - une[year - 1],
    rateY: rateOf(year), ratePrev: rateOf(year - 1),
    /** Net new jobs per new worker this year; null when the workforce shrinks (the ratio means nothing then). */
    keepUp: newWorkers > 0 ? yearNet / newWorkers : null,
    /** @param {number} t fractional year */
    jobsAt: (t) => at(emp, t) - e0,
    /** @param {number} t fractional year */
    unemployedAt: (t) => at(une, t),
    /** @param {number} t fractional year */
    workersAt: (t) => at(emp, t) + at(une, t) - e0 - u0
  };
}

/** @typedef {ReturnType<typeof jobsEntry>} JobsEntry */

/**
 * Are net new jobs at least matching the growth of the workforce? With a shrinking workforce,
 * judge by whether unemployment falls instead.
 * @param {Pick<JobsEntry, "keepUp" | "yearUne">} e
 * @returns {Verdict}
 */
export function keepUpVerdict(e) {
  if (e.keepUp == null) return e.yearUne <= 0
    ? { cls: "ok", text: "Unemployment falling" } : { cls: "bad", text: "Unemployment rising" };
  if (e.keepUp >= 1) return { cls: "ok", text: "Keeping up" };
  if (e.keepUp >= 0.9) return { cls: "near", text: "Close" };
  return { cls: "bad", text: "Falling behind" };
}

/**
 * Sort key for "keeping up": the ratio, or ±1 for a shrinking workforce (falling unemployment ranks
 * with "keeping up", rising with "falling behind").
 * @param {Pick<JobsEntry, "keepUp" | "yearUne">} e
 */
export const keepUpRank = (e) => e.keepUp ?? (e.yearUne <= 0 ? 1 : -1);

/**
 * Direction toward the UN 2030 full-employment goal (SDG 8.5, which sets no number):
 * does the ILO expect fewer unemployed next year than this year?
 * @param {Series} une
 * @param {number} [year]
 * @returns {Verdict | { cls: "", text: string }}
 */
export function sdgDirection(une, year = YEAR) {
  const next = une[year + 1];
  if (next == null) return { cls: "", text: "No projection" };
  return next < une[year] ? { cls: "ok", text: "Improving" } : { cls: "bad", text: "Getting worse" };
}

/**
 * Year-by-year "rest of world": world minus the listed top-level places (those not part of another entry).
 * @param {Series} world
 * @param {Series[]} parts
 * @returns {Series}
 */
export function subtractSeries(world, parts) {
  /** @type {Series} */
  const s = {};
  for (const y of Object.keys(world).map(Number)) s[y] = world[y] - parts.reduce((a, p) => a + (p[y] || 0), 0);
  return s;
}

/**
 * Unemployment rate from levels, for places the ILO doesn't publish a rate for (rest of world).
 * @param {Series} emp
 * @param {Series} une
 * @returns {Series}
 */
export function rateFromLevels(emp, une) {
  /** @type {Series} */
  const r = {};
  for (const y of Object.keys(emp).map(Number)) if (une[y] != null) r[y] = (une[y] / (une[y] + emp[y])) * 100;
  return r;
}
