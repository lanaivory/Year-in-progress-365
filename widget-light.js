// 365 Dots Year Progress (Medium + Horizontal) — Scriptable
// - Title left: "Year in progress"
// - Right side: Date on top, X/365 below (both right-aligned)
// - 365 dots total (non-leap visualization)
// - Filled dots in cobalt blue based on day-of-year in Eastern Time
// - Requests refresh around 1:00 AM ET (iOS may refresh slightly later)

// ====== CONFIG ======
const DOTS_TOTAL = 365;

// Colors
const FILLED_COLOR = new Color("#0047AB"); // cobalt blue
const EMPTY_COLOR  = new Color("#D1D5DB"); // light grey
const BG_COLOR     = Color.white();

// Timezone + daily tick time
const TZ = "America/New_York";
const TICK_HOUR_ET = 1; // 1:00 AM Eastern

// Layout (tuned for Medium widget)
const DOTS_PER_ROW = 39;     // you can change this (36–40 usually looks great)
const DOT_FONT_SIZE = 9;     // increase to 10 if dots look too small
const ROW_SPACING = 1;       // spacing between dots (0–2)
const GRID_TOP_SPACER = 6;   // vertical space between header and grid
// ====================

function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }

// Day-of-year computed in ET using calendar parts (avoids device timezone drift)
function dayOfYearInTZ(date, timeZone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric"
  }).formatToParts(date);

  const y = Number(parts.find(p => p.type === "year").value);
  const m = Number(parts.find(p => p.type === "month").value);
  const d = Number(parts.find(p => p.type === "day").value);

  const utc = Date.UTC(y, m - 1, d);
  const utcStart = Date.UTC(y, 0, 1);
  return Math.floor((utc - utcStart) / (24 * 60 * 60 * 1000)) + 1; // Jan 1 = 1
}

function formatDateInTZ(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date); // e.g., "Sat, Jan 10"
}

// Next refresh ~1:00 AM ET (DST-safe)
function nextTickDateET(now, timeZone, tickHour) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    hour12: false
  }).formatToParts(now);

  const y = Number(parts.find(p => p.type === "year").value);
  const m = Number(parts.find(p => p.type === "month").value);
  const d = Number(parts.find(p => p.type === "day").value);
  const h = Number(parts.find(p => p.type === "hour").value);

  const target = (h < tickHour) ? { y, m, d } : (() => {
    const base = new Date(Date.UTC(y, m - 1, d));
    base.setUTCDate(base.getUTCDate() + 1);
    return { y: base.getUTCFullYear(), m: base.getUTCMonth() + 1, d: base.getUTCDate() };
  })();

  function matchesET(dateObj, targetY, targetM, targetD, targetH) {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false
    }).formatToParts(dateObj);
    const yy = Number(p.find(x => x.type === "year").value);
    const mm = Number(p.find(x => x.type === "month").value);
    const dd = Number(p.find(x => x.type === "day").value);
    const hh = Number(p.find(x => x.type === "hour").value);
    return yy === targetY && mm === targetM && dd === targetD && hh === targetH;
  }

  let candidate = new Date(Date.UTC(target.y, target.m - 1, target.d, tickHour, 0, 20)); // +20s buffer
  for (let k = 0; k < 8; k++) {
    if (matchesET(candidate, target.y, target.m, target.d, tickHour)) break;
    candidate = new Date(candidate.getTime() + 15 * 60 * 1000); // nudge 15 min
  }
  return candidate;
}

// ---- Compute progress (ET) ----
const now = new Date();
const doyET = dayOfYearInTZ(now, TZ);
const filledDots = clamp(doyET, 0, DOTS_TOTAL);
const dateLabel = formatDateInTZ(now, TZ);

// ---- Build widget ----
const w = new ListWidget();
w.backgroundColor = BG_COLOR;
w.setPadding(10, 10, 10, 10);

// ---- Header (guaranteed: date above count) ----
const headerWrap = w.addStack();
headerWrap.layoutVertically();

// Row 1: Title left + Date right
const row1 = headerWrap.addStack();
row1.layoutHorizontally();

const title = row1.addText("Year in progress");
title.font = Font.semiboldSystemFont(14); // make title slightly bigger
title.textColor = new Color("#111827");

row1.addSpacer();

const dt = row1.addText(dateLabel);
dt.font = Font.mediumSystemFont(10);
dt.textColor = new Color("#6B7280");
dt.rightAlignText();

// Small gap
headerWrap.addSpacer(2);

// Row 2: Count right (blank left spacer)
const row2 = headerWrap.addStack();
row2.layoutHorizontally();
row2.addSpacer();

const count = row2.addText(`${filledDots}/${DOTS_TOTAL}`);
count.font = Font.semiboldSystemFont(12);
count.textColor = new Color("#111827");
count.rightAlignText();

// Space before grid
w.addSpacer(GRID_TOP_SPACER);

// ---- Grid ----
const rowsNeeded = Math.ceil(DOTS_TOTAL / DOTS_PER_ROW);
const grid = w.addStack();
grid.layoutVertically();

let i = 0;
for (let r = 0; r < rowsNeeded; r++) {
  const row = grid.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();   // centers row so it doesn’t hug left
  row.spacing = ROW_SPACING;

  for (let c = 0; c < DOTS_PER_ROW && i < DOTS_TOTAL; c++) {
    const dot = row.addText("●");
    dot.font = Font.systemFont(DOT_FONT_SIZE);
    dot.textColor = (i < filledDots) ? FILLED_COLOR : EMPTY_COLOR;
    i++;
  }
}

// ---- Refresh scheduling ----
const nextTick = nextTickDateET(now, TZ, TICK_HOUR_ET);
const fallback = new Date(Date.now() + 60 * 60 * 1000); // hourly safety
w.refreshAfterDate = (nextTick < fallback) ? nextTick : fallback;

Script.setWidget(w);
Script.complete();
