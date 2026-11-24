// @ts-check
/**
 * Jobs Clock: loads ILO data, renders the page and runs the live counters.
 * Calculations live in model.js (pure, tested); settings in config.js.
 */
import * as C from "clock-core";
import CFG from "./config.js";
import { jobsEntry, keepUpVerdict, keepUpRank, sdgDirection, subtractSeries, rateFromLevels } from "./model.js";

const { YEAR, fmt, signed, setText, escapeHtml } = C;
/** @param {string} id */
const $ = (id) => /** @type {HTMLElement} */ (document.getElementById(id));
/** @typedef {import("./model.js").JobsEntry} JobsEntry */
/** @typedef {import("./config.js").Country & JobsEntry & { rest?: boolean }} Entry */

// ---- Data ------------------------------------------------------------------------
const codes = [CFG.world, ...CFG.countries.map((c) => c.code)];

/** @param {string} indicator */
function url(indicator) {
  const q = new URLSearchParams({
    id: indicator, sex: "SEX_T", classif1: "AGE_YTHADULT_YGE15", timefrom: String(CFG.historyFrom), format: ".csv"
  });
  // ILOSTAT joins areas with "+"; added by hand so it isn't encoded as a space.
  return `${CFG.apiBase}?${q}&ref_area=${codes.join("+")}`;
}

const loadData = C.once(async () => {
  const I = CFG.indicators;
  const cols = { code: "ref_area", year: "time", value: "obs_value", wanted: codes };
  const [e, u, r] = await Promise.all([I.employed, I.unemployed, I.rate].map((id) => C.fetchCsv(url(id))));
  const data = {
    employed: C.seriesByCode(e, { ...cols, scale: 1000 }),     // ILO counts in thousands
    unemployed: C.seriesByCode(u, { ...cols, scale: 1000 }),
    rate: C.seriesByCode(r, cols)
  };
  if (!data.employed[CFG.world] || !data.unemployed[CFG.world]) throw new Error("World figures missing from response");
  const missing = CFG.countries.filter((c) => !data.employed[c.code]).map((c) => c.code);
  if (missing.length) console.warn("No employment data for:", missing.join(", "));
  return { data, fetchedAt: new Date() };
});

// ---- Rendering helpers ---------------------------------------------------------------
/** @param {number} n */
function people(n) {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e9) return s + fmt[2].format(a / 1e9) + " billion";
  if (a >= 1e6) return s + fmt[1].format(a / 1e6) + " million";
  if (a >= 1e3) return s + fmt[0].format(a / 1e3) + " thousand";
  return s + fmt[0].format(a);
}

/** @param {Entry} e */
function sparkFor(e) {
  const ys = Object.keys(e.rate).map(Number).filter((y) => y <= YEAR).sort((a, b) => a - b);
  const vals = ys.map((y) => e.rate[y]);
  const ch = vals[vals.length - 1] - vals[0];
  return C.sparkline(ys, vals, {
    caption: `rate ${ys[0]}-${String(ys[ys.length - 1]).slice(2)}`, change: ch,
    changeText: signed(ch, fmt[1]) + " pts", good: "down",
    title: `Unemployment rate, ${ys[0]} to ${ys[ys.length - 1]}. Show yearly values`
  });
}

/** @param {Entry} e */
function historyTable(e) {
  const rows = e.years.slice().reverse().map((y) => {
    const d = e.emp[y - 1] != null ? e.emp[y] - e.emp[y - 1] : null;
    return `<tr><th>${y}${y >= YEAR - 1 ? "*" : ""}</th><td>${people(e.emp[y])}</td><td class="${
      d == null ? "" : d > 0 ? "good" : d < 0 ? "bad" : ""}">${d == null ? "" : signed(d / 1e6, fmt[1]) + " M"}</td><td>${
      e.rate[y] != null ? fmt[1].format(e.rate[y]) + "%" : ""}</td></tr>`;
  }).join("");
  return `<div class="history" hidden><table><caption>Employed · yearly change · unemployment rate (* ILO estimate or projection)</caption>${rows}</table></div>`;
}

/** @param {Entry} e */
function cardGoalHtml(e) {
  const v = keepUpVerdict(e);
  const label = e.keepUp == null
    ? `Workforce shrinking · unemployed ${signed(e.yearUne / 1e3)} k this year`
    : `${fmt[0].format(Math.min(e.keepUp, 9.99) * 100)} jobs per 100 new workers`;
  const bar = e.keepUp == null ? "" : `<div class="goal-bar" title="Net new jobs this year as a share of new workers (the marker is 100: enough jobs for all of them)">
        <i style="width:${Math.min(e.keepUp, 1) * 100}%"></i><span style="left:100%"></span></div>`;
  return `<div class="card-goal">${bar}<p><span>${label}</span><span class="verdict ${v.cls}">${v.text}</span></p></div>`;
}

// ---- World goal section ----------------------------------------------------------------
/** @param {JobsEntry} world */
function renderGoal(world) {
  C.showVerdict($("goal-verdict"), keepUpVerdict(world));
  $("g-newworkers-year").textContent = people(world.newWorkers);
  $("g-jobs-year").textContent = people(world.yearNet);
  $("g-per100").textContent = world.keepUp == null ? "n/a" : fmt[0].format(world.keepUp * 100);
  const dir = sdgDirection(world.une);
  $("sdg-verdict").textContent = dir.text;
  $("sdg-verdict").className = "verdict " + dir.cls;
  const base = world.une[CFG.historyFrom], next = world.une[YEAR + 1];
  $("sdg-base").textContent = people(base);
  $("sdg-now").textContent = people(world.uneY);
  $("sdg-change").textContent = signed((world.uneY / base - 1) * 100) + "%";
  $("sdg-next").textContent = next != null ? people(next) : "n/a";
  /** @param {number} t */
  return (t) => {
    const jobs = world.jobsAt(t), workers = world.workersAt(t);
    setText($("g-jobs"), fmt[0].format(jobs));
    setText($("g-workers"), fmt[0].format(workers));
    $("g-bar").style.width = Math.max(0, Math.min(jobs / workers, 1)) * 100 + "%";
  };
}

// ---- Page ------------------------------------------------------------------------------
const T0 = Date.now();

/** @param {{ employed: Record<string, Record<number, number>>, unemployed: Record<string, Record<number, number>>, rate: Record<string, Record<number, number>> }} data */
function render(data) {
  const W = CFG.world;
  const world = jobsEntry(data.employed[W], data.unemployed[W], data.rate[W] || {});

  /** @type {Entry[]} */
  const entries = CFG.countries
    .filter((c) => data.employed[c.code] && data.unemployed[c.code])
    .map((c) => ({ ...c, ...jobsEntry(data.employed[c.code], data.unemployed[c.code], data.rate[c.code] || {}) }));
  const top = entries.filter((e) => !e.partOf);
  const rEmp = subtractSeries(data.employed[W], top.map((e) => e.emp));
  const rUne = subtractSeries(data.unemployed[W], top.map((e) => e.une));
  entries.push({ code: "ROW", flag: "🌐", name: "Rest of world", rest: true, ...jobsEntry(rEmp, rUne, rateFromLevels(rEmp, rUne)) });

  // Header fill-ins
  C.fill("first", CFG.historyFrom);
  C.fill("prev", YEAR - 1);
  C.fill("next", YEAR + 1);
  $("w-yearnet").textContent = people(world.yearNet);
  $("w-emp").textContent = people(world.empY);
  $("w-emp-prev").textContent = people(world.emp[YEAR - 1]);
  $("w-rate").textContent = fmt[1].format(world.rateY) + "%";
  $("w-rate-prev").textContent = fmt[1].format(world.ratePrev) + "%";
  $("w-years").textContent = fmt[1].format(world.uneY / world.yearNet);
  $("w-une-year").textContent = people(world.uneY);
  $("w-net-year").textContent = people(world.yearNet);
  const goalTick = renderGoal(world);

  const grid = $("grid");
  grid.innerHTML = "";
  const cards = entries.map((e) => {
    const el = document.createElement("article");
    el.className = "card" + (e.rest ? " rest" : "");
    const r1 = Math.round(e.rateY * 10), r0 = Math.round(e.ratePrev * 10);   // compare as displayed
    const rateCls = r1 > r0 ? "bad" : r1 < r0 ? "good" : "";
    const lost = e.yearNet < 0;
    el.innerHTML = `
      <header>
        <span class="flag" aria-hidden="true">${e.flag}</span>
        <h3>${escapeHtml(e.name)}</h3>
        ${e.partOf ? `<span class="tag">part of ${escapeHtml(e.partOf)}</span>` : ""}
        ${e.rest ? "" : sparkFor(e)}
      </header>
      <div class="ytd jobs${lost ? " neg" : ""}"><span class="num">0</span> <small>net jobs ${lost ? "lost" : "added"} in ${YEAR}</small></div>
      <p class="unemp-line"><span class="une">0</span> <small>unemployed now</small></p>
      <div class="bar" title="Unemployment rate ${fmt[1].format(e.rateY)}%"><i class="u" style="width:${Math.min(e.rateY * 4, 100)}%"></i></div>
      <dl>
        <div><dt>Unemployment rate ${YEAR}</dt><dd class="${rateCls}">${fmt[1].format(e.rateY)}% <small>(${fmt[1].format(e.ratePrev)}%)</small></dd></div>
        <div><dt>Employed ${YEAR}</dt><dd>${people(e.empY)}</dd></div>
        <div><dt>Net new jobs, all of ${YEAR}</dt><dd class="${e.yearNet >= 0 ? "good" : "bad"}">${signed(e.yearNet / 1e6, fmt[2])} M</dd></div>
        <div><dt>Unemployed vs ${YEAR - 1}</dt><dd class="${e.uneDelta > 0 ? "bad" : e.uneDelta < 0 ? "good" : ""}">${signed(e.uneDelta / 1e3)} k</dd></div>
        <div class="wide"><dt>Net jobs since you opened this page</dt><dd class="since">0</dd></div>
      </dl>
      ${cardGoalHtml(e)}
      ${e.rest ? "" : `<button type="button" class="more" aria-expanded="false">Yearly data <span aria-hidden="true">▾</span></button>${historyTable(e)}`}`;
    C.wireHistory(el);
    grid.appendChild(el);
    return { e, el, num: el.querySelector(".num"), une: el.querySelector(".une"), since: el.querySelector(".since") };
  });

  const sortSel = /** @type {HTMLSelectElement} */ ($("sort"));
  /** @type {Record<string, (c: typeof cards[number]) => number | string>} */
  const keys = {
    jobs: (c) => c.e.yearNet,
    keepup: (c) => keepUpRank(c.e),
    rate: (c) => c.e.rateY,
    unemployed: (c) => c.e.uneY,
    name: (c) => c.e.name
  };
  const sortCards = () => C.sortInto(grid, cards, keys[sortSel.value]);
  sortSel.onchange = sortCards;
  sortCards();

  const opened = C.tYears(T0);
  const openedJobs = new Map(cards.map((c) => [c, c.e.jobsAt(opened)]));
  const worldOpened = world.jobsAt(opened);
  C.startTicker((now) => {
    const t = C.tYears(now), frac = C.yearFraction(now);
    const jobs = world.jobsAt(t);
    setText($("w-jobs"), (jobs < 0 ? "-" : "") + C.digits(fmt[0].format(Math.abs(jobs))), true);
    setText($("w-une"), C.digits(fmt[0].format(world.unemployedAt(t))), true);
    setText($("w-jobs-sec"), fmt[2].format(world.yearNet / C.SEC_PER_YEAR));
    setText($("w-jobs-since"), signed(jobs - worldOpened));
    setText($("w-une-since"), signed(world.unemployedAt(t) - world.u0));
    setText($("w-pct"), fmt[2].format(frac * 100));
    $("w-bar").style.width = frac * 100 + "%";
    for (const c of cards) {
      setText(c.num, fmt[0].format(Math.abs(c.e.jobsAt(t))));
      setText(c.une, fmt[0].format(c.e.unemployedAt(t)));
      setText(c.since, signed(c.e.jobsAt(t) - (openedJobs.get(c) ?? 0)));
    }
    goalTick(t);
  });
}

// ---- Boot ------------------------------------------------------------------------------
async function show() {
  try {
    const { data, fetchedAt } = await loadData();
    render(data);
    $("fetched-at").textContent = fetchedAt.toLocaleString();
    C.setState("ready");
  } catch (err) {
    console.error(err);
    C.stopTicker();
    C.setState("error", err instanceof Error ? err.message : String(err));
  }
}

C.wireHelp();
C.fill("year", YEAR);
C.fill("source", CFG.source);
$("retry").addEventListener("click", () => { C.setState("loading"); show(); });
show();
