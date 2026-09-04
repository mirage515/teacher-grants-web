import { promises as fs } from "node:fs"
import { DATA_FILES, dataFilePath } from "./data-files"
import { parseProjectContractsCsv } from "./projects"

export async function loadProjectContractsCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.projects)
  const csvText = await fs.readFile(filePath, "utf8")

  return parseProjectContractsCsv(csvText)
}
