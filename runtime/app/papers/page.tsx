import PaperPublicationsDashboard from "../../src/components/dashboard/PaperPublicationsDashboard"
import { loadPaperCsvFromDisk } from "../../src/lib/papers-server"

export default async function PapersPage() {
  const records = await loadPaperCsvFromDisk()

  return <PaperPublicationsDashboard records={records} />
}
