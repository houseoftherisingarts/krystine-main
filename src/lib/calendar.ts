// Calendar export helpers — ICS download + Google / Outlook web URLs.
// ─────────────────────────────────────────────────────────────────────────────
// The LiveEventCard's "Ajouter au calendrier" dropdown calls into these.
// We support three paths:
//   • ICS file download    → works with Apple Calendar, Outlook desktop,
//                            iCal, Thunderbird, Fantastical, Proton, etc.
//   • Google Calendar URL  → opens a pre-filled event in Google Calendar
//   • Outlook web URL      → opens a pre-filled event in Outlook.com
//
// When an event has no `startDate` (open-ended TEDx / tour requests), the
// card hides the button entirely — see LiveEventCard.

import type { LiveEvent } from './liveEvents';

export interface CalendarEventInput {
  title: string;
  description?: string;
  location?: string;
  /** ISO or parsable date string for the event start. */
  start: string;
  /** Optional ISO end. If omitted the calendar helpers use start + 2h. */
  end?: string;
  /** Public URL for registration / info, appended to the description. */
  url?: string;
}

// ─── Derivation from LiveEvent ──────────────────────────────────────────────

export function liveEventToCalendar(
  ev: LiveEvent,
  lang: 'FR' | 'EN'
): CalendarEventInput | null {
  if (!ev.startDate) return null;
  const title = lang === 'FR' ? ev.titleFR : ev.titleEN;
  const subtitle = lang === 'FR' ? ev.subtitleFR : ev.subtitleEN;
  const body = lang === 'FR' ? ev.bodyFR : ev.bodyEN;
  const location = lang === 'FR' ? ev.locationFR : ev.locationEN;
  const url = ev.registerUrl || (ev.internalHref ? window.location.origin + ev.internalHref : undefined);

  const description = [subtitle, body].filter(Boolean).join('\n\n');

  return {
    title,
    description: description || undefined,
    location,
    start: ev.startDate,
    end: ev.endDate,
    url,
  };
}

// ─── Formatting helpers ─────────────────────────────────────────────────────

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

/**
 * Format a Date as UTC YYYYMMDDTHHMMSSZ — the ICS/Google basic format.
 */
function toUtcStamp(d: Date): string {
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

/**
 * Format a Date as YYYYMMDD for all-day ICS entries.
 */
function toDateStamp(d: Date): string {
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/**
 * Decide whether the input looks like a full-day (no time component)
 * marker like "2026-07-05" vs an explicit datetime like "2026-04-25T16:30:00-04:00".
 */
function isDateOnly(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim());
}

/**
 * Resolve start + end to concrete Date pairs. When `end` is missing:
 *   • date-only start → end = start + 1 day (ICS DTEND for all-day is exclusive)
 *   • datetime start  → end = start + 2h
 * When `end` is a date-only string, we treat both as all-day and push
 * DTEND forward by 1 day so the end date is inclusive visually.
 */
function resolveRange(start: string, end?: string): { startDate: Date; endDate: Date; allDay: boolean } {
  const allDay = isDateOnly(start) && (!end || isDateOnly(end));
  if (allDay) {
    const sd = new Date(start + 'T00:00:00Z');
    const ed = end
      ? new Date(end + 'T00:00:00Z')
      : new Date(sd);
    // ICS all-day DTEND is exclusive — add one day so the end date renders.
    ed.setUTCDate(ed.getUTCDate() + 1);
    return { startDate: sd, endDate: ed, allDay: true };
  }
  const sd = new Date(start);
  const ed = end ? new Date(end) : new Date(sd.getTime() + 2 * 60 * 60 * 1000);
  return { startDate: sd, endDate: ed, allDay: false };
}

/** Escape commas, semicolons and newlines per RFC 5545. */
function icsEscape(v: string): string {
  return v.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

// ─── ICS ────────────────────────────────────────────────────────────────────

export function buildIcs(ev: CalendarEventInput): string {
  const { startDate, endDate, allDay } = resolveRange(ev.start, ev.end);
  const uid = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}@krystinestlaurent.com`;
  const now = toUtcStamp(new Date());
  const dt = (d: Date) => allDay ? toDateStamp(d) : toUtcStamp(d);
  const dtPrefix = allDay ? ';VALUE=DATE' : '';

  const descParts: string[] = [];
  if (ev.description) descParts.push(ev.description);
  if (ev.url) descParts.push(ev.url);
  const description = descParts.join('\n\n');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Krystine St-Laurent//Inspirata Events//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${now}`,
    `DTSTART${dtPrefix}:${dt(startDate)}`,
    `DTEND${dtPrefix}:${dt(endDate)}`,
    `SUMMARY:${icsEscape(ev.title)}`,
  ];
  if (description) lines.push(`DESCRIPTION:${icsEscape(description)}`);
  if (ev.location)  lines.push(`LOCATION:${icsEscape(ev.location)}`);
  if (ev.url)       lines.push(`URL:${ev.url}`);
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.join('\r\n');
}

export function downloadIcs(ev: CalendarEventInput, filename?: string) {
  const ics = buildIcs(ev);
  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const slug = ev.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').slice(0, 60);
  a.href = url;
  a.download = filename || `${slug || 'event'}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// ─── Google Calendar URL ────────────────────────────────────────────────────

export function googleCalendarUrl(ev: CalendarEventInput): string {
  const { startDate, endDate, allDay } = resolveRange(ev.start, ev.end);
  // Google expects YYYYMMDD/YYYYMMDD for all-day events and
  // YYYYMMDDTHHMMSSZ/YYYYMMDDTHHMMSSZ for timed events.
  const fmt = allDay ? toDateStamp : toUtcStamp;
  const dates = `${fmt(startDate)}/${fmt(endDate)}`;
  const descParts = [ev.description, ev.url].filter(Boolean) as string[];
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: ev.title,
    dates,
    ...(ev.location ? { location: ev.location } : {}),
    ...(descParts.length ? { details: descParts.join('\n\n') } : {}),
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

// ─── Outlook Live URL ───────────────────────────────────────────────────────

export function outlookCalendarUrl(ev: CalendarEventInput): string {
  const { startDate, endDate, allDay } = resolveRange(ev.start, ev.end);
  const params = new URLSearchParams({
    path: '/calendar/action/compose',
    rru: 'addevent',
    subject: ev.title,
    startdt: startDate.toISOString(),
    enddt: endDate.toISOString(),
    ...(allDay ? { allday: 'true' } : {}),
    ...(ev.location ? { location: ev.location } : {}),
    ...(ev.description || ev.url
      ? { body: [ev.description, ev.url].filter(Boolean).join('\n\n') }
      : {}),
  });
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
