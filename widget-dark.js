// 365 Dots Year Progress — Dark Mode (Bright Blue)
// Scriptable widget (Medium / Large)
// - Dark background
// - Filled dots: bright blue
// - Empty dots: muted gray (not white)
// - Title left, Date above X/365 right
// - Updates daily at ~4:00 AM Eastern Time

// ====== CONFIG ======
const DOTS_TOTAL = 365;

// Colors
const BG_COLOR     = new Color("#0B0F14"); // dark charcoal / near-black
const FILLED_COLOR = new Color("#1E90FF"); // bright blue (clean, modern)
const EMPTY_COLOR  = new Color("#4B5563"); // muted gray (soft, not white)

// Use the user's current timezone automatically
const TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

// Refresh at local midnight
const TICK_HOUR_LOCAL = 0; // 12:00 AM local time (DST-safe)

// Layout (tuned for Medium widget)
const DOTS_PER_ROW = 39;     // 36–40 usually looks great
const DOT_FONT_SIZE = 9;     // increase to 10 if dots look too small
const ROW_SPACING = 1;       // spacing between dots (0–2)
const GRID_TOP_SPACER = 6;   // space between header and grid
// ====================

function clamp(n, min, max) { 
  return Math.max(min, Math.min(max, n)); 
}

// Day-of-year computed in a timezone using calendar parts
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
  return Math.floor((utc - utcStart) / (24 * 60 * 60 * 1000)) + 1;
}

function formatDateInTZ(date, timeZone) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(date);
}

// Next refresh at a given hour in the given timezone (DST-safe)
function nextTickDateTZ(now, timeZone, tickHour) {
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
    return {
      y: base.getUTCFullYear(),
      m: base.getUTCMonth() + 1,
      d: base.getUTCDate()
    };
  })();

  function matchesTZ(dateObj, ty, tm, td, th) {
    const p = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      hour12: false
    }).formatToParts(dateObj);
    return (
      Number(p.find(x => x.type === "year").value) === ty &&
      Number(p.find(x => x.type === "month").value) === tm &&
      Number(p.find(x => x.type === "day").value) === td &&
      Number(p.find(x => x.type === "hour").value) === th
    );
  }

  // start near the target hour, then nudge until it matches in that timezone
  let candidate = new Date(Date.UTC(target.y, target.m - 1, target.d, tickHour, 0, 20));
  for (let k = 0; k < 12; k++) {
    if (matchesTZ(candidate, target.y, target.m, target.d, tickHour)) break;
    candidate = new Date(candidate.getTime() + 10 * 60 * 1000); // nudge 10 min
  }
  return candidate;
}

// ---- Compute progress ----
const now = new Date();
const filledDots = clamp(dayOfYearInTZ(now, TZ), 0, DOTS_TOTAL);
const dateLabel = formatDateInTZ(now, TZ);

// ---- Build widget ----
const w = new ListWidget();
w.backgroundColor = BG_COLOR;
w.setPadding(10, 10, 10, 10);

// ---- Header (Title left, Date + Count right-aligned) ----
const header = w.addStack();
header.layoutHorizontally();
header.centerAlignContent();

// LEFT: Title
const leftCol = header.addStack();
leftCol.layoutVertically();
leftCol.addSpacer();
const title = leftCol.addText("Year in progress");
title.font = Font.semiboldSystemFont(20);
title.textColor = TEXT_COLOR;
leftCol.addSpacer();

// Space between columns
header.addSpacer();

// RIGHT: Date + Count (clean right alignment)
const rightCol = header.addStack();
rightCol.layoutVertically();
rightCol.topAlignContent();

// Date row
const dateRow = rightCol.addStack();
dateRow.layoutHorizontally();
dateRow.addSpacer(); // pushes date to the right edge

const dt = dateRow.addText(dateLabel);
dt.font = Font.mediumSystemFont(13);
dt.textColor = TEXT_COLOR;

// Small vertical gap
rightCol.addSpacer(2);

// Count row
const countRow = rightCol.addStack();
countRow.layoutHorizontally();
countRow.addSpacer(); // pushes count to the same right edge

const count = countRow.addText(`${filledDots}/${DOTS_TOTAL}`);
count.font = Font.semiboldSystemFont(13);
count.textColor = TEXT_COLOR;

// Space before grid (optional – keep your original value)
w.addSpacer(GRID_TOP_SPACER);

// ---- Grid ----
const rowsNeeded = Math.ceil(DOTS_TOTAL / DOTS_PER_ROW);
const grid = w.addStack();
grid.layoutVertically();

let i = 0;
for (let r = 0; r < rowsNeeded; r++) {
  const row = grid.addStack();
  row.layoutHorizontally();
  row.centerAlignContent();
  row.spacing = ROW_SPACING;

  for (let c = 0; c < DOTS_PER_ROW && i < DOTS_TOTAL; c++) {
    const dot = row.addText("●");
    dot.font = Font.systemFont(DOT_FONT_SIZE);
    dot.textColor = (i < filledDots) ? FILLED_COLOR : EMPTY_COLOR;
    i++;
  }
}

// ---- Refresh scheduling ----
// Ask iOS to refresh shortly after local midnight
const nextTick = nextTickDateTZ(now, TZ, TICK_HOUR_LOCAL);
const fallback = new Date(Date.now() + 60 * 60 * 1000);
w.refreshAfterDate = (nextTick < fallback) ? nextTick : fallback;

Script.setWidget(w);
Script.complete();Script.complete();
