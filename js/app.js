// @ts-check
/**
 * Jobs Clock: loads ILO data, renders the page and runs the live counters.
 * Calculations live in model.js (pure, tested); settings in config.js; the picture behind the header in scene.js.
 *
 * Sections: Data · Rendering helpers · World goal section · Page (render) · Boot.
 */
import * as C from "clock-core";
import CFG from "./config.js";
import { jobsEntry, keepUpVerdict, keepUpRank, sdgDirection, worldSummary, subtractSeries, rateFromLevels } from "./model.js";
import { headline, keepUpStatus, rateStatus, sdgStatus, countryBadge } from "./messages.js";
import { jobsScene } from "./scene.js";

const { YEAR, fmt, pct, signed, setText, escapeHtml, t } = C;
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
  // `where` guards against the API ever ignoring the sex/age filters in the URL
  const cols = { code: "ref_area", year: "time", value: "obs_value", wanted: codes,
    where: (/** @type {Record<string, string>} */ r) => (!r.sex || r.sex === "SEX_T") && (!r.classif1 || r.classif1 === "AGE_YTHADULT_YGE15") };
  const [e, u, r] = await Promise.all([I.employed, I.unemployed, I.rate].map((id) => C.fetchCsv(url(id))));
  const data = {
    employed: C.seriesByCode(e, { ...cols, scale: 1000 }),     // ILO counts in thousands
    unemployed: C.seriesByCode(u, { ...cols, scale: 1000 }),
    rate: C.seriesByCode(r, cols)
  };
  if (!data.employed[CFG.world] || !data.unemployed[CFG.world]) throw new Error("World figures missing from response");
  const missing = CFG.countries.filter((c) => !data.employed[c.code] || !data.unemployed[c.code]).map((c) => c.code);
  if (missing.length) console.warn("No employment or unemployment data for:", missing.join(", "));
  return { data, fetchedAt: new Date() };
});

// ---- Rendering helpers ---------------------------------------------------------------
/** @param {number} n */
function people(n) {
  const a = Math.abs(n), s = n < 0 ? "-" : "";
  if (a >= 1e9) return t("a.billion", { n: s + fmt[2].format(a / 1e9) });
  if (a >= 1e6) return t("a.million", { n: s + fmt[1].format(a / 1e6) });
  if (a >= 1e3) return t("a.thousand", { n: s + fmt[0].format(a / 1e3) });
  return s + fmt[0].format(a);
}

/** Class for a change where up is good (jobs) or bad (unemployment), as displayed. */
const cls = {
  /** @param {number} x @param {number} d */ upGood: (x, d) => C.changeClass(x, d, "up"),
  /** @param {number} x @param {number} d */ upBad: (x, d) => C.changeClass(x, d, "down")
};

/** @param {Entry} e */
function sparkFor(e) {
  const ys = Object.keys(e.rate).map(Number).filter((y) => y <= YEAR).sort((a, b) => a - b);
  const vals = ys.map((y) => e.rate[y]);
  const ch = vals[vals.length - 1] - vals[0];
  const changeText = t("a.pts", { n: signed(ch, fmt[1]) });
  const first = ys[0], last = ys[ys.length - 1];
  return C.sparkline(ys, vals, {
    caption: t("a.sparkCaption", { first, last: String(last).slice(2) }), change: ch, changeText, good: "down",
    title: t("a.sparkTitle", { first, last }),
    label: t("a.sparkLabel", { name: e.name, first, last, change: changeText })
  });
}

/** @param {Entry} e */
function historyTable(e) {
  const rows = e.years.slice().reverse().map((y) => {
    const d = e.emp[y - 1] != null ? (e.emp[y] - e.emp[y - 1]) / 1e6 : null;
    return `<tr><th>${y}${y >= YEAR - 1 ? "*" : ""}</th><td>${people(e.emp[y])}</td><td class="${
      d == null ? "" : cls.upGood(d, 1)}">${d == null ? "" : t("a.mShort", { n: signed(d, fmt[1]) })}</td><td>${
      e.rate[y] != null ? pct(e.rate[y]) : ""}</td></tr>`;
  }).join("");
  return `<div class="history" hidden><table><caption>${t("a.history")}</caption>${rows}</table></div>`;
}

/** @param {Entry} e */
function cardGoalHtml(e) {
  const v = keepUpVerdict(e);
  const label = e.per100 == null
    ? t("a.shrinking", { n: signed(e.yearUne / 1e3) })
    : t("a.per100", { n: fmt[0].format(Math.min(e.per100, 999)) });
  const bar = e.per100 == null ? "" : `<div class="goal-bar" title="${escapeHtml(t("a.per100Title"))}">
        <i style="width:${Math.min(e.per100, 100)}%"></i><span style="inset-inline-start:100%"></span></div>`;
  return `<div class="card-goal">${bar}<p><span>${escapeHtml(label)}</span><span class="verdict ${v.cls}">${escapeHtml(v.text)}</span></p></div>`;
}

// ---- World goal section ----------------------------------------------------------------
/** @param {JobsEntry} world */
function renderGoal(world) {
  C.showVerdict($("goal-verdict"), keepUpVerdict(world));
  $("g-newworkers-year").textContent = people(world.newWorkers);
  $("g-jobs-year").textContent = people(world.yearNet);
  $("g-per100").textContent = world.per100 == null ? t("a.na") : fmt[0].format(world.per100);
  const sum = worldSummary(world, CFG.sdgBaseYear), next = world.une[YEAR + 1];
  C.showVerdict($("sdg-verdict"), sdgDirection(world.une));
  C.fill("sdg-base-year", CFG.sdgBaseYear);
  $("sdg-base").textContent = sum.sdgBase != null ? people(sum.sdgBase) : t("a.na");
  $("sdg-now").textContent = people(world.uneY);
  $("sdg-change").textContent = sum.sdgChangePct != null ? C.signedPct(sum.sdgChangePct, 0) : t("a.na");
  $("sdg-next-clause").hidden = next == null;   // no "the ILO expects n/a" before a new projection is out
  if (next != null) $("sdg-next").textContent = people(next);
  /** @param {number} ty  time in fractional years */
  return (ty) => {
    const jobs = world.jobsAt(ty), workers = world.workersAt(ty);
    setText($("g-jobs"), fmt[0].format(jobs));
    setText($("g-workers"), fmt[0].format(workers));
    $("g-bar").style.width = Math.max(0, Math.min(jobs / workers, 1)) * 100 + "%";
  };
}

// ---- Page ------------------------------------------------------------------------------
const T0 = Date.now();

/** @param {{ employed: Record<string, C.Series>, unemployed: Record<string, C.Series>, rate: Record<string, C.Series> }} data */
function render(data) {
  const W = CFG.world;
  const world = jobsEntry(data.employed[W], data.unemployed[W], data.rate[W] || {});

  /** @type {Entry[]} */
  const entries = CFG.countries
    .filter((c) => data.employed[c.code] && data.unemployed[c.code])
    .map((c) => ({ ...c, name: C.regionName(C.flagRegion(c.flag), c.name), ...jobsEntry(data.employed[c.code], data.unemployed[c.code], data.rate[c.code] || {}) }));
  const top = entries.filter((e) => !e.partOf);
  const rEmp = subtractSeries(data.employed[W], top.map((e) => e.emp));
  const rUne = subtractSeries(data.unemployed[W], top.map((e) => e.une));
  entries.push({ code: "ROW", flag: "🌐", name: t("a.rest"), rest: true, ...jobsEntry(rEmp, rUne, rateFromLevels(rEmp, rUne)) });

  // Header fill-ins
  const sum = worldSummary(world, CFG.sdgBaseYear);
  C.fill("first", CFG.historyFrom);
  C.fill("prev", YEAR - 1);
  C.fill("next", YEAR + 1);
  $("w-yearnet").textContent = people(world.yearNet);
  $("w-emp").textContent = people(world.empY);
  $("w-emp-prev").textContent = people(world.emp[YEAR - 1]);
  $("w-rate").textContent = pct(world.rateY);
  $("w-rate-prev").textContent = pct(world.ratePrev);
  $("w-years").textContent = sum.yearsToEmployAll != null ? fmt[1].format(sum.yearsToEmployAll) : t("a.na");
  $("w-une-year").textContent = people(world.uneY);
  $("w-net-year").textContent = people(world.yearNet);
  const goalTick = renderGoal(world);

  // The answer and the traffic lights
  C.showAnswer(headline(world.per100, world.yearUne));
  $("status-cards").innerHTML = [
    C.statusCard({ label: t("a.card.keepUp"), msg: keepUpStatus(world.per100, world.yearUne),
      pct: world.per100, barLabel: world.per100 == null ? "" : t("a.per100", { n: fmt[0].format(world.per100) }) }),
    C.statusCard({ label: t("a.card.rate"), msg: rateStatus(world.rateY, world.ratePrev) }),
    C.statusCard({ label: t("a.card.sdg"),
      msg: sdgStatus(sdgDirection(world.une).dir, sum.sdgChangePct, CFG.sdgBaseYear) })
  ].join("");

  // The rate bar is scaled to the highest rate shown, and says so.
  const maxRate = Math.max(...entries.map((e) => e.rateY));
  const grid = $("grid");
  grid.innerHTML = "";
  const cards = entries.map((e) => {
    const el = document.createElement("article");
    el.className = "card" + (e.rest ? " rest" : "");
    const badge = countryBadge(e.per100, e.yearUne);
    el.innerHTML = `
      <header>
        <span class="flag" aria-hidden="true">${e.flag}</span>
        <h3>${escapeHtml(e.name)}</h3>
        ${e.partOf ? `<span class="tag">${escapeHtml(t("a.partOf", { name: C.regionName(e.partOf, e.partOf) }))}</span>` : ""}
        ${C.badge(badge.tone, badge.label)}
      </header>
      <div class="ytd"><span class="num">0</span> <small class="num-label">${t("a.jobsAdded", { year: YEAR })}</small></div>
      <p class="unemp-line"><span class="une">0</span> <small>${t("a.looking", { pct: pct(e.rateY) })}</small></p>
      <details class="more-info">
        <summary>${t("a.more")}</summary>
        ${e.rest ? "" : sparkFor(e)}
        <div class="bar" title="${escapeHtml(t("a.rateTitle", { pct: pct(e.rateY), max: pct(maxRate) }))}"><i class="u" style="width:${(e.rateY / maxRate) * 100}%"></i></div>
        <dl>
          <div><dt>${t("a.dl.rate", { year: YEAR })}</dt><dd class="${cls.upBad(C.shown(e.rateY, 1) - C.shown(e.ratePrev, 1), 1)}">${pct(e.rateY)} <small>(${pct(e.ratePrev)})</small></dd></div>
          <div><dt>${t("a.dl.emp", { year: YEAR })}</dt><dd>${people(e.empY)}</dd></div>
          <div><dt>${t("a.dl.net", { year: YEAR })}</dt><dd class="${cls.upGood(e.yearNet / 1e6, 2)}">${t("a.mShort", { n: signed(e.yearNet / 1e6, fmt[2]) })}</dd></div>
          <div><dt>${t("a.dl.une", { year: YEAR })}</dt><dd class="${cls.upBad(e.yearUne / 1e3, 0)}">${t("a.kShort", { n: signed(e.yearUne / 1e3) })}</dd></div>
          <div class="wide"><dt>${t("a.dl.since")}</dt><dd class="since">0</dd></div>
        </dl>
        ${cardGoalHtml(e)}
        ${e.rest ? "" : `<button type="button" class="more" aria-expanded="false">${t("core.yearly")} <span aria-hidden="true">▾</span></button>${historyTable(e)}`}
      </details>`;
    C.wireHistory(el);
    grid.appendChild(el);
    return {
      e, el, ytd: /** @type {HTMLElement} */ (el.querySelector(".ytd")), label: el.querySelector(".num-label"),
      num: el.querySelector(".num"), une: el.querySelector(".une"), since: el.querySelector(".since")
    };
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
  C.wireShowAll(grid, $("show-all"), cards.length);

  const opened = C.tYears(T0);
  const openedJobs = new Map(cards.map((c) => [c, c.e.jobsAt(opened)]));
  const worldOpened = world.jobsAt(opened);
  C.startTicker((now) => {
    const ty = C.tYears(now);
    const jobs = world.jobsAt(ty);
    setText($("w-jobs"), (C.shownSign(jobs) < 0 ? "-" : "") + C.digits(fmt[0].format(Math.abs(jobs))), true);
    setText($("w-une"), C.digits(fmt[0].format(world.unemployedAt(ty))), true);
    setText($("w-jobs-sec"), fmt[2].format(world.jobsPerSecAt(ty)));
    setText($("w-jobs-since"), signed(jobs - worldOpened));
    setText($("w-une-since"), signed(world.unemployedAt(ty) - world.u0));
    const share = world.yearNet > 0 ? Math.max(0, Math.min(jobs / world.yearNet, 1)) : 0;   // share of the year's net jobs so far
    setText($("w-pct"), fmt[2].format(share * 100));
    $("w-bar").style.width = share * 100 + "%";
    for (const c of cards) {
      const j = c.e.jobsAt(ty), lost = C.shownSign(j) < 0;   // "added" or "lost" follows the live number
      c.ytd.classList.toggle("neg", lost);
      setText(c.label, t(lost ? "a.jobsLost" : "a.jobsAdded", { year: YEAR }));
      setText(c.num, fmt[0].format(Math.abs(j)));
      setText(c.une, fmt[0].format(c.e.unemployedAt(ty)));
      setText(c.since, signed(j - (openedJobs.get(c) ?? 0)));
    }
    goalTick(ty);
  });
}

// ---- Boot ------------------------------------------------------------------------------
async function show() {
  try {
    const { data, fetchedAt } = await loadData();
    render(data);
    $("fetched-at").textContent = fetchedAt.toLocaleString(C.locale());
    C.setState("ready");
  } catch (err) {
    console.error(err);
    C.stopTicker();
    C.setState("error", err instanceof Error ? err.message : String(err));
  }
}

// Language first (the inline script in index.html chose it), so everything below is drawn in it.
await C.startLanguage((code) => import(`./i18n/${code}.js`), document.querySelector("header.top .wrap"));
C.wireEmbed(document.querySelector("footer.foot"));
C.startScene(document.querySelector("canvas.scene"), jobsScene(), { groundAt: document.querySelector("header.top") });
C.wireHelp();
C.fill("year", YEAR);
C.fill("source", CFG.source);
$("retry").addEventListener("click", () => { C.setState("loading"); show(); });
show();
