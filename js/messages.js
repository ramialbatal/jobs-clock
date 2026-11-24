// @ts-check
/**
 * Jobs Clock: the plain-language messages shown to visitors. Pure functions, unit tested.
 * Each returns a clock-core Message (tone, icon, short title, one sentence). Keep them short and free of jargon;
 * numbers and method details belong behind "More".
 */
import { shown, fmt, pct, message } from "clock-core";

/** @typedef {import("clock-core").Message} Message */
/** @typedef {import("clock-core").Tone} Tone */

/**
 * The one-line answer at the top: are there enough new jobs for the people joining the workforce?
 * @param {number | null} per100   net new jobs per 100 new workers, as displayed (null if the workforce shrinks)
 * @param {number} yearUne         change in unemployed people this year (people)
 * @returns {Message}
 */
export function headline(per100, yearUne) {
  if (per100 == null) return shown(yearUne / 1e3, 0) <= 0
    ? message("ok", "Fewer people out of work", "The workforce is shrinking, and unemployment is falling.")
    : message("bad", "More people out of work", "The workforce is shrinking, yet unemployment is rising.");
  const n = fmt[0].format(per100);
  if (per100 >= 100) return message("ok", "Jobs are keeping up",
    `For every 100 people joining the workforce, there are ${n} new jobs.`);
  if (per100 >= 90) return message("warn", "Jobs are almost keeping up",
    `For every 100 people joining the workforce, there are ${n} new jobs. Unemployment edges up.`);
  return message("bad", "Not enough new jobs",
    `For every 100 people joining the workforce, there are only ${n} new jobs. Unemployment rises.`);
}

/**
 * Traffic light: enough new jobs? (the same test as the headline, said briefly).
 * @param {number | null} per100
 * @param {number} yearUne
 * @returns {Message}
 */
export function keepUpStatus(per100, yearUne) {
  if (per100 == null) return shown(yearUne / 1e3, 0) <= 0
    ? message("ok", "Unemployment falling", "Fewer people are looking for work than at the start of the year.")
    : message("bad", "Unemployment rising", "More people are looking for work than at the start of the year.");
  const text = `${fmt[0].format(per100)} new jobs for every 100 new workers.`;
  if (per100 >= 100) return message("ok", "Yes, enough", text);
  if (per100 >= 90) return message("warn", "Almost enough", text);
  return message("bad", "Not enough", text);
}

/**
 * Traffic light: the unemployment rate, compared with last year (as displayed, 1 decimal).
 * @param {number} rate      % this year
 * @param {number} ratePrev  % last year
 * @returns {Message}
 */
export function rateStatus(rate, ratePrev) {
  const now = shown(rate, 1), then = shown(ratePrev, 1);
  const title = `${pct(now)} out of work`;
  if (now > then) return message("bad", title, `Up from ${pct(then)} last year.`);
  if (now < then) return message("ok", title, `Down from ${pct(then)} last year.`);
  return message("warn", title, "The same as last year.");
}

/**
 * Traffic light: the UN goal of decent work for all by 2030, as a direction.
 * @param {string} direction   "Improving", "Getting worse", "No change" or "No projection yet"
 * @param {number | null} sinceBasePct  change in unemployed people since the base year, %
 * @param {number} baseYear
 * @returns {Message}
 */
export function sdgStatus(direction, sinceBasePct, baseYear) {
  const since = sinceBasePct == null ? "" : ` Unemployment is ${shown(sinceBasePct, 0) <= 0
    ? `${fmt[0].format(Math.abs(sinceBasePct))}% lower` : `${fmt[0].format(sinceBasePct)}% higher`} than in ${baseYear}.`;
  if (direction === "Improving") return message("ok", "Getting closer", `Fewer people out of work expected next year.${since}`);
  if (direction === "Getting worse") return message("bad", "Moving away", `More people out of work expected next year.${since}`);
  return message("warn", "Standing still", `No clear change expected next year.${since}`);
}

/**
 * Badge on a country card, from its keep-up result.
 * @param {number | null} per100
 * @param {number} yearUne
 * @returns {{ tone: Tone, label: string }}
 */
export function countryBadge(per100, yearUne) {
  if (per100 == null) return shown(yearUne / 1e3, 0) <= 0 ? { tone: "ok", label: "Fewer jobless" } : { tone: "bad", label: "More jobless" };
  if (per100 >= 100) return { tone: "ok", label: "Keeping up" };
  if (per100 >= 90) return { tone: "warn", label: "Almost" };
  return { tone: "bad", label: "Falling behind" };
}
