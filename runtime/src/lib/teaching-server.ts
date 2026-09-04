import { promises as fs } from "node:fs"
import { DATA_FILES, dataFilePath } from "./data-files"
import { parseTeachingCsv } from "./teaching"

export async function loadTeachingCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.teaching)
  const csvText = await fs.readFile(filePath, "utf8")

  return parseTeachingCsv(csvText)
}
