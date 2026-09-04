import * as Papa from "papaparse"
import { PatentRecord, TransferRecord } from "../types/research-assets"

type CsvRow = Record<string, string>

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/^\ufeff/u, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseAmount(value: string | undefined) {
  const cleaned = cleanText(value).replace(/,/g, "").replace(/[^0-9.-]/g, "")
  return cleaned ? Number(cleaned) : 0
}

export function parsePatentCsv(csvText: string): PatentRecord[] {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error("Patent CSV parse errors:", parsed.errors)
  }

  return parsed.data
    .map((row) => ({
      id: cleanText(row["識別號"]),
      year: cleanText(row["年度"]),
      department: cleanText(row["主聘系所"]),
      teacherName: cleanText(row["教師姓名"]),
      appointmentType: cleanText(row["專兼任"]),
      title: cleanText(row["專利/新品種名稱"]),
      patentType: cleanText(row["專利類型"]),
      status: cleanText(row["進度狀況"]),
    }))
    .filter((row) => row.id && row.year && row.teacherName && row.appointmentType === "專任")
}

export function parseTransferCsv(csvText: string): TransferRecord[] {
  const parsed = Papa.parse<CsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error("Transfer CSV parse errors:", parsed.errors)
  }

  return parsed.data
    .map((row) => ({
      id: cleanText(row["識別號"]),
      year: cleanText(row["年度"]),
      department: cleanText(row["主聘系所"]),
      teacherName: cleanText(row["教師姓名"]),
      appointmentType: cleanText(row["專兼任"]),
      title: cleanText(row["技轉/授權名稱"]),
      transferType: cleanText(row["技術移轉或授權"]),
      company: cleanText(row["技轉或授權廠商名稱"] ?? row["技轉或授權廠商相關資訊"]),
      amount: parseAmount(row["技轉或授權金額"] ?? row["H1"]),
    }))
    .filter((row) => row.id && row.year && row.teacherName && row.appointmentType === "專任")
}
