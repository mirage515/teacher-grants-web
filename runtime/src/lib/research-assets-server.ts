import { promises as fs } from "node:fs"
import { DATA_FILES, dataFilePath } from "./data-files"
import { parsePatentCsv, parseTransferCsv } from "./research-assets"

export async function loadPatentCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.patent)
  const csvText = await fs.readFile(filePath, "utf8")

  return parsePatentCsv(csvText)
}

export async function loadTransferCsvFromDisk() {
  const filePath = dataFilePath(DATA_FILES.transfer)
  const csvText = await fs.readFile(filePath, "utf8")

  return parseTransferCsv(csvText)
}
