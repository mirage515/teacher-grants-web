import * as Papa from "papaparse"
import {
  ProjectFilters,
  ProjectRecord,
  ProjectSelection,
  ProjectSummary,
} from "../types/projects"

type ProjectCsvRow = Record<string, string>

export const DEFAULT_PROJECT_FILTERS: ProjectFilters = {
  year: "",
  department: "",
  teacherName: "",
  projectTypes: [],
}

export const DEFAULT_PROJECT_SELECTION: ProjectSelection = {
  year: "",
  projectTypes: [],
  department: "",
  teacherName: "",
}

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

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant")
  )
}

function getRowValueByIndex(row: ProjectCsvRow, index: number) {
  const values = Object.values(row) as string[]
  return cleanText(values[index])
}

function matchesAny(value: string, selectedValues: string[]) {
  return selectedValues.length === 0 || selectedValues.includes(value)
}

export function parseProjectContractsCsv(csvText: string): ProjectRecord[] {
  const parsed = Papa.parse<ProjectCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error("Project contracts CSV parse errors:", parsed.errors)
  }

  return parsed.data
    .map((row) => {
      const projectType = getRowValueByIndex(row, 8)
      const employmentType = getRowValueByIndex(row, 4)
      const workRole = getRowValueByIndex(row, 13)

      return {
        id: getRowValueByIndex(row, 0),
        year: getRowValueByIndex(row, 1),
        department: getRowValueByIndex(row, 2),
        teacherName: getRowValueByIndex(row, 3),
        projectCode: getRowValueByIndex(row, 6),
        projectName: getRowValueByIndex(row, 7),
        projectType,
        startDate: getRowValueByIndex(row, 11),
        endDate: getRowValueByIndex(row, 12),
        totalAmount: parseAmount(getRowValueByIndex(row, 15)),
        domesticClient: getRowValueByIndex(row, 24),
        employmentType,
        workRole,
      }
    })
    .filter(
      (row) =>
        row.id &&
        row.year &&
        row.department &&
        row.teacherName &&
        row.projectName &&
        row.projectType &&
        row.employmentType === "專任" &&
        row.workRole === "主持人" &&
        row.projectType !== "校內補助案"
    )
}

export function getProjectYears(records: ProjectRecord[]) {
  return uniqueSorted(records.map((record) => record.year)).sort((a, b) =>
    b.localeCompare(a, "zh-Hant")
  )
}

export function getProjectDepartments(records: ProjectRecord[]) {
  return uniqueSorted(records.map((record) => record.department))
}

export function getProjectTeachers(records: ProjectRecord[]) {
  return uniqueSorted(records.map((record) => record.teacherName))
}

export function getProjectTypes(records: ProjectRecord[]) {
  return uniqueSorted(records.map((record) => record.projectType))
}

export function filterProjectRecords(
  records: ProjectRecord[],
  filters: ProjectFilters
) {
  return records.filter(
    (record) =>
      (!filters.year || record.year === filters.year) &&
      (!filters.department || record.department === filters.department) &&
      (!filters.teacherName || record.teacherName === filters.teacherName) &&
      matchesAny(record.projectType, filters.projectTypes)
  )
}

export function filterProjectsBySelection(
  records: ProjectRecord[],
  selection: ProjectSelection
) {
  return records.filter(
    (record) =>
      (!selection.year || record.year === selection.year) &&
      matchesAny(record.projectType, selection.projectTypes) &&
      (!selection.department || record.department === selection.department) &&
      (!selection.teacherName || record.teacherName === selection.teacherName)
  )
}

export function getProjectSummary(records: ProjectRecord[]): ProjectSummary {
  return {
    projectCount: new Set(records.map((record) => record.id)).size,
    totalAmount: records.reduce((sum, record) => sum + record.totalAmount, 0),
  }
}

export function getProjectYearTrend(records: ProjectRecord[]) {
  const counts = new Map<string, { amount: number; projects: Set<string> }>()

  records.forEach((record) => {
    const current = counts.get(record.year) ?? {
      amount: 0,
      projects: new Set<string>(),
    }
    current.amount += record.totalAmount
    current.projects.add(record.id)
    counts.set(record.year, current)
  })

  return Array.from(counts.entries())
    .map(([year, value]) => ({
      year,
      amount: value.amount,
      count: value.projects.size,
    }))
    .sort((a, b) => a.year.localeCompare(b.year, "zh-Hant"))
}

export function getProjectTypeDistribution(records: ProjectRecord[]) {
  const totalAmount = records.reduce((sum, record) => sum + record.totalAmount, 0)
  const counts = new Map<string, { amount: number; projects: Set<string> }>()

  records.forEach((record) => {
    const current = counts.get(record.projectType) ?? {
      amount: 0,
      projects: new Set<string>(),
    }
    current.amount += record.totalAmount
    current.projects.add(record.id)
    counts.set(record.projectType, current)
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      amount: value.amount,
      count: value.projects.size,
      percentage: totalAmount > 0 ? (value.amount / totalAmount) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount)
}

export function getDepartmentProjectRank(records: ProjectRecord[], limit = 12) {
  const counts = new Map<string, { amount: number; projects: Set<string> }>()

  records.forEach((record) => {
    const current = counts.get(record.department) ?? {
      amount: 0,
      projects: new Set<string>(),
    }
    current.amount += record.totalAmount
    current.projects.add(record.id)
    counts.set(record.department, current)
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      amount: value.amount,
      count: value.projects.size,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}

export function getTeacherProjectRank(records: ProjectRecord[], limit = 12) {
  const counts = new Map<string, { amount: number; projects: Set<string> }>()

  records.forEach((record) => {
    const current = counts.get(record.teacherName) ?? {
      amount: 0,
      projects: new Set<string>(),
    }
    current.amount += record.totalAmount
    current.projects.add(record.id)
    counts.set(record.teacherName, current)
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({
      name,
      amount: value.amount,
      count: value.projects.size,
    }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, limit)
}
