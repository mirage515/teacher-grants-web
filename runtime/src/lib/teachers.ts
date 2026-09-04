import * as Papa from "papaparse"
import { TeacherFilters, TeacherRecord, TeacherSummary } from "../types/teachers"

type TeacherCsvRow = Record<string, string>

export const DEFAULT_TEACHER_FILTERS: TeacherFilters = {
  department: "",
  employmentType: "",
  establishmentType: "",
  appointmentRanks: [],
}

const RANK_ORDER = ["教授", "副教授", "助理教授", "講師", "實習指導教師", "助教"]

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/^\ufeff/u, "")
    .replace(/\u00a0/g, " ")
    .replace(/\r/g, "")
    .replace(/\s+/g, " ")
    .trim()
}

function parseNumber(value: string | undefined) {
  const cleaned = cleanText(value).replace(/[^0-9.-]/g, "")
  return cleaned ? Number(cleaned) : 0
}

function isDepartmentCode(value: string) {
  return /^\d{3,}$/.test(value)
}

function getEmailName(value: string) {
  const email = cleanText(value)
  return email.includes("@") ? email.split("@")[0] : ""
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant")
  )
}

function rankSort(a: string, b: string) {
  const aIndex = RANK_ORDER.indexOf(a)
  const bIndex = RANK_ORDER.indexOf(b)

  if (aIndex >= 0 && bIndex >= 0) return aIndex - bIndex
  if (aIndex >= 0) return -1
  if (bIndex >= 0) return 1

  return a.localeCompare(b, "zh-Hant")
}

function countBy<T extends string>(
  records: TeacherRecord[],
  getValue: (record: TeacherRecord) => T
) {
  const counts = new Map<string, number>()

  records.forEach((record) => {
    const value = getValue(record) || "未填"
    counts.set(value, (counts.get(value) ?? 0) + 1)
  })

  return Array.from(counts.entries()).map(([name, count]) => ({ name, count }))
}

export function parseTeachersCsv(csvText: string): TeacherRecord[] {
  const parsed = Papa.parse<TeacherCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error("Teachers CSV parse errors:", parsed.errors)
  }

  return parsed.data
    .map((row) => {
      const rawDepartment = cleanText(row["主聘系所"])
      const rawName = cleanText(row["中文姓名"])
      const department = isDepartmentCode(rawDepartment) ? rawName : rawDepartment
      const name = isDepartmentCode(rawDepartment)
        ? getEmailName(row["電子郵件"]) || cleanText(row["識別號"])
        : rawName

      return {
        id: cleanText(row["識別號"]),
        academicYear: cleanText(row["學年"]),
        semester: cleanText(row["學期"]),
        department,
        name,
        gender: cleanText(row["性別"]),
        age: parseNumber(row["年齡"]),
        status: cleanText(row["狀態"]),
        appointmentDate: cleanText(row["聘任日期"]),
        firstArrivalDate: cleanText(row["最早到校(任職)日"]),
        establishmentType: cleanText(row["編制內/編制外"]),
        employmentType: cleanText(row["專兼任"]),
        concurrentDepartment: cleanText(row["共聘系所"]),
        hasAdminRole: cleanText(row["兼任行政工作"]),
        adminRole: cleanText(row["行政工作職務"]),
        highestSchoolType: cleanText(row["最高學歷學校分類"]),
        highestSchool: cleanText(row["最高學歷學校"]),
        highestDepartment: cleanText(row["最高學歷科系"]),
        highestDegree: cleanText(row["最高學歷學位"]),
        specialty: cleanText(row["學術專長及研究"]),
        teacherCategory: cleanText(row["教師分類"]),
        appointmentRank: cleanText(row["聘書職級"]),
        certificateRank: cleanText(row["證書職級"]),
        flexibleSalary: cleanText(row["是否支領彈性薪資"]),
        industryExperience: cleanText(row["實務經驗專職二年以上或兼職四年以上"]),
        retiredRehire: cleanText(row["專任教師是否為退休再任之教師"]),
      }
    })
    .filter((record) => record.id && record.name && record.department)
}

export function getTeacherAcademicYears(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.academicYear)).sort((a, b) =>
    b.localeCompare(a, "zh-Hant")
  )
}

export function getTeacherSemesters(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.semester))
}

export function getTeacherDepartments(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.department))
}

export function getTeacherEmploymentTypes(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.employmentType))
}

export function getTeacherEstablishmentTypes(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.establishmentType))
}

export function getTeacherRanks(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.appointmentRank)).sort(rankSort)
}

export function getTeacherDegrees(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.highestDegree))
}

export function getTeacherStatuses(records: TeacherRecord[]) {
  return uniqueSorted(records.map((record) => record.status))
}

export function filterTeacherRecords(records: TeacherRecord[], filters: TeacherFilters) {
  return records.filter(
    (record) =>
      (!filters.department || record.department === filters.department) &&
      (!filters.employmentType || record.employmentType === filters.employmentType) &&
      (!filters.establishmentType ||
        record.establishmentType === filters.establishmentType) &&
      (filters.appointmentRanks.length === 0 ||
        filters.appointmentRanks.includes(record.appointmentRank))
  )
}

export function getTeacherSummary(records: TeacherRecord[]): TeacherSummary {
  const validAges = records.map((record) => record.age).filter((age) => age > 0)

  return {
    total: records.length,
    fullTime: records.filter((record) => record.employmentType === "專任").length,
    partTime: records.filter((record) => record.employmentType === "兼任").length,
    inEstablishment: records.filter((record) => record.establishmentType === "編制內")
      .length,
    adminRole: records.filter((record) => record.hasAdminRole === "是").length,
    averageAge:
      validAges.length > 0
        ? Math.round((validAges.reduce((sum, age) => sum + age, 0) / validAges.length) * 10) /
          10
        : 0,
  }
}

export function getDepartmentTeacherCounts(records: TeacherRecord[], limit = 12) {
  return countBy(records, (record) => record.department)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit)
}

export function getRankDistribution(records: TeacherRecord[]) {
  return countBy(records, (record) => record.appointmentRank).sort((a, b) =>
    rankSort(a.name, b.name)
  )
}

export function getDegreeDistribution(records: TeacherRecord[]) {
  return countBy(records, (record) => record.highestDegree).sort((a, b) => b.count - a.count)
}

export function getEmploymentDistribution(records: TeacherRecord[]) {
  return countBy(records, (record) => record.employmentType).sort((a, b) => b.count - a.count)
}

export function getAgeDistribution(records: TeacherRecord[]) {
  const groups = [
    { name: "34歲以下", min: 0, max: 34 },
    { name: "35-44歲", min: 35, max: 44 },
    { name: "45-54歲", min: 45, max: 54 },
    { name: "55-64歲", min: 55, max: 64 },
    { name: "65歲以上", min: 65, max: Number.POSITIVE_INFINITY },
  ]

  return groups.map((group) => ({
    name: group.name,
    count: records.filter(
      (record) => record.age >= group.min && record.age <= group.max
    ).length,
  }))
}

export function getDepartmentRankMatrix(records: TeacherRecord[], limit = 10) {
  const ranks = getTeacherRanks(records)
  const departmentNames = getDepartmentTeacherCounts(records, limit).map((item) => item.name)

  return departmentNames.map((department) => {
    const row: Record<string, string | number> = { department }
    const scoped = records.filter((record) => record.department === department)

    ranks.forEach((rank) => {
      row[rank] = scoped.filter((record) => record.appointmentRank === rank).length
    })

    return row
  })
}
