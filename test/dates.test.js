// Timezone regression tests for the date-range filter helpers.
// Run `npm run test:timezones` to execute them under several TZ offsets;
// the old UTC-based parsing failed in any zone not equal to UTC.

const test = require("node:test");
const assert = require("node:assert/strict");

const { wameParseLocalDate, wameToLocalISODate } = require("../lib/dates.js");

test("wameParseLocalDate parses YYYY-MM-DD as local midnight on that calendar day", () => {
  const d = wameParseLocalDate("2026-09-26");
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 8);
  assert.equal(d.getDate(), 26);
  assert.equal(d.getHours(), 0);
  assert.equal(d.getMinutes(), 0);
});

test("wameParseLocalDate never shifts to the previous/next day (UTC-parse regression)", () => {
  // new Date("2026-01-15") lands on Jan 14 local time west of UTC; the helper must not.
  const d = wameParseLocalDate("2026-01-15");
  assert.equal(d.getDate(), 15);
  assert.equal(d.getMonth(), 0);
});

test("wameParseLocalDate rejects invalid input", () => {
  assert.equal(wameParseLocalDate(""), null);
  assert.equal(wameParseLocalDate(null), null);
  assert.equal(wameParseLocalDate("26/09/2026"), null);
  assert.equal(wameParseLocalDate("2026-13-01"), null);
  assert.equal(wameParseLocalDate("2026-02-30"), null);
});

test("wameToLocalISODate formats with local calendar fields", () => {
  // 23:30 local must stay on the same day; toISOString() would roll it over east of UTC.
  const late = new Date(2026, 8, 26, 23, 30, 0);
  assert.equal(wameToLocalISODate(late), "2026-09-26");
  // 00:30 local must not roll back; toISOString() would roll it back west of UTC.
  const early = new Date(2026, 8, 26, 0, 30, 0);
  assert.equal(wameToLocalISODate(early), "2026-09-26");
});

test("round-trip: parse(format(date)) preserves the calendar day", () => {
  const original = new Date(2026, 11, 31, 12, 0, 0);
  const roundTripped = wameParseLocalDate(wameToLocalISODate(original));
  assert.equal(roundTripped.getFullYear(), original.getFullYear());
  assert.equal(roundTripped.getMonth(), original.getMonth());
  assert.equal(roundTripped.getDate(), original.getDate());
});
