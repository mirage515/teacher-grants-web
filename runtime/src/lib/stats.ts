import { GrantRecord } from "../types/grant"

export type AmountDatum = {
  name: string
  amount: number
}

export type TrendRow = {
  year: string
  [key: string]: string | number
}

function groupAmountData(records: GrantRecord[], key: keyof GrantRecord) {
  const map = new Map<string, number>()

  records.forEach((record) => {
    const group = String(record[key] || "未分類")
    map.set(group, (map.get(group) ?? 0) + record.amount)
  })

  return Array.from(map.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
}

export function getTotalAmount(records: GrantRecord[]) {
  return records.reduce((sum, record) => sum + record.amount, 0)
}

export function getTeacherCount(records: GrantRecord[]) {
  return new Set(records.map((record) => record.teacher)).size
}

export function getCategoryCount(records: GrantRecord[]) {
  return new Set(records.map((record) => record.category)).size
}

export function getSubcategoryCount(records: GrantRecord[]) {
  return new Set(records.map((record) => record.subcategory)).size
}

export function getAverageAmountPerTeacher(records: GrantRecord[]) {
  const teacherCount = getTeacherCount(records)
  if (teacherCount === 0) return 0

  return getTotalAmount(records) / teacherCount
}

export function getCategoryAmountData(records: GrantRecord[], limit?: number) {
  const result = groupAmountData(records, "category")
  return typeof limit === "number" ? result.slice(0, limit) : result
}

export function getDepartmentAmountData(records: GrantRecord[], limit?: number) {
  const result = groupAmountData(records, "department")
  return typeof limit === "number" ? result.slice(0, limit) : result
}

export function getSubcategoryAmountData(
  records: GrantRecord[],
  limit?: number
) {
  const result = groupAmountData(records, "subcategory")
  return typeof limit === "number" ? result.slice(0, limit) : result
}

export function getTeacherAmountData(records: GrantRecord[], limit?: number) {
  const result = groupAmountData(records, "teacher")
  return typeof limit === "number" ? result.slice(0, limit) : result
}

export function getShareAmount(total: number, base: number) {
  if (!base) return 0
  return total / base
}

export function getTrendChartData(
  records: GrantRecord[],
  years: readonly string[],
  mode: "subcategory" | "teacher"
) {
  const groupedByYear = new Map<string, TrendRow>()

  years.forEach((year) => {
    groupedByYear.set(year, { year })
  })

  records.forEach((record) => {
    const year = String(record.year)
    if (!years.includes(year)) return

    const lineKey =
      mode === "teacher" ? record.teacher || "未填教師" : record.subcategory || "未分類"
    const currentYearRow = groupedByYear.get(year) ?? { year }
    const currentValue = Number(currentYearRow[lineKey] || 0)

    currentYearRow[lineKey] = currentValue + Number(record.amount || 0)
    groupedByYear.set(year, currentYearRow)
  })

  return years.map((year) => groupedByYear.get(year) ?? { year })
}
