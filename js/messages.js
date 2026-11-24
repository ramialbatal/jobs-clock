// @ts-check
/**
 * Jobs Clock: the plain-language messages shown to visitors. Pure functions, unit tested.
 * Each returns a clock-core Message (tone, icon, short title, one sentence). Keep them short and free of jargon;
 * numbers and method details belong behind "More".
 */
import { shown, fmt, pct, message, t, addStrings } from "clock-core";
import en from "./i18n/en.js";

addStrings("en", en);   // the English words; app.js adds the visitor's language on top

/** @typedef {import("clock-core").Message} Message */
/** @typedef {import("clock-core").Tone} Tone */
/** @typedef {import("./model.js").SdgDir} SdgDir */

/**
 * The one-line answer at the top: are there enough new jobs for the people joining the workforce?
 * @param {number | null} per100   net new jobs per 100 new workers, as displayed (null if the workforce shrinks)
 * @param {number} yearUne         change in unemployed people this year (people)
 * @returns {Message}
 */
export function headline(per100, yearUne) {
  if (per100 == null) return shown(yearUne / 1e3, 0) <= 0
    ? message("ok", t("msg.head.shrinkDown.t"), t("msg.head.shrinkDown.x"))
    : message("bad", t("msg.head.shrinkUp.t"), t("msg.head.shrinkUp.x"));
  const n = fmt[0].format(per100);
  if (per100 >= 100) return message("ok", t("msg.head.ok.t"), t("msg.head.ok.x", { n }));
  if (per100 >= 90) return message("warn", t("msg.head.close.t"), t("msg.head.close.x", { n }));
  return message("bad", t("msg.head.bad.t"), t("msg.head.bad.x", { n }));
}

/**
 * Traffic light: enough new jobs? (the same test as the headline, said briefly).
 * @param {number | null} per100
 * @param {number} yearUne
 * @returns {Message}
 */
export function keepUpStatus(per100, yearUne) {
  if (per100 == null) return shown(yearUne / 1e3, 0) <= 0
    ? message("ok", t("msg.keep.shrinkDown.t"), t("msg.keep.shrinkDown.x"))
    : message("bad", t("msg.keep.shrinkUp.t"), t("msg.keep.shrinkUp.x"));
  const text = t("msg.keep.text", { n: fmt[0].format(per100) });
  if (per100 >= 100) return message("ok", t("msg.keep.ok"), text);
  if (per100 >= 90) return message("warn", t("msg.keep.close"), text);
  return message("bad", t("msg.keep.bad"), text);
}

/**
 * Traffic light: the unemployment rate, compared with last year (as displayed, 1 decimal).
 * @param {number} rate      % this year
 * @param {number} ratePrev  % last year
 * @returns {Message}
 */
export function rateStatus(rate, ratePrev) {
  const now = shown(rate, 1), then = shown(ratePrev, 1);
  const title = t("msg.rate.title", { pct: pct(now) });
  if (now > then) return message("bad", title, t("msg.rate.up", { pct: pct(then) }));
  if (now < then) return message("ok", title, t("msg.rate.down", { pct: pct(then) }));
  return message("warn", title, t("msg.rate.same"));
}

/**
 * Traffic light: the UN goal of decent work for all by 2030, as a direction.
 * @param {SdgDir} direction   from sdgDirection: "better", "worse", "same" or "none" (no projection yet)
 * @param {number | null} sinceBasePct  change in unemployed people since the base year, %
 * @param {number} baseYear
 * @returns {Message}
 */
export function sdgStatus(direction, sinceBasePct, baseYear) {
  const since = sinceBasePct == null ? "" : " " + (shown(sinceBasePct, 0) <= 0
    ? t("msg.sdg.lower", { pct: pct(Math.abs(sinceBasePct), 0), year: baseYear })
    : t("msg.sdg.higher", { pct: pct(sinceBasePct, 0), year: baseYear }));
  if (direction === "better") return message("ok", t("msg.sdg.better.t"), t("msg.sdg.better.x") + since);
  if (direction === "worse") return message("bad", t("msg.sdg.worse.t"), t("msg.sdg.worse.x") + since);
  return message("warn", t("msg.sdg.same.t"), t("msg.sdg.same.x") + since);
}

/**
 * Badge on a country card, from its keep-up result.
 * @param {number | null} per100
 * @param {number} yearUne
 * @returns {{ tone: Tone, label: string }}
 */
export function countryBadge(per100, yearUne) {
  if (per100 == null) return shown(yearUne / 1e3, 0) <= 0
    ? { tone: "ok", label: t("msg.badge.shrinkDown") } : { tone: "bad", label: t("msg.badge.shrinkUp") };
  if (per100 >= 100) return { tone: "ok", label: t("msg.badge.ok") };
  if (per100 >= 90) return { tone: "warn", label: t("msg.badge.close") };
  return { tone: "bad", label: t("msg.badge.bad") };
}
