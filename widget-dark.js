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

// Timezone + daily tick
const TZ = "America/New_York";
const TICK_HOUR_ET = 4; // 4:00 AM ET

// Layout (optimized for Medium widget)
const DOTS_PER_ROW   = 39; // try 36–40 if you want tweaks
const DOT_FONT_SIZE  = 9;
const ROW_SPACING    = 1;
const GRID_TOP_SPACER = 6;
// ====================

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// Day-of-year in ET (timezone-safe)
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

// Next refresh around 1:00 AM ET (DST-safe)
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

  function matchesET(dateObj, ty, tm, td, th) {
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

  let candidate = new Date(Date.UTC(target.y, target.m - 1, target.d, tickHour, 0, 20));
  for (let i = 0; i < 8; i++) {
    if (matchesET(candidate, target.y, target.m, target.d, tickHour)) break;
    candidate = new Date(candidate.getTime() + 15 * 60 * 1000);
  }
  return candidate;
}

// ---- Compute progress ----
const now = new Date();
const doyET = dayOfYearInTZ(now, TZ);
const filledDots = clamp(doyET, 0, DOTS_TOTAL);
const dateLabel = formatDateInTZ(now, TZ);

// ---- Build widget ----
const w = new ListWidget();
w.backgroundColor = BG_COLOR;
w.setPadding(10, 10, 10, 10);

// Header wrapper
const headerWrap = w.addStack();
headerWrap.layoutVertically();

// Row 1: Title + Date
const row1 = headerWrap.addStack();
row1.layoutHorizontally();

const title = row1.addText("Year in progress");
title.font = Font.semiboldSystemFont(14);
title.textColor = new Color("#E5E7EB"); // light gray (not pure white)

row1.addSpacer();

const dt = row1.addText(dateLabel);
dt.font = Font.mediumSystemFont(10);
dt.textColor = new Color("#9CA3AF"); // muted gray
dt.rightAlignText();

headerWrap.addSpacer(2);

// Row 2: Count (right-aligned)
const row2 = headerWrap.addStack();
row2.layoutHorizontally();
row2.addSpacer();

const count = row2.addText(`${filledDots}/${DOTS_TOTAL}`);
count.font = Font.semiboldSystemFont(12);
count.textColor = new Color("#E5E7EB");
count.rightAlignText();

// Space before grid
w.addSpacer(GRID_TOP_SPACER);

// ---- Dot grid ----
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

// ---- Refresh ----
const nextTick = nextTickDateET(now, TZ, TICK_HOUR_ET);
const fallback = new Date(Date.now() + 60 * 60 * 1000);
w.refreshAfterDate = (nextTick < fallback) ? nextTick : fallback;

Script.setWidget(w);
Script.complete();
