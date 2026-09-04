import TeachingAnalyticsDashboard from "../../src/components/dashboard/TeachingAnalyticsDashboard"
import { loadTeachingCsvFromDisk } from "../../src/lib/teaching-server"

export default async function TeachingPage() {
  const records = await loadTeachingCsvFromDisk()

  return <TeachingAnalyticsDashboard records={records} />
}
