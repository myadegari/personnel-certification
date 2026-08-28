import * as gregorian from "date-fns"
import { enUS as gregorianEnUS, faIR as gregorianFaIR } from "date-fns/locale"
import * as jalali from "date-fns-jalali"
import { enUS as jalaliEnUS, faIR as jalaliFaIR } from "date-fns-jalali/locale"

import { normalizePersianDigits } from "@/lib/normalize-persian-digits";

const persianDigitMap = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"]

/** Converts every plain 0-9 digit in a string to its Persian (۰-۹) equivalent. */
export function toPersianDigits(value) {
  return value.replace(/[0-9]/g, (digit) => persianDigitMap[Number(digit)]);
}

/** Converts Persian/Arabic-Indic digits back to plain 0-9. Alias of normalizePersianDigits. */
export const toLatinDigits = normalizePersianDigits

function calendarLib(calendarType) {
  return calendarType === "shamsi" ? jalali : gregorian
}

function calendarLocale(calendarType, locale) {
  if (calendarType === "shamsi") {
    return locale === "en" ? jalaliEnUS : jalaliFaIR
  }
  return locale === "en" ? gregorianEnUS : gregorianFaIR
}

function defaultLocale(calendarType) {
  return calendarType === "shamsi" ? "fa" : "en"
}

function resolveOptions(options = {}) {
  const calendarType = options.calendarType ?? "shamsi"
  const locale = options.locale ?? defaultLocale(calendarType)
  const digits = options.digits ?? defaultLocale(calendarType)
  return { calendarType, locale, digits }
}

/**
 * Formats a date using date-fns tokens (`yyyy/MM/dd`, `EEEE d MMMM`, ...),
 * switching between the Jalali and Gregorian calendars via `calendarType`.
 */
export function formatDate(date, pattern, options = {}) {
  const { calendarType, locale, digits } = resolveOptions(options)
  const lib = calendarLib(calendarType)
  const result = lib.format(date, pattern, {
    locale: calendarLocale(calendarType, locale),
  })
  return digits === "fa" ? toPersianDigits(result) : result;
}

/**
 * Parses a date string against a date-fns pattern. Normalizes Persian/Arabic-Indic
 * digits before parsing. Returns `null` instead of an invalid Date on failure.
 */
export function parseDate(value, pattern, referenceDate = new Date(), options = {}) {
  const { calendarType } = resolveOptions(options)
  const lib = calendarLib(calendarType)
  const normalized = normalizePersianDigits(value)
  const parsed = lib.parse(normalized, pattern, referenceDate)
  return lib.isValid(parsed) ? parsed : null;
}

/** True if `value` is a valid, non-NaN Date. */
export function isValidDate(value) {
  return value instanceof Date && gregorian.isValid(value);
}

/** Reads a date's calendar fields (1-indexed month) in the given calendar. */
export function toParts(date, calendarType = "shamsi") {
  const lib = calendarLib(calendarType)
  return {
    year: lib.getYear(date),
    month: lib.getMonth(date) + 1,
    day: lib.getDate(date),
  };
}

/** Builds a Date (at local midnight) from calendar fields (1-indexed month). */
export function fromParts(parts, calendarType = "shamsi") {
  const lib = calendarLib(calendarType)
  // year/month/day are all overwritten below and startOfDay strips the
  // time-of-day, so the starting point is arbitrary -- use a fixed date
  // instead of `new Date()` so this function doesn't depend on the current
  // time (and stays safe to call during SSR/prerender).
  let date = lib.setYear(new Date(0), parts.year)
  date = lib.setMonth(date, parts.month - 1)
  date = lib.setDate(date, parts.day)
  return lib.startOfDay(date);
}

/** Shorthand for `toParts(date, "shamsi")`. */
export function toShamsi(date) {
  return toParts(date, "shamsi");
}

/** Shorthand for `toParts(date, "miladi")`. */
export function toMiladi(date) {
  return toParts(date, "miladi");
}

/** Shorthand for `fromParts(parts, "shamsi")`. */
export function fromShamsi(parts) {
  return fromParts(parts, "shamsi");
}

/** Shorthand for `fromParts(parts, "miladi")`. */
export function fromMiladi(parts) {
  return fromParts(parts, "miladi");
}

export function today() {
  return gregorian.startOfDay(new Date());
}

export function now() {
  return new Date();
}

export function addDays(date, amount) {
  return gregorian.addDays(date, amount);
}

export function addWeeks(date, amount) {
  return gregorian.addWeeks(date, amount);
}

export function addMonths(date, amount, calendarType = "shamsi") {
  return calendarLib(calendarType).addMonths(date, amount);
}

export function addYears(date, amount, calendarType = "shamsi") {
  return calendarLib(calendarType).addYears(date, amount);
}

export function startOfDay(date) {
  return gregorian.startOfDay(date);
}

export function endOfDay(date) {
  return gregorian.endOfDay(date);
}

/** Week starts on Saturday for "shamsi", Sunday for "miladi". */
export function startOfWeek(date, calendarType = "shamsi") {
  return calendarLib(calendarType).startOfWeek(date);
}

export function endOfWeek(date, calendarType = "shamsi") {
  return calendarLib(calendarType).endOfWeek(date);
}

export function startOfMonth(date, calendarType = "shamsi") {
  return calendarLib(calendarType).startOfMonth(date);
}

export function endOfMonth(date, calendarType = "shamsi") {
  return calendarLib(calendarType).endOfMonth(date);
}

export function startOfYear(date, calendarType = "shamsi") {
  return calendarLib(calendarType).startOfYear(date);
}

export function endOfYear(date, calendarType = "shamsi") {
  return calendarLib(calendarType).endOfYear(date);
}

export function daysInMonth(date, calendarType = "shamsi") {
  return calendarLib(calendarType).getDaysInMonth(date);
}

export function isLeapYear(date, calendarType = "shamsi") {
  return calendarLib(calendarType).isLeapYear(date);
}

/** Real elapsed days between two dates, independent of calendar system. */
export function daysBetween(from, to) {
  return gregorian.differenceInCalendarDays(to, from);
}

/** Calendar-month distance between two dates; month length depends on calendarType. */
export function monthsBetween(from, to, calendarType = "shamsi") {
  return calendarLib(calendarType).differenceInCalendarMonths(to, from);
}

export function isSameDay(a, b) {
  return gregorian.isSameDay(a, b);
}

export function isBefore(a, b) {
  return gregorian.isBefore(a, b);
}

export function isAfter(a, b) {
  return gregorian.isAfter(a, b);
}

export function isToday(date) {
  return gregorian.isToday(date);
}

export function isPast(date) {
  return gregorian.isPast(date);
}

export function isFuture(date) {
  return gregorian.isFuture(date);
}

export function minDate(...dates) {
  return gregorian.min(dates);
}

export function maxDate(...dates) {
  return gregorian.max(dates);
}

/** Clamps `date` between optional `min`/`max` bounds (inclusive). */
export function clampDate(
  date,
  {
    min,
    max
  }
) {
  if (min && isBefore(date, min)) return min
  if (max && isAfter(date, max)) return max
  return date
}

/** Inclusive day list between `from` and `to`. */
export function eachDayOfRange(from, to) {
  return gregorian.eachDayOfInterval({ start: from, end: to });
}

/** True when `date` falls within `range` (inclusive, missing bounds are open-ended). */
export function isWithinRange(date, range) {
  if (range.from && isBefore(date, startOfDay(range.from))) return false
  if (range.to && isAfter(date, endOfDay(range.to))) return false
  return true
}

/** Inclusive day count spanned by a range, or 0 if incomplete. */
export function rangeLengthInDays(range) {
  if (!range.from || !range.to) return 0
  return daysBetween(range.from, range.to) + 1;
}

/**
 * Click-to-toggle logic for a two-endpoint range picker: clicking an
 * already-selected endpoint clears just that endpoint, leaving the other one
 * in place. The next click fills whichever slot is empty, keeping `from`
 * chronologically before `to` -- if the new day would invert that order, it
 * swaps into the other slot instead (e.g. clicking an earlier day while only
 * `to` is empty makes that day the new `from` and shifts the old `from` into
 * `to`, rather than storing an inverted `from > to` pair). An inverted pair
 * would still *look* like a normal range in the Calendar's own rendering
 * (start/end dots at whichever cells `from`/`to` point to), which made
 * clicking the visually-first endpoint clear the visually-last one instead --
 * always keeping `from <= to` avoids that mismatch, and matches the
 * "inverted" check `validateRange` already assumes elsewhere.
 * Clicking a day that isn't either endpoint while both are already set starts
 * a fresh range instead of extending the old one.
 *
 * A cleared endpoint stays cleared: consumers that render a lone `to` should
 * expose it through a custom `range_end` modifier because react-day-picker's
 * built-in range renderer only understands a lone `from`.
 */
export function toggleRangeSelection(range, day) {
  const { from, to } = range

  if (from && isSameDay(day, from)) return { from: undefined, to }
  if (to && isSameDay(day, to)) return { from, to: undefined }
  if (!from && !to) return { from: day, to: undefined }
  if (!from) return { from: day, to }
  if (!to)
    return isBefore(day, from) ? { from: day, to: from } : { from, to: day };
  return { from: day, to: undefined }
}

/**
 * Validates a `from`/`to` range against reservation-style constraints:
 * ordering, minimum/maximum stay length, past dates, and specific blocked dates.
 * Returns `null` when valid, or a machine-readable reason otherwise.
 */
export function validateRange(range, options = {}) {
  const { from, to } = range
  if (!from || !to) return "incomplete"
  if (isAfter(from, to)) return "inverted"

  if (options.disablePast && isBefore(startOfDay(from), today())) {
    return "in-past"
  }

  const length = rangeLengthInDays(range)
  if (options.minDays && length < options.minDays) return "too-short"
  if (options.maxDays && length > options.maxDays) return "too-long"

  if (
    options.disabledDates?.some((disabled) => isWithinRange(disabled, range))
  ) {
    return "disabled-date"
  }

  return null
}
