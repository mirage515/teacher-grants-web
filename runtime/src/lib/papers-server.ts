import { promises as fs } from "node:fs"
import { DATA_FILES, dataFilePath } from "./data-files"
import { parsePaperCsv } from "./papers"

export async function loadPaperCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.papers)
  const csvText = await fs.readFile(filePath, "utf8")

  return parsePaperCsv(csvText)
}
