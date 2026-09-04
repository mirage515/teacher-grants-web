import * as Papa from "papaparse"
import { GrantRecord } from "../types/grant"

type CsvRow = Record<string, string | undefined>

function cleanText(value: string | undefined) {
  return (value ?? "").replace(/^\ufeff/u, "").trim()
}

function normalizeAmount(rawAmount: string | undefined) {
  return Number(cleanText(rawAmount).replace(/,/g, ""))
}

function getRowValue(row: CsvRow, key: string, fallbackIndex: number) {
  const values = Object.values(row)
  return cleanText(row[key]) || cleanText(values[fallbackIndex])
}

export function parseGrantCsv(csvText: string): GrantRecord[] {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error("Grant CSV parse errors:", parsed.errors)
  }

  return parsed.data
    .map((row) => ({
      year: getRowValue(row, "年度", 0),
      department: getRowValue(row, "系所", 1),
      category: getRowValue(row, "項目", 2),
      subcategory: getRowValue(row, "次項目", 3),
      teacher: getRowValue(row, "教師姓名", 4),
      amount: normalizeAmount(getRowValue(row, "獎助金額", 5)),
    }))
    .filter(
      (row) =>
        row.year &&
        row.department &&
        row.category &&
        row.subcategory &&
        row.teacher &&
        Number.isFinite(row.amount)
    )
}
