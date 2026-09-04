"use client"

import {
  ReactNode,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import CountUp from "react-countup"
import {
  Area,
  AreaChart,
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
} from "recharts"
import DashboardTabs from "../ui/DashboardTabs"
import PanelCard from "../ui/PanelCard"
import {
  DEFAULT_PROJECT_FILTERS,
  DEFAULT_PROJECT_SELECTION,
  filterProjectRecords,
  filterProjectsBySelection,
  getDepartmentProjectRank,
  getProjectDepartments,
  getProjectSummary,
  getProjectTeachers,
  getProjectTypeDistribution,
  getProjectTypes,
  getProjectYears,
  getProjectYearTrend,
  getTeacherProjectRank,
} from "../../lib/projects"
import { ProjectFilters, ProjectRecord, ProjectSelection } from "../../types/projects"

type Props = {
  records: ProjectRecord[]
}

type TooltipPayload = {
  name?: string
  value?: number | string
  payload?: {
    name?: string
    year?: string
    amount?: number
    count?: number
    percentage?: number
  }
}

type TooltipProps = {
  active?: boolean
  payload?: TooltipPayload[]
  label?: string
}

const PROJECT_COLORS = [
  "#f59e0b",
  "#4fd1c5",
  "#60a5fa",
  "#f97316",
  "#34d399",
  "#f472b6",
  "#a78bfa",
  "#22d3ee",
  "#fb7185",
  "#fde047",
]

function formatMoney(value: number) {
  return `NT$ ${Math.round(value).toLocaleString()}`
}

function shortenLabel(value: string, limit = 12) {
  return value.length > limit ? `${value.slice(0, limit)}...` : value
}

function toggleValue(values: string[], value: string) {
  return values.includes(value)
    ? values.filter((item) => item !== value)
    : [...values, value]
}

function SummaryCard({
  title,
  value,
  accent,
  displayValue,
}: {
  title: string
  value: number
  accent: string
  displayValue?: string
}) {
  return (
    <PanelCard className="border-white/10">
      <p className="mb-2 text-sm text-slate-200">{title}</p>
      <div className="flex items-end justify-between gap-3">
        <p className="whitespace-nowrap text-2xl font-bold text-white md:text-3xl">
          {displayValue ?? (
            <CountUp key={`${title}-${value}`} end={value} duration={1.1} separator="," />
          )}
        </p>
        <span className="h-3 w-10 rounded-full" style={{ backgroundColor: accent }} />
      </div>
    </PanelCard>
  )
}

function AmountTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length) return null

  const item = payload[0]
  const data = item.payload ?? {}
  const amount = Number(data.amount ?? item.value ?? 0)
  const count = Number(data.count ?? 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(2,6,23,0.92)] px-4 py-3 text-sm text-slate-50 shadow-[0_16px_40px_rgba(0,0,0,0.28)]">
      <p className="font-medium text-white">{data.name ?? data.year ?? label}</p>
      <p className="mt-1 text-amber-200">{formatMoney(amount)}</p>
      {count > 0 ? <p className="text-slate-300">{count} 件</p> : null}
      {data.percentage ? <p className="text-slate-300">{data.percentage.toFixed(1)}%</p> : null}
    </div>
  )
}

function ProjectTypeMultiSelect({
  options,
  value,
  onChange,
}: {
  options: string[]
  value: string[]
  onChange: (value: string[]) => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const label =
    value.length === 0
      ? "全部專案類型"
      : value.length === 1
        ? value[0]
        : `已選 ${value.length} 類`

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:bg-white/10 focus:border-fuchsia-300 md:text-base"
      >
        <span className="truncate">{label}</span>
        <span className={`text-slate-300 transition ${isOpen ? "rotate-180" : ""}`}>⌄</span>
      </button>

      {isOpen ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[70] rounded-2xl border border-white/10 bg-slate-950/95 p-3 shadow-[0_24px_70px_rgba(2,8,23,0.45)] backdrop-blur-xl">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm text-slate-300">
              {value.length ? `已選 ${value.length} 類` : "未限定類型"}
            </span>
            {value.length ? (
              <button
                type="button"
                onClick={() => {
                  onChange([])
                  setIsOpen(false)
                }}
                className="text-sm text-cyan-100 transition hover:text-white"
              >
                清除
              </button>
            ) : null}
          </div>
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {options.map((option) => (
              <label
                key={option}
                className="flex cursor-pointer items-start gap-2 rounded-xl px-2 py-1.5 text-base text-slate-100 transition hover:bg-white/8"
              >
                <input
                  type="checkbox"
                  checked={value.includes(option)}
                  onChange={() => onChange(toggleValue(value, option))}
                  className="mt-1 accent-cyan-300"
                />
                <span className="leading-6">{option}</span>
              </label>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            完成
          </button>
        </div>
      ) : null}
    </div>
  )
}

function LollipopChart({
  title,
  data,
  selectedName,
  onSelect,
  action,
}: {
  title: string
  data: Array<{ name: string; amount: number; count: number }>
  selectedName: string
  onSelect: (name: string) => void
  action?: ReactNode
}) {
  const chartHeight = Math.max(360, data.length * 42)
  const handleChartSelect = (entry: { name?: unknown; payload?: { name?: unknown } }) => {
    const name = String(entry.payload?.name ?? entry.name ?? "")
    if (name) onSelect(name)
  }

  return (
    <PanelCard className="min-w-0 border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">{title}</h2>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {data.length} 項
          </span>
        </div>
      </div>

      <div className="w-full" style={{ height: chartHeight }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} layout="vertical" margin={{ top: 10, right: 24, left: 8, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.16)" />
            <XAxis
              type="number"
              tick={{ fill: "#cbd5e1", fontSize: 12 }}
              tickFormatter={(value) => `${Math.round(Number(value) / 10000).toLocaleString()}萬`}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              type="category"
              dataKey="name"
              width={150}
              interval={0}
              tick={{ fill: "#e2e8f0", fontSize: 12 }}
              tickFormatter={(value) => shortenLabel(String(value), 10)}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip content={<AmountTooltip />} cursor={{ stroke: "rgba(251,191,36,0.28)" }} />
            <Bar
              dataKey="amount"
              barSize={4}
              radius={[999, 999, 999, 999]}
              onClick={handleChartSelect}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={selectedName === entry.name ? "#f8fafc" : "rgba(251,191,36,0.48)"}
                  opacity={selectedName && selectedName !== entry.name ? 0.4 : 1}
                  cursor="pointer"
                />
              ))}
            </Bar>
            <Scatter dataKey="amount" shape="circle" onClick={handleChartSelect}>
              {data.map((entry, index) => (
                <Cell
                  key={`${entry.name}-${index}`}
                  fill={selectedName === entry.name ? "#f8fafc" : PROJECT_COLORS[index % PROJECT_COLORS.length]}
                  opacity={selectedName && selectedName !== entry.name ? 0.45 : 1}
                  cursor="pointer"
                />
              ))}
            </Scatter>
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

function TreemapTile(props: {
  x?: number
  y?: number
  width?: number
  height?: number
  name?: string
  index?: number
  onSelect?: (name: string) => void
  selectedNames?: string[]
}) {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    index = 0,
    onSelect,
    selectedNames = [],
  } = props
  const isSelected = selectedNames.includes(name)

  if (width < 56 || height < 42) return null

  return (
    <g onClick={() => onSelect?.(name)} style={{ cursor: onSelect ? "pointer" : "default" }}>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={14}
        ry={14}
        fill={PROJECT_COLORS[index % PROJECT_COLORS.length]}
        fillOpacity={selectedNames.length && !isSelected ? 0.36 : 0.92}
        stroke={isSelected ? "rgba(255,255,255,0.86)" : "rgba(255,255,255,0.14)"}
        strokeWidth={isSelected ? 2 : 1}
      />
      <foreignObject x={x + 10} y={y + 8} width={width - 20} height={height - 16} style={{ pointerEvents: "none" }}>
        <div className="flex h-full flex-col justify-between">
          <span className="line-clamp-2 text-sm font-semibold leading-5 text-white">
            {shortenLabel(name, 16)}
          </span>
        </div>
      </foreignObject>
    </g>
  )
}

function TypeTreemap({
  data,
  selectedNames,
  onToggle,
  action,
}: {
  data: Array<{ name: string; amount: number; count: number; percentage: number }>
  selectedNames: string[]
  onToggle: (name: string) => void
  action?: ReactNode
}) {
  return (
    <PanelCard className="min-w-0 border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">專案類型金額分布</h2>
        <div className="flex items-center gap-2">
          {action}
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
            {data.length} 項
          </span>
        </div>
      </div>

      <div className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={data.map((item) => ({ ...item, value: item.amount }))}
            dataKey="value"
            aspectRatio={4 / 3}
            stroke="rgba(255,255,255,0.12)"
            content={<TreemapTile onSelect={onToggle} selectedNames={selectedNames} />}
          >
            <Tooltip content={<AmountTooltip />} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </PanelCard>
  )
}

function TeacherRankCards({
  data,
  selectedName,
  onSelect,
}: {
  data: Array<{ name: string; amount: number; count: number }>
  selectedName: string
  onSelect: (name: string) => void
}) {
  const maxAmount = Math.max(...data.map((item) => item.amount), 1)

  return (
    <PanelCard className="border-white/10">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-white md:text-xl">教師承接金額排行</h2>
        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
          {data.length} 位
        </span>
      </div>

      <div className="space-y-3">
        {data.map((item, index) => (
          <button
            key={item.name}
            type="button"
            onClick={() => onSelect(item.name)}
            className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
              selectedName === item.name
                ? "border-amber-200/70 bg-amber-200/12"
                : "border-white/8 bg-white/5 hover:bg-white/8"
            }`}
          >
            <div className="mb-2 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/8 text-xs text-slate-200">
                  {index + 1}
                </span>
                <span className="font-medium text-white">{item.name}</span>
              </div>
              <span className="text-xs text-slate-300">{item.count} 件</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-300 to-cyan-300"
                  style={{ width: `${Math.max((item.amount / maxAmount) * 100, 4)}%` }}
                />
              </div>
              <span className="whitespace-nowrap text-sm text-amber-100">
                {formatMoney(item.amount)}
              </span>
            </div>
          </button>
        ))}
      </div>
    </PanelCard>
  )
}

export default function ProjectContractsDashboard({ records }: Props) {
  const [filters, setFilters] = useState<ProjectFilters>(DEFAULT_PROJECT_FILTERS)
  const [teacherKeyword, setTeacherKeyword] = useState("")
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false)
  const [selection, setSelection] = useState<ProjectSelection>(DEFAULT_PROJECT_SELECTION)
  const [showDetails, setShowDetails] = useState(false)
  const teacherBoxRef = useRef<HTMLDivElement | null>(null)
  const teacherSearch = useDeferredValue(teacherKeyword)
  const onPointerDownOutside = useEffectEvent((event: MouseEvent) => {
    if (
      teacherBoxRef.current &&
      !teacherBoxRef.current.contains(event.target as Node)
    ) {
      setTeacherDropdownOpen(false)
    }
  })

  useEffect(() => {
    document.addEventListener("mousedown", onPointerDownOutside)
    return () => document.removeEventListener("mousedown", onPointerDownOutside)
  }, [])

  const years = useMemo(() => getProjectYears(records), [records])
  const departments = useMemo(() => getProjectDepartments(records), [records])
  const projectTypes = useMemo(() => getProjectTypes(records), [records])

  const teacherSourceRecords = useMemo(
    () =>
      records.filter(
        (record) =>
          (!filters.year || record.year === filters.year) &&
          (!filters.department || record.department === filters.department) &&
          (filters.projectTypes.length === 0 || filters.projectTypes.includes(record.projectType))
      ),
    [records, filters.year, filters.department, filters.projectTypes]
  )
  const teachers = useMemo(() => getProjectTeachers(teacherSourceRecords), [teacherSourceRecords])
  const teacherOptions = useMemo(() => {
    const keyword = teacherSearch.trim()
    if (!keyword) return teachers

    return teachers.filter((teacher) => teacher.includes(keyword))
  }, [teacherSearch, teachers])

  const effectiveFilters = useMemo(
    () => ({
      year: years.includes(filters.year) ? filters.year : "",
      department: departments.includes(filters.department) ? filters.department : "",
      teacherName: teachers.includes(filters.teacherName) ? filters.teacherName : "",
      projectTypes: filters.projectTypes.filter((type) => projectTypes.includes(type)),
    }),
    [departments, filters, projectTypes, teachers, years]
  )

  const filteredRecords = useMemo(
    () => filterProjectRecords(records, effectiveFilters),
    [records, effectiveFilters]
  )

  const effectiveSelection = useMemo(
    () => ({
      year:
        selection.year && filteredRecords.some((record) => record.year === selection.year)
          ? selection.year
          : "",
      projectTypes: selection.projectTypes.filter((type) =>
        filteredRecords.some((record) => record.projectType === type)
      ),
      department:
        selection.department &&
        filteredRecords.some((record) => record.department === selection.department)
          ? selection.department
          : "",
      teacherName:
        selection.teacherName &&
        filteredRecords.some((record) => record.teacherName === selection.teacherName)
          ? selection.teacherName
          : "",
    }),
    [filteredRecords, selection]
  )

  const scopedRecords = useMemo(
    () => filterProjectsBySelection(filteredRecords, effectiveSelection),
    [filteredRecords, effectiveSelection]
  )
  const typeScopedRecords = useMemo(
    () =>
      filterProjectsBySelection(filteredRecords, {
        ...DEFAULT_PROJECT_SELECTION,
        department: effectiveSelection.department,
        teacherName: effectiveSelection.teacherName,
      }),
    [filteredRecords, effectiveSelection.department, effectiveSelection.teacherName]
  )
  const trendScopedRecords = useMemo(
    () =>
      filterProjectsBySelection(filteredRecords, {
        ...DEFAULT_PROJECT_SELECTION,
        projectTypes: effectiveSelection.projectTypes,
        department: effectiveSelection.department,
        teacherName: effectiveSelection.teacherName,
      }),
    [
      filteredRecords,
      effectiveSelection.department,
      effectiveSelection.projectTypes,
      effectiveSelection.teacherName,
    ]
  )
  const summary = useMemo(() => getProjectSummary(scopedRecords), [scopedRecords])
  const yearTrend = useMemo(() => getProjectYearTrend(trendScopedRecords), [trendScopedRecords])
  const typeDistribution = useMemo(
    () => getProjectTypeDistribution(typeScopedRecords),
    [typeScopedRecords]
  )
  const departmentRank = useMemo(
    () => getDepartmentProjectRank(scopedRecords, 12),
    [scopedRecords]
  )
  const teacherRank = useMemo(
    () => getTeacherProjectRank(scopedRecords, 10),
    [scopedRecords]
  )
  const projectList = useMemo(() => scopedRecords.slice(0, 18), [scopedRecords])

  function handleFilterChange(key: keyof ProjectFilters, value: string | string[]) {
    if (key === "teacherName") {
      setTeacherKeyword(String(value))
    } else {
      setTeacherKeyword("")
      setTeacherDropdownOpen(false)
    }

    setFilters((current) => ({
      ...current,
      [key]: value,
      ...(key === "year" || key === "department" || key === "projectTypes"
        ? { teacherName: "" }
        : {}),
    }))
    setSelection(DEFAULT_PROJECT_SELECTION)
  }

  function handleTeacherSelect(name: string) {
    handleFilterChange("teacherName", name)
    setTeacherKeyword(name)
    setTeacherDropdownOpen(false)
  }

  function clearSelection() {
    setSelection(DEFAULT_PROJECT_SELECTION)
  }

  function resetFilters() {
    setFilters(DEFAULT_PROJECT_FILTERS)
    setTeacherKeyword("")
    setTeacherDropdownOpen(false)
    setSelection(DEFAULT_PROJECT_SELECTION)
    setShowDetails(false)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#12233f] text-white">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(245,158,11,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(79,209,197,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(96,165,250,0.12),transparent_28%)] blur-3xl" />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-cyan-200/80 md:text-sm">
              Project Analytic Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl xl:text-4xl">
              計畫承接儀錶板
            </h1>
          </div>

          <DashboardTabs />
        </div>

        <div className="space-y-4">
          <PanelCard className="z-50 overflow-visible border-white/10">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[0.8fr_1fr_1fr_1.25fr_auto]">
              <div>
                <label className="mb-2 block text-sm text-slate-100">年度</label>
                <select
                  value={effectiveFilters.year}
                  onChange={(event) => handleFilterChange("year", event.target.value)}
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-amber-300 md:text-base"
                >
                  <option value="" className="text-black">全部年度</option>
                  {years.map((year) => (
                    <option key={year} value={year} className="text-black">{year}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">系所</label>
                <select
                  value={effectiveFilters.department}
                  onChange={(event) => handleFilterChange("department", event.target.value)}
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 md:text-base"
                >
                  <option value="" className="text-black">全部系所</option>
                  {departments.map((department) => (
                    <option key={department} value={department} className="text-black">{department}</option>
                  ))}
                </select>
              </div>

              <div ref={teacherBoxRef} className="relative z-40">
                <label className="mb-2 block text-sm text-slate-100">教師</label>
                <button
                  type="button"
                  onClick={() => setTeacherDropdownOpen((current) => !current)}
                  className="flex min-h-[52px] w-full items-center justify-between gap-3 rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300 md:text-base"
                >
                  <span className={effectiveFilters.teacherName ? "truncate text-white" : "truncate text-slate-300"}>
                    {effectiveFilters.teacherName || "全部教師"}
                  </span>
                  <span className={`text-slate-300 transition ${teacherDropdownOpen ? "rotate-180" : ""}`}>
                    ▾
                  </span>
                </button>

                {teacherDropdownOpen ? (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-400/20 bg-[#18304f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                    <div className="border-b border-slate-400/20 p-2">
                      <input
                        type="text"
                        value={teacherKeyword}
                        onChange={(event) => {
                          setTeacherKeyword(event.target.value)
                          if (filters.teacherName) {
                            handleFilterChange("teacherName", "")
                          }
                        }}
                        placeholder="輸入教師姓名搜尋"
                        className="w-full rounded-xl border border-slate-400/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-300/70 focus:border-emerald-300 md:text-base"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleFilterChange("teacherName", "")
                          setTeacherKeyword("")
                          setTeacherDropdownOpen(false)
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10 md:text-base"
                      >
                        全部教師
                      </button>

                      {teacherOptions.length ? (
                        teacherOptions.map((teacher) => (
                          <button
                            key={teacher}
                            type="button"
                            onClick={() => handleTeacherSelect(teacher)}
                            className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10 md:text-base"
                          >
                            {teacher}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-300">
                          找不到符合條件的教師
                        </div>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">專案類型</label>
                <ProjectTypeMultiSelect
                  options={projectTypes}
                  value={effectiveFilters.projectTypes}
                  onChange={(nextValue) => handleFilterChange("projectTypes", nextValue)}
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-cyan-300/45 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/15 md:w-auto md:px-6"
                >
                  重設篩選
                </button>
              </div>
            </div>
          </PanelCard>

          <div className="grid gap-4 md:grid-cols-2">
            <SummaryCard title="計畫件數" value={summary.projectCount} accent="#f59e0b" />
            <SummaryCard
              title="計畫總金額"
              value={summary.totalAmount}
              accent="#4fd1c5"
              displayValue={formatMoney(summary.totalAmount)}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
            <PanelCard className="border-white/10">
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-white md:text-xl">年度承接趨勢</h2>
              </div>
              <div className="h-[420px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={yearTrend} margin={{ top: 12, right: 20, left: 0, bottom: 10 }}>
                    <defs>
                      <linearGradient id="projectAmountGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.64} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.18)" />
                    <XAxis dataKey="year" tick={{ fill: "#cbd5e1", fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#cbd5e1", fontSize: 12 }} tickFormatter={(value) => `${Math.round(Number(value) / 10000).toLocaleString()}萬`} axisLine={false} tickLine={false} />
                    <Tooltip content={<AmountTooltip />} />
                    <Area
                      type="monotone"
                      dataKey="amount"
                      stroke="#fbbf24"
                      strokeWidth={3}
                      fill="url(#projectAmountGradient)"
                      activeDot={{ r: 7 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </PanelCard>

            <TypeTreemap
              data={typeDistribution}
              selectedNames={effectiveSelection.projectTypes}
              action={
                effectiveSelection.projectTypes.length ? (
                  <button
                    type="button"
                    onClick={() => setSelection((current) => ({ ...current, projectTypes: [] }))}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
              onToggle={(name) =>
                setSelection((current) => ({
                  ...current,
                  projectTypes: toggleValue(current.projectTypes, name),
                }))
              }
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-2">
            <LollipopChart
              title="系所承接金額排行"
              data={departmentRank}
              selectedName={effectiveSelection.department}
              action={
                effectiveSelection.department ? (
                  <button
                    type="button"
                    onClick={() =>
                      setSelection((current) => ({
                        ...current,
                        department: "",
                        teacherName: "",
                      }))
                    }
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
              onSelect={(name) =>
                setSelection((current) => ({
                  ...current,
                  department: current.department === name ? "" : name,
                  teacherName: "",
                }))
              }
            />

            <TeacherRankCards
              data={teacherRank}
              selectedName={effectiveSelection.teacherName}
              onSelect={(name) =>
                setSelection((current) => ({
                  ...current,
                  teacherName: current.teacherName === name ? "" : name,
                }))
              }
            />
          </div>

          <PanelCard className="border-white/10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white md:text-xl">計畫清單</h2>
              <div className="flex flex-wrap items-center gap-2">
                {(effectiveSelection.projectTypes.length ||
                  effectiveSelection.department ||
                  effectiveSelection.teacherName) && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-100 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowDetails((current) => !current)}
                  className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  {showDetails ? "收合計畫清單" : "顯示計畫清單"}
                </button>
              </div>
            </div>

            {showDetails ? (
              <div className="space-y-3">
                {projectList.map((project) => (
                  <div key={project.id} className="rounded-[24px] border border-white/8 bg-white/5 p-4">
                    <div className="mb-3 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-1 text-xs text-amber-100">
                        {project.year}
                      </span>
                      <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-3 py-1 text-xs text-cyan-100">
                        {project.department}
                      </span>
                      <span className="rounded-full border border-sky-300/20 bg-sky-300/10 px-3 py-1 text-xs text-sky-100">
                        {project.projectType}
                      </span>
                    </div>

                    <div className="grid gap-3 md:grid-cols-[1fr_auto] md:items-start">
                      <div>
                        <p className="font-medium leading-7 text-white">{project.projectName}</p>
                        <p className="mt-2 text-sm text-slate-300">
                          {project.teacherName}｜{project.startDate} - {project.endDate}｜{project.projectCode || "未填案號"}
                        </p>
                        <p className="mt-1 text-sm text-slate-300">
                          國內委託單位：{project.domesticClient || "未填"}
                        </p>
                      </div>
                      <div className="whitespace-nowrap text-right text-sm text-amber-100">
                        {formatMoney(project.totalAmount)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                需要檢視專案名稱、案號與委託單位時，再展開計畫清單。
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </main>
  )
}
