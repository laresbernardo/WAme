// WAme date helpers.
// Date-range filters work on local calendar days. `new Date("YYYY-MM-DD")` parses
// as midnight UTC, which shifts the day in every timezone west/east of UTC, so all
// picker values must go through these helpers instead.

(function (root, factory) {
  const api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }
  Object.assign(root, api);
})(typeof self !== "undefined" ? self : globalThis, function () {
  // Parse a date-picker value ("YYYY-MM-DD") as midnight LOCAL time on that
  // calendar day. Returns null for empty/invalid input.
  function wameParseLocalDate(dateStr) {
    if (!dateStr || typeof dateStr !== "string") return null;
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const date = new Date(year, month - 1, day);
    if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
      return null;
    }
    return date;
  }

  // Format a Date as "YYYY-MM-DD" using LOCAL calendar fields. Unlike
  // Date#toISOString(), this never shifts the day across timezones.
  function wameToLocalISODate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  return { wameParseLocalDate, wameToLocalISODate };
});
