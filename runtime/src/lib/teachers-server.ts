import { promises as fs } from "node:fs"
import { DATA_FILES, dataFilePath } from "./data-files"
import { parseTeachersCsv } from "./teachers"

export async function loadTeachersCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.teachers)
  const csvText = await fs.readFile(filePath, "utf8")

  return parseTeachersCsv(csvText)
}
