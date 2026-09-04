import ProjectContractsDashboard from "../../src/components/dashboard/ProjectContractsDashboard"
import { loadProjectContractsCsvFromDisk } from "../../src/lib/projects-server"

export default async function ProjectsPage() {
  const records = await loadProjectContractsCsvFromDisk()

  return <ProjectContractsDashboard records={records} />
}
