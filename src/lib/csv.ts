// Tiny CSV parser — handles quoted fields, escaped quotes ("" inside "..."),
// and CRLF/LF line endings. Good enough for contact lists exported from Google
// Contacts / MailChimp / Excel. For anything fancier we'd reach for papaparse,
// but that's 40KB of dep weight we don't need.

export type CsvRow = Record<string, string>;

export function parseCsv(input: string): CsvRow[] {
  const text = input.replace(/^\uFEFF/, ''); // strip BOM
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else { inQuotes = false; }
      } else {
        field += ch;
      }
      continue;
    }
    if (ch === '"') { inQuotes = true; continue; }
    if (ch === ',') { row.push(field); field = ''; continue; }
    if (ch === '\r') continue;
    if (ch === '\n') { row.push(field); rows.push(row); row = []; field = ''; continue; }
    field += ch;
  }
  if (field.length > 0 || row.length > 0) { row.push(field); rows.push(row); }

  if (!rows.length) return [];
  const headers = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1)
    .filter(r => r.some(v => v && v.trim() !== ''))
    .map(r => {
      const obj: CsvRow = {};
      headers.forEach((h, i) => { obj[h] = (r[i] || '').trim(); });
      return obj;
    });
}

// Best-effort mapping of common column header aliases to our canonical
// subscriber fields. Accepts English and French headers.
export interface SubscriberImportRow {
  email: string;
  firstName?: string;
  lastName?: string;
  tags?: string[];
}

export function mapCsvToSubscribers(rows: CsvRow[]): SubscriberImportRow[] {
  const pick = (r: CsvRow, keys: string[]) => {
    for (const k of keys) if (r[k]) return r[k];
    return '';
  };
  return rows
    .map(r => ({
      email: pick(r, ['email', 'courriel', 'email address', 'e-mail']).toLowerCase(),
      firstName: pick(r, ['first name', 'firstname', 'prénom', 'prenom', 'first']),
      lastName:  pick(r, ['last name', 'lastname', 'nom', 'last']),
      tags:      pick(r, ['tags', 'étiquettes', 'segment']).split(/[,;|]/).map(t => t.trim()).filter(Boolean),
    }))
    .filter(r => r.email.length > 0);
}
