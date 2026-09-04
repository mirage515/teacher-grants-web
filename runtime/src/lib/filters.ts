import { GrantRecord } from "../types/grant"

export type GrantFilters = {
  year: string
  department: string
  teacher: string
  subcategory: string
}

export const FIXED_YEARS = ["112", "113", "114"] as const

export const DEFAULT_FILTERS: GrantFilters = {
  year: "114",
  department: "",
  teacher: "",
  subcategory: "",
}

function sortLocale(values: string[]) {
  return values.sort((a, b) => a.localeCompare(b, "zh-Hant"))
}

export function matchesFilters(record: GrantRecord, filters: GrantFilters) {
  const matchYear = !filters.year || record.year === filters.year
  const matchDepartment =
    !filters.department || record.department === filters.department
  const matchTeacher = !filters.teacher || record.teacher === filters.teacher
  const matchSubcategory =
    !filters.subcategory || record.subcategory === filters.subcategory

  return matchYear && matchDepartment && matchTeacher && matchSubcategory
}

export function filterRecords(records: GrantRecord[], filters: GrantFilters) {
  return records.filter((record) => matchesFilters(record, filters))
}

export function getUniqueYears(records: GrantRecord[]) {
  return sortLocale(Array.from(new Set(records.map((record) => record.year))))
}

export function getUniqueDepartments(records: GrantRecord[]) {
  return sortLocale(
    Array.from(new Set(records.map((record) => record.department)))
  )
}

export function getUniqueTeachers(records: GrantRecord[]) {
  return sortLocale(Array.from(new Set(records.map((record) => record.teacher))))
}

export function getUniqueSubcategories(records: GrantRecord[]) {
  return sortLocale(
    Array.from(
      new Set(
        records
          .map((record) => record.subcategory)
          .filter((subcategory): subcategory is string => Boolean(subcategory))
      )
    )
  )
}
