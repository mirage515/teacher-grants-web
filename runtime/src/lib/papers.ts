import * as Papa from "papaparse"
import { PaperFilters, PaperPublication, PaperRecord } from "../types/paper"

type PaperCsvRow = {
  識別號?: string
  年度?: string
  系所代碼?: string
  主聘系所?: string
  教師姓名?: string
  專兼任?: string
  狀態?: string
  論文名稱?: string
  論文收錄分類?: string
  作者順序?: string
  通訊作者?: string
  刊物名稱?: string
  發表卷數?: string
  是否具有審稿制度?: string
  "期刊論文是否為跨國(地區)合作"?: string
  發表期數?: string
  "期刊出版地國家/地區"?: string
  發表年份?: string
  發表月份?: string
  發表型式?: string
  所屬計畫案?: string
}

const JOURNAL_ALIAS_MAP: Record<string, string> = {}

export const DEFAULT_PAPER_FILTERS: PaperFilters = {
  schoolYear: "",
  department: "",
  teacherName: "",
  journalCategories: [],
}

function cleanText(value: string | undefined) {
  return (value ?? "")
    .replace(/\u00a0/g, " ")
    .normalize("NFKC")
    .replace(/\s+/g, " ")
    .trim()
}

function normalizeLookupKey(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

function normalizeJournalName(value: string) {
  const cleaned = cleanText(value)
  if (!cleaned) return ""

  const aliasKey = normalizeLookupKey(cleaned)
  return JOURNAL_ALIAS_MAP[aliasKey] ?? cleaned
}

function normalizeTitle(value: string) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[‐‑–—－]/g, "-")
    .replace(/[^\p{L}\p{N}]+/gu, "")
}

function parseBooleanFlag(value: string | undefined) {
  return cleanText(value) === "是"
}

function parseNumber(value: string | undefined) {
  const cleaned = cleanText(value).replace(/[^0-9-]/g, "")
  return cleaned ? Number(cleaned) : 0
}

function splitJournalCategories(value: string | undefined) {
  return cleanText(value)
    .split(",")
    .map((item) => cleanText(item))
    .map((item) => (item === "SCI" ? "SCIE" : item))
    .filter(Boolean)
}

function uniqueSorted(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b, "zh-Hant")
  )
}

function createPaperKey(record: PaperRecord) {
  const titleKey = normalizeTitle(record.title)
  if (titleKey) {
    return `${record.publicationYear}::${titleKey}`
  }

  return `${record.publicationYear}::${normalizeLookupKey(
    record.normalizedJournalName
  )}::${normalizeLookupKey(record.teacherName)}`
}

export function parsePaperCsv(csvText: string): PaperRecord[] {
  const parsed = Papa.parse<PaperCsvRow>(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  if (parsed.errors.length > 0) {
    console.error("Paper CSV parse errors:", parsed.errors)
  }

  return parsed.data
    .map((row) => {
      const journalName = cleanText(row.刊物名稱)

      return {
        id: cleanText(row.識別號),
        schoolYear: cleanText(row.年度),
        departmentCode: cleanText(row.系所代碼),
        department: cleanText(row.主聘系所),
        teacherName: cleanText(row.教師姓名),
        appointmentType: cleanText(row.專兼任),
        status: cleanText(row.狀態),
        title: cleanText(row.論文名稱),
        journalCategoriesRaw: cleanText(row.論文收錄分類),
        journalCategories: splitJournalCategories(row.論文收錄分類),
        authorOrder: cleanText(row.作者順序),
        isCorrespondingAuthor: parseBooleanFlag(row.通訊作者),
        journalName,
        normalizedJournalName: normalizeJournalName(journalName),
        hasPeerReview: parseBooleanFlag(row.是否具有審稿制度),
        isInternationalCollaboration: parseBooleanFlag(
          row["期刊論文是否為跨國(地區)合作"]
        ),
        issueCountry: cleanText(row["期刊出版地國家/地區"]),
        publicationYear: parseNumber(row.發表年份),
        publicationMonth: cleanText(row.發表月份),
        publicationFormat: cleanText(row.發表型式),
        projectName: cleanText(row.所屬計畫案),
      }
    })
    .filter(
      (row) =>
        row.schoolYear &&
        row.department &&
        row.teacherName &&
        row.title &&
        row.publicationYear > 0
    )
}

export function dedupePaperPublications(records: PaperRecord[]) {
  const grouped = new Map<string, PaperRecord[]>()

  records.forEach((record) => {
    const key = createPaperKey(record)
    const current = grouped.get(key) ?? []
    current.push(record)
    grouped.set(key, current)
  })

  return Array.from(grouped.entries()).map(([paperKey, group]) => {
    const [base] = group
    const teacherNames = uniqueSorted(group.map((record) => record.teacherName))
    const departments = uniqueSorted(group.map((record) => record.department))
    const issueCountries = uniqueSorted(group.map((record) => record.issueCountry))
    const journalCategories = uniqueSorted(
      group.flatMap((record) => record.journalCategories)
    )
    const correspondingAuthors = uniqueSorted(
      group
        .filter((record) => record.isCorrespondingAuthor)
        .map((record) => record.teacherName)
    )
    const firstAuthors = uniqueSorted(
      group
        .filter((record) => record.authorOrder === "第一作者")
        .map((record) => record.teacherName)
    )

    return {
      paperKey,
      schoolYear: base.schoolYear,
      publicationYear: base.publicationYear,
      title: base.title,
      journalName: base.journalName,
      normalizedJournalName: base.normalizedJournalName,
      journalCategories,
      departments,
      teacherNames,
      correspondingAuthors,
      firstAuthors,
      isInternationalCollaboration: group.some(
        (record) => record.isInternationalCollaboration
      ),
      issueCountries,
      hasInternalCoauthor: teacherNames.length > 1,
      teacherParticipationCount: group.length,
    } satisfies PaperPublication
  })
}

export function matchesPaperFilters(
  publication: PaperPublication,
  filters: PaperFilters
) {
  const matchSchoolYear =
    !filters.schoolYear || publication.schoolYear === filters.schoolYear
  const matchDepartment =
    !filters.department || publication.departments.includes(filters.department)
  const matchTeacher =
    !filters.teacherName || publication.teacherNames.includes(filters.teacherName)
  const matchCategory =
    filters.journalCategories.length === 0 ||
    filters.journalCategories.some((category) =>
      publication.journalCategories.includes(category)
    )

  return matchSchoolYear && matchDepartment && matchTeacher && matchCategory
}

export function filterPaperPublications(
  publications: PaperPublication[],
  filters: PaperFilters
) {
  return publications.filter((publication) =>
    matchesPaperFilters(publication, filters)
  )
}

export function getPaperSchoolYears(records: PaperRecord[]) {
  return uniqueSorted(records.map((record) => record.schoolYear)).sort(
    (a, b) => Number(b) - Number(a)
  )
}

export function getPaperDepartments(records: PaperRecord[]) {
  return uniqueSorted(records.map((record) => record.department))
}

export function getPaperTeachers(records: PaperRecord[]) {
  return uniqueSorted(records.map((record) => record.teacherName))
}

export function getPaperJournalCategories(records: PaperRecord[]) {
  return uniqueSorted(records.flatMap((record) => record.journalCategories))
}

export function getPublicationCountByCategory(publications: PaperPublication[]) {
  const counts = new Map<string, number>()

  publications.forEach((publication) => {
    publication.journalCategories.forEach((category) => {
      counts.set(category, (counts.get(category) ?? 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
}

export function getSsciScieBucketCounts(publications: PaperPublication[]) {
  return publications.reduce(
    (counts, publication) => {
      const hasSsci = publication.journalCategories.includes("SSCI")
      const hasScie = publication.journalCategories.includes("SCIE")

      if (hasSsci && hasScie) {
        counts.both += 1
      } else if (hasSsci) {
        counts.ssciOnly += 1
      } else if (hasScie) {
        counts.scieOnly += 1
      }

      return counts
    },
    {
      ssciOnly: 0,
      scieOnly: 0,
      both: 0,
    }
  )
}

export function getPublicationCountByCountry(
  publications: PaperPublication[],
  limit = 10
) {
  const counts = new Map<string, number>()

  publications.forEach((publication) => {
    publication.issueCountries.forEach((country) => {
      counts.set(country, (counts.get(country) ?? 0) + 1)
    })
  })

  return Array.from(counts.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, limit)
}

export function getPaperTrendSeries(publications: PaperPublication[]) {
  const years = uniqueSorted(
    publications.map((publication) => String(publication.publicationYear))
  ).sort((a, b) => Number(a) - Number(b))

  return years.map((year) => {
    const yearPublications = publications.filter(
      (publication) => String(publication.publicationYear) === year
    )

    const firstAuthorPapers = yearPublications.filter(
      (publication) => publication.firstAuthors.length > 0
    ).length
    const correspondingAuthorPapers = yearPublications.filter(
      (publication) => publication.correspondingAuthors.length > 0
    ).length
    const firstOrCorrespondingPapers = yearPublications.filter((publication) =>
      publication.firstAuthors.some((author) =>
        publication.correspondingAuthors.includes(author)
      )
    ).length
    const internalCoauthorPapers = yearPublications.filter(
      (publication) => publication.hasInternalCoauthor
    ).length
    const ssciOnlyPapers = yearPublications.filter((publication) => {
      const hasSsci = publication.journalCategories.includes("SSCI")
      const hasScie = publication.journalCategories.includes("SCIE")
      return hasSsci && !hasScie
    }).length
    const scieOnlyPapers = yearPublications.filter((publication) => {
      const hasSsci = publication.journalCategories.includes("SSCI")
      const hasScie = publication.journalCategories.includes("SCIE")
      return !hasSsci && hasScie
    }).length
    const ssciAndSciePapers = yearPublications.filter((publication) => {
      const hasSsci = publication.journalCategories.includes("SSCI")
      const hasScie = publication.journalCategories.includes("SCIE")
      return hasSsci && hasScie
    }).length

    return {
      year,
      totalPapers: yearPublications.length,
      firstAuthorPapers,
      correspondingAuthorPapers,
      firstOrCorrespondingPapers,
      internalCoauthorPapers,
      ssciOnlyPapers,
      scieOnlyPapers,
      ssciAndSciePapers,
    }
  })
}
