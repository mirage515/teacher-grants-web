export type PaperRecord = {
  id: string
  schoolYear: string
  departmentCode: string
  department: string
  teacherName: string
  appointmentType: string
  status: string
  title: string
  journalCategoriesRaw: string
  journalCategories: string[]
  authorOrder: string
  isCorrespondingAuthor: boolean
  journalName: string
  normalizedJournalName: string
  hasPeerReview: boolean
  isInternationalCollaboration: boolean
  issueCountry: string
  publicationYear: number
  publicationMonth: string
  publicationFormat: string
  projectName: string
}

export type PaperFilters = {
  schoolYear: string
  department: string
  teacherName: string
  journalCategories: string[]
}

export type PaperPublication = {
  paperKey: string
  schoolYear: string
  publicationYear: number
  title: string
  journalName: string
  normalizedJournalName: string
  journalCategories: string[]
  departments: string[]
  teacherNames: string[]
  correspondingAuthors: string[]
  firstAuthors: string[]
  isInternationalCollaboration: boolean
  issueCountries: string[]
  hasInternalCoauthor: boolean
  teacherParticipationCount: number
}
