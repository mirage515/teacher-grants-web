export type ProjectRecord = {
  id: string
  year: string
  department: string
  teacherName: string
  projectCode: string
  projectName: string
  projectType: string
  startDate: string
  endDate: string
  totalAmount: number
  domesticClient: string
}

export type ProjectFilters = {
  year: string
  department: string
  teacherName: string
  projectTypes: string[]
}

export type ProjectSelection = {
  year: string
  projectTypes: string[]
  department: string
  teacherName: string
}

export type ProjectSummary = {
  projectCount: number
  totalAmount: number
}
