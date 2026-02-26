import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { getIncomeStats, type StatPoint } from '@/lib/api'

const BRAND = '#0F9D8A'
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
const MONTHS_SHORT_RW = ['Mut','Gas','Wer','Mat','Gic','Kam','Nya','Kan','Nze','Uku','Ugs','Ukw']

function formatPeriodLabel(period: string, groupBy: 'month' | 'year', lang: string): string {
  if (groupBy === 'year') return period
  const [, m] = period.split('-')
  const idx = parseInt(m, 10) - 1
  return lang === 'rw' ? MONTHS_SHORT_RW[idx] : MONTHS_SHORT[idx]
}

function formatRWF(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`
  return String(value)
}

export default function ProgressChart() {
  const { t, i18n } = useTranslation()
  const chartRef = useRef<HTMLDivElement>(null)

  const currentYear = new Date().getFullYear()
  const [groupBy, setGroupBy] = useState<'month' | 'year'>('month')
  const [year, setYear] = useState(currentYear)
  const [data, setData] = useState<StatPoint[]>([])
  const [loading, setLoading] = useState(true)

  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const stats = await getIncomeStats(groupBy, groupBy === 'month' ? year : undefined)
      setData(stats)
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [groupBy, year])

  useEffect(() => { load() }, [load])

  const chartData = data.map((d) => ({
    label: formatPeriodLabel(d.period, groupBy, i18n.language),
    total: d.total,
  }))

  const handleDownloadPDF = async () => {
    if (!chartRef.current) return
    const { default: jsPDF } = await import('jspdf')
    const { default: html2canvas } = await import('html2canvas')

    const canvas = await html2canvas(chartRef.current, { scale: 2, useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })

    const pageW = pdf.internal.pageSize.getWidth()
    const pageH = pdf.internal.pageSize.getHeight()
    const imgW = pageW - 20
    const imgH = (canvas.height * imgW) / canvas.width

    const title = groupBy === 'year'
      ? t('chart.titleYear')
      : `${t('chart.titleMonth')} ${year}`

    pdf.setFontSize(14)
    pdf.setTextColor(15, 157, 138)
    pdf.text(title, 10, 12)
    pdf.addImage(imgData, 'PNG', 10, 18, imgW, Math.min(imgH, pageH - 28))
    pdf.save(`imena-income-${groupBy === 'year' ? 'yearly' : year}.pdf`)
  }

  return (
    <section className="px-4 sm:px-6 py-6 border-t border-gray-100">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {t('chart.heading')}
        </h2>

        <div className="flex flex-wrap items-center gap-2">
          {/* Monthly / Yearly toggle */}
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs font-medium">
            <button
              type="button"
              onClick={() => setGroupBy('month')}
              className={`px-3 py-1.5 transition-colors ${
                groupBy === 'month'
                  ? 'bg-[#0F9D8A] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('chart.monthly')}
            </button>
            <button
              type="button"
              onClick={() => setGroupBy('year')}
              className={`px-3 py-1.5 transition-colors ${
                groupBy === 'year'
                  ? 'bg-[#0F9D8A] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              {t('chart.yearly')}
            </button>
          </div>

          {/* Year picker — only shown in monthly mode */}
          {groupBy === 'month' && (
            <select
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:border-[#0F9D8A]"
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          )}

          {/* Download PDF */}
          <button
            type="button"
            onClick={handleDownloadPDF}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-[#0F9D8A] hover:bg-[#0d8a7a] transition-colors"
          >
            <DownloadIcon />
            {t('chart.downloadPDF')}
          </button>
        </div>
      </div>

      {/* Chart */}
      <div ref={chartRef} className="bg-white rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-3">
          {groupBy === 'year' ? t('chart.titleYear') : `${t('chart.titleMonth')} ${year}`}
        </p>

        {loading ? (
          <div className="h-56 flex items-center justify-center text-sm text-gray-400">
            {t('chart.loading')}
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-56 flex items-center justify-center text-sm text-gray-400 italic">
            {t('chart.noData')}
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tickFormatter={formatRWF}
                tick={{ fontSize: 11, fill: '#9ca3af' }}
                axisLine={false}
                tickLine={false}
                width={44}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toLocaleString()} RWF`, t('chart.income')]}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: 12 }}
                cursor={{ fill: `${BRAND}15` }}
              />
              <Bar dataKey="total" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={48} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </section>
  )
}

function DownloadIcon() {
  return (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5 5-5M12 15V3" />
    </svg>
  )
}
