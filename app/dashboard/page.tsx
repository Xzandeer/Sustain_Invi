'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Line, Pie } from 'react-chartjs-2'
import { TrendingUp, Wallet, ShoppingBag, Layers } from 'lucide-react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

interface Sale {
  id: string
  amount: number
  timestamp: number
  date: string
  category: string
}

interface Item {
  id: string
  status: string
}

interface AiResponse {
  overallForecast?: number[]
  categoryForecast?: Record<string, number[]>
  analysis?: string
  error?: string
  details?: string
}

const formatCurrency = (value: number) => `\u20b1${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

function StatCard({ title, value, icon: Icon, accent }: { title: string; value: string; icon: any; accent: string }) {
  return (
    <div className="flex items-center gap-4 rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${accent} text-white shadow`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">{title}</p>
        <p className="text-2xl font-bold text-slate-900 dark:text-white">{value}</p>
      </div>
    </div>
  )
}

function CardShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/95 p-5 shadow-xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h2>
      </div>
      {children}
    </div>
  )
}

async function callGeminiAI(
  salesData: number[],
  categorySales: Record<string, number[]>
): Promise<{ forecast: number[]; analysis: string }> {
  try {
    const res = await fetch('/api/forecast', {
      method: 'POST',
      body: JSON.stringify({ sales: salesData, categorySales }),
      headers: { 'Content-Type': 'application/json' },
    })
    const data: AiResponse = await res.json()
    if (data.error) {
      return { forecast: [], analysis: `AI forecast failed: ${data.details || data.error}` }
    }
    return { forecast: data.overallForecast || [], analysis: data.analysis || 'AI analysis unavailable.' }
  } catch (e) {
    return { forecast: [], analysis: 'AI forecast unavailable (network error).' }
  }
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

function DashboardContent() {
  const [items, setItems] = useState<Item[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [overallChartData, setOverallChartData] = useState<any>(null)
  const [categoryChartData, setCategoryChartData] = useState<any>(null)
  const [aiAnalysis, setAiAnalysis] = useState('')

  useEffect(() => {
    let mounted = true

    const salesQuery = query(collection(db, 'sales'), orderBy('timestamp', 'asc'))
    const itemsQuery = collection(db, 'items')

    const unsubSales = onSnapshot(
      salesQuery,
      async (snap) => {
        if (!mounted) return
        const salesList: Sale[] = snap.docs.map((doc) => {
          const d = doc.data() as any
          const ts = d.timestamp ?? Date.now()
          return {
            id: doc.id,
            amount: Number(d.amount ?? 0),
            timestamp: ts,
            date: d.date ?? new Date(ts).toISOString().split('T')[0],
            category: d.category ?? 'Uncategorized',
          }
        })
        setSales(salesList)
        await generateCharts(salesList)
        setLoading(false)
      },
      (error) => {
        console.error('Error loading sales:', error)
        setLoading(false)
      }
    )

    const unsubItems = onSnapshot(
      itemsQuery,
      (snap) => {
        if (!mounted) return
        const itemsList: Item[] = snap.docs.map((doc) => ({ id: doc.id, status: (doc.data() as any).status ?? 'In Stock' }))
        setItems(itemsList)
      },
      (error) => console.error('Error loading items:', error)
    )

    return () => {
      mounted = false
      unsubSales()
      unsubItems()
    }
  }, [])

  async function generateCharts(salesList: Sale[]) {
    const dailyTotals: Record<string, number> = {}
    const categoryDailyTotals: Record<string, Record<string, number>> = {}
    const allDates = new Set<string>()

    for (const s of salesList) {
      dailyTotals[s.date] = (dailyTotals[s.date] || 0) + s.amount
      allDates.add(s.date)
      if (!categoryDailyTotals[s.date]) categoryDailyTotals[s.date] = {}
      categoryDailyTotals[s.date][s.category] = (categoryDailyTotals[s.date][s.category] || 0) + s.amount
    }

    const sortedDates = Array.from(allDates).sort()
    const salesAmounts = sortedDates.map((d) => dailyTotals[d])
    const allCategories = Array.from(new Set(salesList.map((s) => s.category))).filter(Boolean)
    const categorySalesForAPI: Record<string, number[]> = {}
    allCategories.forEach((cat) => {
      categorySalesForAPI[cat] = sortedDates.map((date) => categoryDailyTotals[date]?.[cat] || 0)
    })

    const ai = await callGeminiAI(salesAmounts, categorySalesForAPI)
    setAiAnalysis(ai.analysis || '')

    const labels = sortedDates.map((date) =>
      new Date(date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    )

    const today = new Date()
    const futureLabels = (ai.forecast || []).map((_, i) => {
      const d = new Date(today)
      d.setDate(d.getDate() + i + 1)
      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    })

    setOverallChartData({
      labels: [...labels, ...futureLabels],
      datasets: [
        {
          label: 'Actual Sales',
          data: [...salesAmounts, ...Array(futureLabels.length).fill(null)],
          borderColor: '#7c3aed',
          backgroundColor: 'rgba(124,58,237,0.12)',
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
        },
        {
          label: 'AI Forecast',
          data: [...Array(salesAmounts.length).fill(null), ...(ai.forecast || [])],
          borderColor: '#f97316',
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    })

    const categoryCounts: Record<string, number> = {}
    for (const s of salesList) categoryCounts[s.category] = (categoryCounts[s.category] || 0) + 1
    const catLabels = Object.keys(categoryCounts)
    const values = Object.values(categoryCounts)
    const colors = ['#a855f7', '#22c55e', '#f97316', '#0ea5e9', '#eab308', '#ef4444']

    setCategoryChartData({
      labels: catLabels,
      datasets: [
        {
          label: 'Transactions',
          data: values,
          backgroundColor: catLabels.map((_, i) => colors[i % colors.length]),
          borderRadius: 8,
        },
      ],
    })
  }

  const totalItems = items.length
  const inStock = items.filter((i) => i.status === 'In Stock').length
  const totalSold = sales.length
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0)

  const todayStr = new Date().toISOString().split('T')[0]
  const todaySales = useMemo(() => sales.filter((s) => s.date === todayStr).reduce((sum, s) => sum + s.amount, 0), [sales, todayStr])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <p className="text-slate-600 dark:text-slate-200">Loading dashboard...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1800px] space-y-8">
        <div className="flex flex-col gap-3 rounded-2xl bg-white/85 p-6 shadow-xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Dashboard</p>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Performance Overview</h1>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-4">
          <StatCard title="Total Sales" value={formatCurrency(totalSalesAmount)} icon={Wallet} accent="bg-purple-600" />
          <StatCard title="Items Sold" value={totalSold.toString()} icon={ShoppingBag} accent="bg-orange-500" />
          <StatCard title="In Stock" value={inStock.toString()} icon={Layers} accent="bg-emerald-500" />
          <StatCard title="Today" value={formatCurrency(todaySales)} icon={TrendingUp} accent="bg-sky-500" />
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
          <CardShell title="AI Sales Forecast">
            <div className="h-[430px]">
              {overallChartData ? (
                <Line
                  data={overallChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: 'index', intersect: false },
                    plugins: {
                      legend: { display: true, position: 'top' },
                      tooltip: { enabled: true },
                    },
                    scales: {
                      x: { grid: { display: false } },
                      y: { beginAtZero: true, ticks: { callback: (val) => `\u20b1${val}` } },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No sales data available.</div>
              )}
            </div>
          </CardShell>

          <CardShell title="Category Mix">
            <div className="h-[430px]">
              {categoryChartData ? (
                <Pie
                  data={categoryChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No category data.</div>
              )}
            </div>
          </CardShell>
        </div>

        {/* AI Insights full width */}
        <CardShell title="AI Insights">
          <p className="text-sm text-slate-700 dark:text-slate-200">
            {aiAnalysis || 'AI is analyzing your trends...'}
          </p>
        </CardShell>
      </div>
    </main>
  )
}
