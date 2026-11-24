// @ts-check
/**
 * Jobs Clock: pure model functions (no DOM, no network). Unit tested in test/model.test.js.
 *
 * The ILO gives yearly averages. Each is placed at mid-year and the level at any moment is a straight
 * line between neighbouring mid-years (clock-core's interpolateMidYear). "Net new jobs" is net: jobs
 * gained minus jobs lost. No source counts the gross churn for the whole world.
 */
import { interpolateMidYear, shown, SEC_PER_YEAR, YEAR } from "clock-core";

/** @typedef {Record<number, number>} Series  People (or %) by year. */
/** @typedef {import("clock-core").Verdict} Verdict */

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
  const e0 = at(emp, year), u0 = at(une, year);                       // levels on 1 January
  const yearNet = at(emp, year + 1) - e0;                              // net new jobs over the calendar year
  const yearUne = at(une, year + 1) - u0;                              // change in unemployed over the calendar year
  const newWorkers = yearNet + yearUne;                                // growth of the labour force
  /** Net new jobs per new worker; null when the workforce shrinks (the ratio means nothing then). */
  const keepUp = newWorkers > 0 ? yearNet / newWorkers : null;
  /** @param {number} y */
  const rateOf = (y) => rate[y] ?? (une[y] / (une[y] + emp[y])) * 100;
  /** @param {number} t fractional year */
  const jobsAt = (t) => at(emp, t) - e0;
  return {
    emp, une, rate, e0, u0, yearNet, yearUne, newWorkers, keepUp,
    years: Object.keys(emp).map(Number).filter((y) => y <= year).sort((a, b) => a - b),
    empY: emp[year], uneY: une[year],
    rateY: rateOf(year), ratePrev: rateOf(year - 1),
    /** Jobs per 100 new workers as displayed (whole number, never below 0), or null with a shrinking workforce. */
    per100: keepUp == null ? null : Math.max(0, shown(keepUp * 100, 0)),
    jobsAt,
    /** Net new jobs per second at moment t (the counter's current speed). @param {number} t */
    jobsPerSecAt: (t) => (jobsAt(t + 1e-3) - jobsAt(t)) / 1e-3 / SEC_PER_YEAR,
    /** @param {number} t fractional year */
    unemployedAt: (t) => at(une, t),
    /** @param {number} t fractional year */
    workersAt: (t) => at(emp, t) + at(une, t) - e0 - u0
  };
}

/** @typedef {ReturnType<typeof jobsEntry>} JobsEntry */

/**
 * Are net new jobs at least matching the growth of the workforce? Judged on jobs per 100 new workers as
 * displayed. With a shrinking workforce, judged on whether unemployment (as displayed, in thousands) falls.
 * @param {Pick<JobsEntry, "per100" | "yearUne">} e
 * @returns {Verdict}
 */
export function keepUpVerdict(e) {
  if (e.per100 == null) return shown(e.yearUne / 1e3, 0) <= 0
    ? { cls: "ok", text: "Unemployment falling" } : { cls: "bad", text: "Unemployment rising" };
  if (e.per100 >= 100) return { cls: "ok", text: "Keeping up" };
  if (e.per100 >= 90) return { cls: "near", text: "Close" };
  return { cls: "bad", text: "Falling behind" };
}

/**
 * Sort key for "keeping up": jobs per 100 new workers, or 100 / -1 for a shrinking workforce (falling
 * unemployment ranks with "keeping up", rising with "falling behind").
 * @param {Pick<JobsEntry, "per100" | "yearUne">} e
 */
export const keepUpRank = (e) => e.per100 ?? (shown(e.yearUne / 1e3, 0) <= 0 ? 100 : -1);

/**
 * Direction toward the UN 2030 full-employment goal (SDG 8.5, which sets no number):
 * does the ILO expect fewer unemployed next year than this year? Compared in millions with 1 decimal, as displayed.
 * @param {Series} une
 * @param {number} [year]
 * @returns {Verdict}
 */
export function sdgDirection(une, year = YEAR) {
  const next = une[year + 1];
  if (next == null) return { cls: "", text: "No projection yet" };
  const a = shown(next / 1e6, 1), b = shown(une[year] / 1e6, 1);
  return a < b ? { cls: "ok", text: "Improving" } : a > b ? { cls: "bad", text: "Getting worse" } : { cls: "", text: "No change" };
}

/**
 * Headline figures for the world: years of job growth needed to employ everyone unemployed (if nobody new
 * joined the workforce; null when jobs aren't growing) and the change in unemployed since the SDG base year (%).
 * @param {JobsEntry} world
 * @param {number} sdgBaseYear
 */
export function worldSummary(world, sdgBaseYear) {
  const base = world.une[sdgBaseYear];
  return {
    yearsToEmployAll: world.yearNet > 0 ? world.uneY / world.yearNet : null,
    sdgBase: base,
    sdgChangePct: base ? (world.uneY / base - 1) * 100 : null
  };
}

/**
 * Year-by-year "rest of world": world minus the listed top-level places, for years every place has
 * (a year missing for one country would otherwise count that whole country as rest of world).
 * @param {Series} world
 * @param {Series[]} parts
 * @returns {Series}
 */
export function subtractSeries(world, parts) {
  /** @type {Series} */
  const s = {};
  for (const y of Object.keys(world).map(Number)) {
    if (parts.every((p) => p[y] != null)) s[y] = world[y] - parts.reduce((a, p) => a + p[y], 0);
  }
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
