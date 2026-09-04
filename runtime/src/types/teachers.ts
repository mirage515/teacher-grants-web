export type TeacherRecord = {
  id: string
  academicYear: string
  semester: string
  department: string
  name: string
  gender: string
  age: number
  status: string
  appointmentDate: string
  firstArrivalDate: string
  establishmentType: string
  employmentType: string
  concurrentDepartment: string
  hasAdminRole: string
  adminRole: string
  highestSchoolType: string
  highestSchool: string
  highestDepartment: string
  highestDegree: string
  specialty: string
  teacherCategory: string
  appointmentRank: string
  certificateRank: string
  flexibleSalary: string
  industryExperience: string
  retiredRehire: string
}

export type TeacherFilters = {
  department: string
  employmentType: string
  establishmentType: string
  appointmentRanks: string[]
}

export type TeacherSummary = {
  total: number
  fullTime: number
  partTime: number
  inEstablishment: number
  adminRole: number
  averageAge: number
}
