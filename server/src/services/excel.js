import XLSX from 'xlsx';

export function workbookToRows(buffer, sheetName) {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const name = sheetName || wb.SheetNames[0];
  const sheet = wb.Sheets[name];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

export function rowsToWorkbookBuffer(rows, sheetName = 'Sheet1') {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

// Heuristic column mapper. Returns { canonical: sourceKey }
export function autoMap(headers, target) {
  const map = {};
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9]/g, '');
  const targetNorm = target.map((t) => ({ key: t.key, aliases: [t.key, ...(t.aliases || [])].map(norm) }));
  for (const h of headers) {
    const hn = norm(h);
    const hit = targetNorm.find((t) => t.aliases.includes(hn));
    if (hit) map[hit.key] = h;
  }
  return map;
}
//*** End Patch