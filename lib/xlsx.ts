// Generador mínimo de archivos .xlsx (Office Open XML), sin dependencias.
// Arma el ZIP con método "store" (sin comprimir) y escribe los textos inline,
// así no hace falta sharedStrings. Sirve tanto en server como en browser.

export interface XlsxStyle {
  bold?: boolean
  italic?: boolean
  underline?: boolean
  size?: number
  color?: string            // color del texto, ej '111827'
  bg?: string               // relleno de fondo, ej 'F9FAFB'
  align?: 'left' | 'center' | 'right'
  valign?: 'top' | 'center' | 'bottom'
  wrap?: boolean
  border?: boolean
  fmt?: string              // formato numérico/fecha, ej 'dd/mm/yyyy hh:mm'
}

export type XlsxValue = string | number | Date | null | undefined

export interface XlsxCell {
  v: XlsxValue
  s?: number                // índice de estilo (1-based sobre el array `styles`)
  href?: string             // hipervínculo externo
}

export type XlsxCellInput = XlsxValue | XlsxCell

export interface XlsxSheet {
  name: string
  rows: XlsxCellInput[][]
  cols?: number[]           // anchos de columna (en caracteres)
  freezeRows?: number       // filas fijas al hacer scroll
  autoFilter?: boolean      // filtros en la primera fila
}

// ── Helpers ─────────────────────────────────────────────────────────────────

// XML 1.0 no admite caracteres de control salvo tab/LF/CR: Excel rechaza el archivo entero
function stripCtrl(s: string): string {
  let out = ''
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 32 || c === 9 || c === 10 || c === 13) out += s[i]
  }
  return out
}

function esc(s: string): string {
  return stripCtrl(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export function colName(n: number): string {   // 1 → A, 27 → AA
  let s = ''
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26) }
  return s
}

// Excel no maneja zonas horarias: guardamos el "reloj de pared" de Buenos Aires.
const TZ_OFFSET_MS = -3 * 60 * 60 * 1000
function dateSerial(d: Date): number {
  return (d.getTime() + TZ_OFFSET_MS) / 86400000 + 25569
}

function argb(c: string) { return 'FF' + c.replace('#', '').toUpperCase() }

// ── styles.xml ──────────────────────────────────────────────────────────────
function buildStylesXml(styles: XlsxStyle[]): string {
  const fonts = ['<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>']
  const fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>']
  const borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>']
  const numFmts: string[] = []
  const xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>']

  for (const st of styles) {
    const fontId = fonts.length
    fonts.push(
      `<font>${st.bold ? '<b/>' : ''}${st.italic ? '<i/>' : ''}${st.underline ? '<u/>' : ''}` +
      `<sz val="${st.size || 11}"/><color rgb="${argb(st.color || '111827')}"/><name val="Calibri"/><family val="2"/></font>`
    )

    let fillId = 0
    if (st.bg) {
      fillId = fills.length
      fills.push(`<fill><patternFill patternType="solid"><fgColor rgb="${argb(st.bg)}"/><bgColor indexed="64"/></patternFill></fill>`)
    }

    let borderId = 0
    if (st.border) {
      borderId = borders.length
      const side = '<color rgb="FFE5E7EB"/>'
      borders.push(`<border><left style="thin">${side}</left><right style="thin">${side}</right><top style="thin">${side}</top><bottom style="thin">${side}</bottom><diagonal/></border>`)
    }

    let numFmtId = 0
    if (st.fmt) {
      numFmtId = 164 + numFmts.length
      numFmts.push(`<numFmt numFmtId="${numFmtId}" formatCode="${esc(st.fmt)}"/>`)
    }

    const hasAlign = !!(st.align || st.valign || st.wrap)
    const alignment = hasAlign
      ? `<alignment${st.align ? ` horizontal="${st.align}"` : ''}${st.valign ? ` vertical="${st.valign}"` : ''}${st.wrap ? ' wrapText="1"' : ''}/>`
      : ''
    const attrs = `numFmtId="${numFmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0" applyFont="1"` +
      `${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}${numFmtId ? ' applyNumberFormat="1"' : ''}${hasAlign ? ' applyAlignment="1"' : ''}`
    xfs.push(hasAlign ? `<xf ${attrs}>${alignment}</xf>` : `<xf ${attrs}/>`)
  }

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    (numFmts.length ? `<numFmts count="${numFmts.length}">${numFmts.join('')}</numFmts>` : '') +
    `<fonts count="${fonts.length}">${fonts.join('')}</fonts>` +
    `<fills count="${fills.length}">${fills.join('')}</fills>` +
    `<borders count="${borders.length}">${borders.join('')}</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
    `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>` +
    `</styleSheet>`
}

// ── sheet.xml ───────────────────────────────────────────────────────────────
function buildSheetXml(sheet: XlsxSheet): { xml: string; links: { ref: string; url: string }[] } {
  const links: { ref: string; url: string }[] = []
  const maxCols = sheet.rows.reduce((m, r) => Math.max(m, r.length), 0)

  const rowsXml = sheet.rows.map((row, ri) => {
    const cells = row.map((raw, ci) => {
      const cell: XlsxCell = (raw !== null && typeof raw === 'object' && !(raw instanceof Date))
        ? raw as XlsxCell
        : { v: raw as XlsxValue }
      const ref = `${colName(ci + 1)}${ri + 1}`
      const s = cell.s ? ` s="${cell.s}"` : ''
      if (cell.href) links.push({ ref, url: cell.href })

      const v = cell.v
      if (v === null || v === undefined || v === '') return `<c r="${ref}"${s}/>`
      if (v instanceof Date) return `<c r="${ref}"${s}><v>${dateSerial(v)}</v></c>`
      if (typeof v === 'number' && Number.isFinite(v)) return `<c r="${ref}"${s}><v>${v}</v></c>`
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${esc(String(v))}</t></is></c>`
    }).join('')
    return `<row r="${ri + 1}">${cells}</row>`
  }).join('')

  const colsXml = sheet.cols?.length
    ? `<cols>${sheet.cols.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`
    : ''

  const freeze = sheet.freezeRows
    ? `<pane ySplit="${sheet.freezeRows}" topLeftCell="A${sheet.freezeRows + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft"/>`
    : ''
  const viewsXml = `<sheetViews><sheetView workbookViewId="0">${freeze}</sheetView></sheetViews>`

  const filterXml = sheet.autoFilter && sheet.rows.length > 1 && maxCols > 0
    ? `<autoFilter ref="A1:${colName(maxCols)}${sheet.rows.length}"/>`
    : ''

  const linksXml = links.length
    ? `<hyperlinks>${links.map((l, i) => `<hyperlink ref="${l.ref}" r:id="rId${i + 1}"/>`).join('')}</hyperlinks>`
    : ''

  const xml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<dimension ref="A1:${colName(Math.max(1, maxCols))}${Math.max(1, sheet.rows.length)}"/>` +
    viewsXml +
    `<sheetFormatPr defaultRowHeight="15"/>` +
    colsXml +
    `<sheetData>${rowsXml}</sheetData>` +
    filterXml +
    linksXml +
    `</worksheet>`

  return { xml, links }
}

// ── ZIP (store) ─────────────────────────────────────────────────────────────
let CRC_TABLE: Uint32Array | null = null
function crc32(buf: Uint8Array): number {
  if (!CRC_TABLE) {
    CRC_TABLE = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      CRC_TABLE[i] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

interface ZipEntry { name: string; data: Uint8Array }

function zipStore(entries: ZipEntry[]): Uint8Array {
  const enc = new TextEncoder()
  const DOS_DATE = 0x21, DOS_TIME = 0    // 1980-01-01 00:00, fecha fija = salida determinista
  const locals: Uint8Array[] = []
  const centrals: Uint8Array[] = []
  let offset = 0

  for (const e of entries) {
    const nameBytes = enc.encode(e.name)
    const crc = crc32(e.data)

    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true)
    lv.setUint16(4, 20, true)
    lv.setUint16(6, 0x0800, true)      // nombres en UTF-8
    lv.setUint16(8, 0, true)           // sin compresión
    lv.setUint16(10, DOS_TIME, true)
    lv.setUint16(12, DOS_DATE, true)
    lv.setUint32(14, crc, true)
    lv.setUint32(18, e.data.length, true)
    lv.setUint32(22, e.data.length, true)
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true)
    local.set(nameBytes, 30)
    locals.push(local, e.data)

    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true)
    cv.setUint16(6, 20, true)
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, DOS_TIME, true)
    cv.setUint16(14, DOS_DATE, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, e.data.length, true)
    cv.setUint32(24, e.data.length, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint32(42, offset, true)
    central.set(nameBytes, 46)
    centrals.push(central)

    offset += local.length + e.data.length
  }

  const cdSize = centrals.reduce((n, c) => n + c.length, 0)
  const eocd = new Uint8Array(22)
  const ev = new DataView(eocd.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, cdSize, true)
  ev.setUint32(16, offset, true)

  const parts = [...locals, ...centrals, eocd]
  const total = parts.reduce((n, p) => n + p.length, 0)
  const out = new Uint8Array(total)
  let pos = 0
  for (const p of parts) { out.set(p, pos); pos += p.length }
  return out
}

// ── API pública ─────────────────────────────────────────────────────────────
export function buildXlsx(sheets: XlsxSheet[], styles: XlsxStyle[] = []): Uint8Array {
  const enc = new TextEncoder()
  const files: ZipEntry[] = []
  const add = (name: string, xml: string) => files.push({ name, data: enc.encode(xml) })

  const built = sheets.map(buildSheetXml)

  add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`)

  add('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`)

  add('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets>${sheets.map((s, i) => `<sheet name="${esc(s.name).slice(0, 31)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>` +
    `</workbook>`)

  add('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
    `<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`)

  add('xl/styles.xml', buildStylesXml(styles))

  built.forEach((b, i) => {
    add(`xl/worksheets/sheet${i + 1}.xml`, b.xml)
    if (b.links.length) {
      add(`xl/worksheets/_rels/sheet${i + 1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
        b.links.map((l, li) => `<Relationship Id="rId${li + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink" Target="${esc(l.url)}" TargetMode="External"/>`).join('') +
        `</Relationships>`)
    }
  })

  return zipStore(files)
}

export const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
