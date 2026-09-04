"use client"

import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useRef,
  useState,
} from "react"
import CountUp from "react-countup"
import SubcategoryBarChart, {
  SUBCATEGORY_CHART_COLORS,
} from "../charts/SubcategoryBarChart"
import TrendLineChart from "../charts/TrendLineChart"
import DashboardTabs from "../ui/DashboardTabs"
import PanelCard from "../ui/PanelCard"
import {
  DEFAULT_FILTERS,
  filterRecords,
  FIXED_YEARS,
  getUniqueDepartments,
  getUniqueSubcategories,
  getUniqueTeachers,
  GrantFilters,
} from "../../lib/filters"
import {
  getAverageAmountPerTeacher,
  getShareAmount,
  getSubcategoryAmountData,
  getTeacherAmountData,
  getTeacherCount,
  getTotalAmount,
  getTrendChartData,
} from "../../lib/stats"
import { maskPersonName } from "../../lib/privacy"
import { GrantRecord } from "../../types/grant"

type Props = {
  records: GrantRecord[]
}

type TeacherSearchItem = {
  name: string
}

function formatAmount(value: number) {
  return `${value.toLocaleString()}元`
}

function formatPercentage(value: number) {
  return `(${value.toFixed(2)}%)`
}

export default function TeacherGrantsDashboard({ records }: Props) {
  const [filters, setFilters] = useState<GrantFilters>(DEFAULT_FILTERS)
  const [teacherKeyword, setTeacherKeyword] = useState("")
  const [teacherDropdownOpen, setTeacherDropdownOpen] = useState(false)
  const [showTeacherAmountDistribution, setShowTeacherAmountDistribution] = useState(false)
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

  const departments = useMemo(() => getUniqueDepartments(records), [records])

  const teacherSourceRecords = useMemo(() => {
    return records.filter((record) => {
      const matchYear = !filters.year || record.year === filters.year
      const matchDepartment =
        !filters.department || record.department === filters.department
      const matchSubcategory =
        !filters.subcategory || record.subcategory === filters.subcategory

      return matchYear && matchDepartment && matchSubcategory
    })
  }, [records, filters.year, filters.department, filters.subcategory])

  const teachers = useMemo<TeacherSearchItem[]>(() => {
    return getUniqueTeachers(teacherSourceRecords).map((name) => ({ name }))
  }, [teacherSourceRecords])

  const teacherOptions = useMemo(() => {
    const keyword = teacherSearch.trim()
    if (!keyword) return teachers

    return teachers.filter((teacher) => teacher.name.includes(keyword))
  }, [teachers, teacherSearch])

  const subcategories = useMemo(() => {
    const source = records.filter((record) => {
      const matchYear = !filters.year || record.year === filters.year
      const matchDepartment =
        !filters.department || record.department === filters.department
      const matchTeacher =
        !filters.teacher || record.teacher === filters.teacher

      return matchYear && matchDepartment && matchTeacher
    })

    return getUniqueSubcategories(source)
  }, [records, filters.year, filters.department, filters.teacher])

  const filteredRecords = useMemo(
    () => filterRecords(records, filters),
    [records, filters]
  )

  const totalAmount = useMemo(() => getTotalAmount(filteredRecords), [filteredRecords])
  const teacherCount = useMemo(() => getTeacherCount(filteredRecords), [filteredRecords])
  const averageAmountPerTeacher = useMemo(
    () => getAverageAmountPerTeacher(filteredRecords),
    [filteredRecords]
  )

  const yearTotalAmount = useMemo(() => {
    const yearRecords = filters.year
      ? records.filter((record) => record.year === filters.year)
      : records

    return getTotalAmount(yearRecords)
  }, [records, filters.year])

  const filterRatio = useMemo(
    () => getShareAmount(totalAmount, yearTotalAmount),
    [totalAmount, yearTotalAmount]
  )

  const chartData = useMemo(() => {
    const chartRecords = filterRecords(records, {
      ...filters,
      subcategory: "",
    })
    const chartTotalAmount = getTotalAmount(chartRecords)

    return getSubcategoryAmountData(chartRecords).map((item) => ({
      ...item,
      percentage: getShareAmount(item.amount, chartTotalAmount) * 100,
    }))
  }, [records, filters])

  const teacherAmountDistribution = useMemo(() => {
    return getTeacherAmountData(filteredRecords).map((item) => ({
      ...item,
      percentage: getShareAmount(item.amount, totalAmount) * 100,
    }))
  }, [filteredRecords, totalAmount])

  const trendSourceRecords = useMemo(() => {
    return records.filter((record) => {
      const matchDepartment =
        !filters.department || record.department === filters.department
      const matchTeacher =
        !filters.teacher || record.teacher === filters.teacher

      return matchDepartment && matchTeacher
    })
  }, [records, filters.department, filters.teacher])

  const trendChartData = useMemo(() => {
    return getTrendChartData(
      trendSourceRecords,
      FIXED_YEARS,
      "subcategory"
    )
  }, [trendSourceRecords])

  const subcategoryColorMap = useMemo(() => {
    return chartData.reduce<Record<string, string>>((map, item, index) => {
      map[item.name] =
        SUBCATEGORY_CHART_COLORS[index % SUBCATEGORY_CHART_COLORS.length]
      return map
    }, {})
  }, [chartData])

  const subcategorySeriesOrder = useMemo(
    () => chartData.map((item) => item.name),
    [chartData]
  )

  function handleFilterChange(key: keyof GrantFilters, value: string) {
    setFilters((prev) => {
      const next = { ...prev, [key]: value }

      const validTeachers = getUniqueTeachers(
        records.filter((record) => {
          const matchYear = !next.year || record.year === next.year
          const matchDepartment =
            !next.department || record.department === next.department
          const matchSubcategory =
            !next.subcategory || record.subcategory === next.subcategory

          return matchYear && matchDepartment && matchSubcategory
        })
      )

      if (next.teacher && !validTeachers.includes(next.teacher)) {
        next.teacher = ""
        setTeacherKeyword("")
      }

      const validSubcategories = getUniqueSubcategories(
        records.filter((record) => {
          const matchYear = !next.year || record.year === next.year
          const matchDepartment =
            !next.department || record.department === next.department
          const matchTeacher =
            !next.teacher || record.teacher === next.teacher

          return matchYear && matchDepartment && matchTeacher
        })
      )

      if (next.subcategory && !validSubcategories.includes(next.subcategory)) {
        next.subcategory = ""
      }

      if (key === "teacher") {
        setTeacherKeyword(value)
      }

      if (key !== "teacher" && !next.teacher) {
        setTeacherKeyword("")
      }

      return next
    })
  }

  function handleTeacherSelect(name: string) {
    handleFilterChange("teacher", name)
    setTeacherKeyword("")
    setTeacherDropdownOpen(false)
  }

  function handleChartItemSelect(name: string) {
    handleFilterChange("subcategory", filters.subcategory === name ? "" : name)
  }

  function clearSubcategorySelection() {
    handleFilterChange("subcategory", "")
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS)
    setTeacherKeyword("")
    setTeacherDropdownOpen(false)
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#12233f] text-white">
      <div className="relative mx-auto flex w-full max-w-[1920px] flex-col gap-6 px-4 py-6 md:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[420px] bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.18),transparent_35%),radial-gradient(circle_at_top_right,rgba(168,85,247,0.10),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.10),transparent_30%)] blur-3xl" />

        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="mb-2 text-xs uppercase tracking-wider text-cyan-200/80 md:text-sm">
              Faculty Grants Dashboard
            </p>
            <h1 className="text-2xl font-bold tracking-tight md:text-3xl xl:text-4xl">
              教師獎補助儀錶板
            </h1>
          </div>

          <DashboardTabs />
        </div>

        <div className="space-y-4">
          <PanelCard className="relative z-30 overflow-visible">
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_1fr_1fr_auto]">
              <div>
                <label className="mb-2 block text-sm text-slate-100">年度</label>
                <select
                  value={filters.year}
                  onChange={(event) => handleFilterChange("year", event.target.value)}
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-300 md:text-base"
                >
                  {FIXED_YEARS.map((year) => (
                    <option key={year} value={year} className="text-black">
                      {year}
                    </option>
                  ))}
                  <option value="" className="text-black">
                    全部
                  </option>
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">系所</label>
                <select
                  value={filters.department}
                  onChange={(event) =>
                    handleFilterChange("department", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-fuchsia-300 md:text-base"
                >
                  <option value="" className="text-black">
                    全部系所
                  </option>
                  {departments.map((department) => (
                    <option
                      key={department}
                      value={department}
                      className="text-black"
                    >
                      {department}
                    </option>
                  ))}
                </select>
              </div>

              <div ref={teacherBoxRef} className="relative z-40">
                <label className="mb-2 block text-sm text-slate-100">教師</label>

                <button
                  type="button"
                  onClick={() => setTeacherDropdownOpen((prev) => !prev)}
                  className="flex w-full items-center justify-between rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-left text-sm text-white outline-none transition hover:border-emerald-300 focus:border-emerald-300 md:text-base"
                >
                  <span className={filters.teacher ? "text-white" : "text-slate-300"}>
                    {filters.teacher ? maskPersonName(filters.teacher) : "全部教師"}
                  </span>
                  <svg
                    className={`h-5 w-5 text-white transition-transform ${
                      teacherDropdownOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 20 20"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path
                      d="M5 7.5L10 12.5L15 7.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>

                {teacherDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-slate-400/20 bg-[#18304f] shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
                    <div className="border-b border-slate-400/20 p-2">
                      <input
                        type="text"
                        value={teacherKeyword}
                        onChange={(event) => {
                          setTeacherKeyword(event.target.value)
                          if (filters.teacher) {
                            handleFilterChange("teacher", "")
                          }
                        }}
                        placeholder="輸入教師姓名關鍵字"
                        className="w-full rounded-xl border border-slate-400/20 bg-white/10 px-3 py-3 text-sm text-white outline-none placeholder:text-slate-300/70 focus:border-emerald-300 md:text-base"
                      />
                    </div>

                    <div className="max-h-64 overflow-y-auto p-2">
                      <button
                        type="button"
                        onClick={() => {
                          handleFilterChange("teacher", "")
                          setTeacherKeyword("")
                          setTeacherDropdownOpen(false)
                        }}
                        className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10 md:text-base"
                      >
                        全部教師
                      </button>

                      {teacherOptions.length > 0 ? (
                        teacherOptions.map((teacher) => (
                          <button
                            key={teacher.name}
                            type="button"
                            onClick={() => handleTeacherSelect(teacher.name)}
                            className="w-full rounded-xl px-3 py-3 text-left text-sm text-slate-100 transition hover:bg-white/10 md:text-base"
                          >
                            {maskPersonName(teacher.name)}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-2 text-sm text-slate-300">
                          找不到符合的教師
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm text-slate-100">次項目</label>
                <select
                  value={filters.subcategory}
                  onChange={(event) =>
                    handleFilterChange("subcategory", event.target.value)
                  }
                  className="w-full rounded-2xl border border-slate-400/30 bg-white/8 px-4 py-3 text-sm text-white outline-none transition focus:border-violet-300 md:text-base"
                >
                  <option value="" className="text-black">
                    全部次項目
                  </option>
                  {subcategories.map((subcategory) => (
                    <option
                      key={subcategory}
                      value={subcategory}
                      className="text-black"
                    >
                      {subcategory}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full rounded-2xl border border-cyan-300/30 bg-cyan-300/10 px-4 py-3 text-sm font-medium text-cyan-100 transition hover:bg-cyan-300/20 md:text-base"
                >
                  重設篩選
                </button>
              </div>
            </div>
          </PanelCard>

          <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <PanelCard className="border-cyan-300/15">
              <p className="mb-2 text-sm text-slate-200">總獎補助金額</p>
              <p className="text-2xl font-bold text-cyan-200 md:text-3xl">
                NT$
                <CountUp end={totalAmount} duration={1.2} separator="," decimals={0} />
              </p>
            </PanelCard>

            <PanelCard className="border-fuchsia-300/15">
              <p className="mb-2 text-sm text-slate-200">教師數量</p>
              <p className="text-2xl font-bold text-fuchsia-200 md:text-3xl">
                <CountUp end={teacherCount} duration={1.2} separator="," />
              </p>
            </PanelCard>

            <PanelCard className="border-violet-300/15">
              <p className="mb-2 text-sm text-slate-200">年度占比</p>
              <p className="text-2xl font-bold text-violet-200 md:text-3xl">
                <CountUp
                  end={filterRatio * 100}
                  duration={1.2}
                  decimals={2}
                  suffix="%"
                />
              </p>
            </PanelCard>

            <PanelCard className="border-emerald-300/15">
              <p className="mb-2 text-sm text-slate-200">教師平均獎補助</p>
              <p className="text-2xl font-bold text-emerald-200 md:text-3xl">
                NT$
                <CountUp
                  end={averageAmountPerTeacher}
                  duration={1.2}
                  separator=","
                  decimals={0}
                />
              </p>
            </PanelCard>

            <PanelCard className="border-cyan-300/15">
              <p className="mb-2 text-sm text-slate-200">資料筆數</p>
              <p className="text-2xl font-bold text-cyan-200 md:text-3xl">
                <CountUp end={filteredRecords.length} duration={1.2} separator="," />
              </p>
            </PanelCard>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <SubcategoryBarChart
              data={chartData}
              mode="subcategory"
              selectedSubcategory={filters.subcategory}
              selectedName={filters.subcategory}
              onSelect={handleChartItemSelect}
              colorMap={subcategoryColorMap}
              action={
                filters.subcategory ? (
                  <button
                    type="button"
                    onClick={clearSubcategorySelection}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
            />

            <TrendLineChart
              data={trendChartData}
              mode="subcategory"
              selectedSubcategory={filters.subcategory}
              selectedSeriesKey={filters.subcategory}
              onSelectSeries={handleChartItemSelect}
              colorMap={subcategoryColorMap}
              seriesOrder={subcategorySeriesOrder}
              action={
                filters.subcategory ? (
                  <button
                    type="button"
                    onClick={clearSubcategorySelection}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300 transition hover:bg-white/10"
                  >
                    清除選項
                  </button>
                ) : null
              }
            />
          </section>

          <PanelCard className="border-white/10">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-white md:text-xl">教師金額分布</h2>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setShowTeacherAmountDistribution((current) => !current)
                  }
                  className="rounded-2xl border border-cyan-300/35 bg-cyan-300/10 px-3 py-2 text-xs text-cyan-100 transition hover:bg-cyan-300/15"
                >
                  {showTeacherAmountDistribution
                    ? "收合教師金額分布"
                    : "顯示教師金額分布"}
                </button>
              </div>
            </div>

            {showTeacherAmountDistribution ? (
              teacherAmountDistribution.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
                  {teacherAmountDistribution.map((item) => (
                    <div
                      key={item.name}
                      className="flex min-h-[96px] flex-col justify-center rounded-[24px] border border-white/8 bg-white/5 px-4 py-2.5"
                    >
                      <p className="text-sm font-medium text-slate-100">
                        {maskPersonName(item.name)}
                      </p>
                      <p className="mt-2 text-sm font-medium leading-5 text-cyan-100">
                        {formatAmount(item.amount)}
                      </p>
                      <p className="mt-1 text-sm leading-5 text-slate-300">
                        {formatPercentage(item.percentage ?? 0)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                  目前條件下沒有可顯示的教師金額分布。
                </div>
              )
            ) : (
              <div className="rounded-[24px] border border-white/8 bg-white/5 px-4 py-8 text-center text-sm text-slate-300">
                點選上方篩選或圖表後，再展開查看教師金額分布。
              </div>
            )}
          </PanelCard>
        </div>
      </div>
    </main>
  )
}
