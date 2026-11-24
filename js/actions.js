// @ts-check
/**
 * "What can I do?": three actions behind a button under the answer (clock-core wireActions). One for everyday life,
 * one close to home, one to ask of leaders. Each has a source; its words are the act.<key>.t / act.<key>.x keys in
 * js/i18n/*.js (every language). Keep claims to what the source says.
 */
/** @type {import("clock-core").Action[]} */
export default [
  { icon: "📚", key: "learn", source: "World Economic Forum, Future of Jobs Report 2025", url: "https://www.weforum.org/publications/the-future-of-jobs-report-2025/" },
  { icon: "🏪", key: "local", source: "ILO, Small Matters (2019)", url: "https://www.ilo.org/publications/small-matters-global-evidence-contribution-employment-self-employed-micro" },
  { icon: "🗳️", key: "youth", source: "ILO, Global Employment Trends for Youth 2024", url: "https://www.ilo.org/publications/major-publications/global-employment-trends-youth-2024" },
];
