// @ts-check
/**
 * English words used by the code (messages.js, model.js and app.js). The page's own text is written in English in
 * index.html; fr.js, es.js and ar.js translate both: every key here, plus every data-i18n key in index.html.
 * Placeholders like {pct} are filled by clock-core's t(); keep them, in any order, in every translation.
 */
export default {
  // The answer at the top (messages.js)
  "msg.head.shrinkDown.t": "Fewer people out of work",
  "msg.head.shrinkDown.x": "The workforce is shrinking, and unemployment is falling.",
  "msg.head.shrinkUp.t": "More people out of work",
  "msg.head.shrinkUp.x": "The workforce is shrinking, yet unemployment is rising.",
  "msg.head.ok.t": "Jobs are keeping up",
  "msg.head.ok.x": "For every 100 people joining the workforce, there are {n} new jobs.",
  "msg.head.close.t": "Jobs are almost keeping up",
  "msg.head.close.x": "For every 100 people joining the workforce, there are {n} new jobs. Unemployment edges up.",
  "msg.head.bad.t": "Not enough new jobs",
  "msg.head.bad.x": "For every 100 people joining the workforce, there are only {n} new jobs. Unemployment rises.",

  // Traffic lights (messages.js)
  "msg.keep.shrinkDown.t": "Unemployment falling",
  "msg.keep.shrinkDown.x": "Fewer people are looking for work than at the start of the year.",
  "msg.keep.shrinkUp.t": "Unemployment rising",
  "msg.keep.shrinkUp.x": "More people are looking for work than at the start of the year.",
  "msg.keep.text": "{n} new jobs for every 100 new workers.",
  "msg.keep.ok": "Yes, enough",
  "msg.keep.close": "Almost enough",
  "msg.keep.bad": "Not enough",
  "msg.rate.title": "{pct} out of work",
  "msg.rate.up": "Up from {pct} last year.",
  "msg.rate.down": "Down from {pct} last year.",
  "msg.rate.same": "The same as last year.",
  "msg.sdg.lower": "Unemployment is {pct} lower than in {year}.",
  "msg.sdg.higher": "Unemployment is {pct} higher than in {year}.",
  "msg.sdg.better.t": "Getting closer",
  "msg.sdg.better.x": "Fewer people out of work expected next year.",
  "msg.sdg.worse.t": "Moving away",
  "msg.sdg.worse.x": "More people out of work expected next year.",
  "msg.sdg.same.t": "Standing still",
  "msg.sdg.same.x": "No clear change expected next year.",

  // Country badges (messages.js)
  "msg.badge.shrinkDown": "Fewer jobless",
  "msg.badge.shrinkUp": "More jobless",
  "msg.badge.ok": "Keeping up",
  "msg.badge.close": "Almost",
  "msg.badge.bad": "Falling behind",

  // Verdicts next to the goals (model.js)
  "v.keep.shrinkDown": "Unemployment falling",
  "v.keep.shrinkUp": "Unemployment rising",
  "v.keep.ok": "Keeping up",
  "v.keep.close": "Close",
  "v.keep.bad": "Falling behind",
  "v.sdg.none": "No projection yet",
  "v.sdg.better": "Improving",
  "v.sdg.worse": "Getting worse",
  "v.sdg.same": "No change",

  // Numbers of people (app.js)
  "a.billion": "{n} billion",
  "a.million": "{n} million",
  "a.thousand": "{n} thousand",
  "a.mShort": "{n} M",
  "a.kShort": "{n} k",
  "a.pts": "{n} pts",
  "a.na": "n/a",

  // Cards and the goal section (app.js)
  "a.rest": "Rest of world",
  "a.partOf": "part of {name}",
  "a.jobsAdded": "net jobs added in {year}",
  "a.jobsLost": "net jobs lost in {year}",
  "a.looking": "looking for work now ({pct})",
  "a.more": "More",
  "a.rateTitle": "Unemployment rate {pct} (a full bar is the highest rate shown, {max})",
  "a.dl.rate": "Unemployment rate {year}",
  "a.dl.emp": "Employed {year}",
  "a.dl.net": "Net new jobs, all of {year}",
  "a.dl.une": "Unemployed, change in {year}",
  "a.dl.since": "Net jobs since you opened this page",
  "a.shrinking": "Workforce shrinking · unemployed {n} k this year",
  "a.per100": "{n} jobs per 100 new workers",
  "a.per100Title": "Net new jobs this year as a share of new workers (the marker is 100: enough jobs for all of them)",
  "a.sparkCaption": "rate {first}-{last}",
  "a.sparkTitle": "Unemployment rate, {first} to {last}. Show yearly values",
  "a.sparkLabel": "{name}: unemployment rate {first} to {last}, {change}",
  "a.history": "Employed · yearly change · unemployment rate (* ILO estimate or projection)",
  "a.card.keepUp": "Enough new jobs for new workers?",
  "a.card.rate": "Unemployment",
  "a.card.sdg": "UN goal: decent work for all by 2030",

  // "What can I do?" (js/actions.js)
  "act.learn.t": "Keep learning",
  "act.learn.x": "Free courses in digital and practical skills open new doors. Employers expect about 39% of today's job skills to change by 2030.",
  "act.local.t": "Back small businesses",
  "act.local.x": "Buy local and recommend people you trust. Small firms and the self-employed provide about 70% of jobs in the countries studied by the ILO.",
  "act.youth.t": "Ask for a fair start",
  "act.youth.x": "Ask leaders for training, apprenticeships and help into first jobs: about one young person in five is not in work, education or training.",
};
