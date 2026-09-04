import FacultyStaffingDashboard from "../../src/components/dashboard/FacultyStaffingDashboard"
import { loadPaperCsvFromDisk } from "../../src/lib/papers-server"
import { loadProjectContractsCsvFromDisk } from "../../src/lib/projects-server"
import {
  loadPatentCsvFromDisk,
  loadTransferCsvFromDisk,
} from "../../src/lib/research-assets-server"
import { loadTeachersCsvFromDisk } from "../../src/lib/teachers-server"

export default async function TeachersPage() {
  const [records, paperRecords, projectRecords, patentRecords, transferRecords] = await Promise.all([
    loadTeachersCsvFromDisk(),
    loadPaperCsvFromDisk(),
    loadProjectContractsCsvFromDisk(),
    loadPatentCsvFromDisk(),
    loadTransferCsvFromDisk(),
  ])

  return (
    <FacultyStaffingDashboard
      records={records}
      paperRecords={paperRecords}
      projectRecords={projectRecords}
      patentRecords={patentRecords}
      transferRecords={transferRecords}
    />
  )
}
