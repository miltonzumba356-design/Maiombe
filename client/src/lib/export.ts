export interface CsvSection {
  title: string;
  headers: string[];
  rows: (string | number | null | undefined)[][];
}

// ── Colour palette: verde / amarelo / branco ───────────────────────────────
const C = {
  titleBg:    'FF1A7A3C', // verde escuro (título da sheet)
  titleFg:    'FFFFC72C', // amarelo vivo (texto no fundo verde)
  headerBg:   'FF26B870', // verde médio (cabeçalho de colunas)
  headerFg:   'FFFFFFFF', // branco (texto no cabeçalho verde)
  rowEvenBg:  'FFFFFFFF', // branco puro (linhas pares)
  rowOddBg:   'FFF0FFF6', // verde muito claro (linhas ímpares)
  rowFg:      'FF111827', // preto/quase-preto (texto nas linhas brancas)
  rowNumFg:   'FF155724', // verde escuro para números
  border:     'FFB7DFC8', // borda verde suave
  borderGold: 'FF26B870', // borda verde nos títulos
  kpiValFg:   'FF155724',
  subHeaderBg:'FFD4EDDA',
} as const;

function isCellNumeric(v: string | number | null | undefined): boolean {
  if (v == null || v === '') return false;
  if (typeof v === 'number') return true;
  return !isNaN(Number(String(v))) && String(v).trim() !== '';
}

function cellValue(v: string | number | null | undefined) {
  if (v == null) return '';
  if (typeof v === 'number') return v;
  const n = Number(v);
  return (!isNaN(n) && String(v).trim() !== '') ? n : v;
}

export async function downloadExcel(filename: string, sections: CsvSection[]) {
  // Dynamic import keeps ExcelJS out of the initial bundle
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'MAIOMBE — Sistema de Gestão de Crédito';
  wb.created = new Date();
  wb.modified = new Date();

  for (const sec of sections) {
    // Excel sheet name: max 31 chars, no special chars
    const sheetName = sec.title
      .replace(/[\/\\?*\[\]:]/g, '')
      .substring(0, 31)
      .trim();
    const ws = wb.addWorksheet(sheetName);

    const nCols = sec.headers.length;

    // ── Row 1: Section title (merged, gold background) ──────────────────
    if (nCols > 1) ws.mergeCells(1, 1, 1, nCols);
    const titleCell = ws.getCell(1, 1);
    titleCell.value = sec.title;
    titleCell.font  = { name: 'Calibri', bold: true, size: 13, color: { argb: C.titleFg } };
    titleCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.titleBg } };
    titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
    titleCell.border = {
      top:    { style: 'medium', color: { argb: C.borderGold } },
      bottom: { style: 'medium', color: { argb: C.borderGold } },
      left:   { style: 'medium', color: { argb: C.borderGold } },
      right:  { style: 'medium', color: { argb: C.borderGold } },
    };
    ws.getRow(1).height = 26;

    // ── Row 2: Column headers ─────────────────────────────────────────────
    sec.headers.forEach((h, i) => {
      const cell = ws.getCell(2, i + 1);
      cell.value = h.toUpperCase().replace(/_/g, ' ');
      cell.font  = { name: 'Calibri', bold: true, size: 10, color: { argb: C.headerFg } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.headerBg } };
      cell.border = {
        top:    { style: 'thin',   color: { argb: C.border } },
        bottom: { style: 'medium', color: { argb: C.borderGold } },
        left:   { style: 'thin',   color: { argb: C.borderGold } },
        right:  { style: 'thin',   color: { argb: C.borderGold } },
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    });
    ws.getRow(2).height = 20;

    // ── Rows 3+: Data ────────────────────────────────────────────────────
    sec.rows.forEach((row, ri) => {
      const isAlt  = ri % 2 === 1;
      const bgArgb = isAlt ? C.rowOddBg : C.rowEvenBg;
      const exRow  = ws.getRow(ri + 3);

      row.forEach((val, ci) => {
        const cell    = exRow.getCell(ci + 1);
        const isNum   = isCellNumeric(val);
        const isFirst = ci === 0;

        cell.value     = cellValue(val);
        cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bgArgb } };
        cell.font      = {
          name:  'Calibri',
          size:  10,
          bold:  isFirst,
          color: { argb: isNum && !isFirst ? C.rowNumFg : C.rowFg },
        };
        cell.border    = {
          top:    { style: 'thin', color: { argb: C.border } },
          bottom: { style: 'thin', color: { argb: C.border } },
          left:   { style: 'thin', color: { argb: C.border } },
          right:  { style: 'thin', color: { argb: C.border } },
        };
        cell.alignment = {
          vertical:   'middle',
          horizontal: isNum ? 'right' : isFirst ? 'left' : 'left',
          wrapText:   false,
        };
        // Number format for large integers
        if (isNum && typeof cellValue(val) === 'number') {
          const n = cellValue(val) as number;
          if (n > 1000 && Number.isInteger(n)) cell.numFmt = '#,##0';
          else if (!Number.isInteger(n)) cell.numFmt = '#,##0.00';
        }
      });
      exRow.height = 18;
    });

    // ── Column widths (auto-fit estimate) ────────────────────────────────
    sec.headers.forEach((h, i) => {
      const maxLen = sec.rows.reduce((mx, r) => {
        const v = r[i];
        return Math.max(mx, v == null ? 0 : String(v).length);
      }, h.length);
      ws.getColumn(i + 1).width = Math.min(Math.max(maxLen + 3, 14), 52);
    });

    // ── Freeze header rows, add auto-filter ──────────────────────────────
    ws.views = [{ state: 'frozen', ySplit: 2, xSplit: 0, activeCell: 'A3' }];
    if (nCols > 0 && sec.rows.length > 0) {
      ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: nCols } };
    }

    // ── Tab colour (gold) ─────────────────────────────────────────────────
    ws.properties.tabColor = { argb: 'FFC9A84C' };
  }

  // ── Write and trigger download ──────────────────────────────────────────
  const buffer = await wb.xlsx.writeBuffer();
  const blob   = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a   = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Keep CSV fallbacks for compatibility
const esc = (v: string | number | null | undefined) => {
  const s = v == null ? '' : String(v);
  return /[,"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function downloadMultiSectionCSV(filename: string, sections: CsvSection[]) {
  const parts: string[] = [];
  for (const s of sections) {
    parts.push(s.title);
    parts.push(s.headers.map(esc).join(','));
    s.rows.forEach(r => parts.push(r.map(esc).join(',')));
    parts.push('');
  }
  const csv = '﻿' + parts.join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click();
  document.body.removeChild(a); URL.revokeObjectURL(url);
}

export function downloadCSV(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  downloadMultiSectionCSV(filename, [{ title: filename, headers, rows }]);
}

export const csvDate = () => new Date().toISOString().split('T')[0];
