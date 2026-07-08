// Простой RFC4180-парсер: запятая или точка с запятой как разделитель (авто-детект
// по первой строке), кавычки с экранированием "" внутри поля.
export function parseCsv(text: string): string[][] {
  const cleaned = text.replace(/^﻿/, "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")
  const firstLine = cleaned.slice(0, cleaned.indexOf("\n") === -1 ? undefined : cleaned.indexOf("\n"))
  const delimiter = (firstLine.match(/;/g)?.length ?? 0) > (firstLine.match(/,/g)?.length ?? 0) ? ";" : ","

  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < cleaned.length; i++) {
    const char = cleaned[i]

    if (inQuotes) {
      if (char === '"') {
        if (cleaned[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
      continue
    }

    if (char === '"') {
      inQuotes = true
    } else if (char === delimiter) {
      row.push(field)
      field = ""
    } else if (char === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0))
}

export function buildCsv(rows: string[][]): string {
  const escapeCell = (cell: string) => {
    if (/[",;\n]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`
    return cell
  }
  return rows.map((r) => r.map(escapeCell).join(",")).join("\n")
}
