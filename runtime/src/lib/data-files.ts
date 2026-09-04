import path from "node:path"

export const DATA_FILES = {
  grants: "grants_112_114.csv",
  teaching: "teaching_awards_114_115.csv",
  papers: "papers_112_114.csv",
  projects: "projects_112_114.csv",
  teachers: "teachers_114_2.csv",
  patent: "patent.csv",
  transfer: "transfer.csv",
} as const

export function dataFilePath(fileName: (typeof DATA_FILES)[keyof typeof DATA_FILES]) {
  return path.join(process.cwd(), "data", fileName)
}
