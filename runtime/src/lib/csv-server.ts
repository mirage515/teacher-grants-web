import { promises as fs } from "node:fs"
import { parseGrantCsv } from "./csv"
import { DATA_FILES, dataFilePath } from "./data-files"

export async function loadGrantCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.grants)
  const csvText = await fs.readFile(filePath, "utf8")

  return parseGrantCsv(csvText)
}
