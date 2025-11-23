'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import KPICard from '@/components/KPICard'
import { Line, Bar } from 'react-chartjs-2'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend
)

/* ------------------------------------------------------------------ */
/* ---------------------------- TYPES -------------------------------- */
/* ------------------------------------------------------------------ */
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

/* ------------------------------------------------------------------ */
/* -------------------------- MAIN PAGE ------------------------------ */
/* ------------------------------------------------------------------ */
export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}

/* ------------------------------------------------------------------ */
/* ----------------------- DASHBOARD LOGIC --------------------------- */
/* ------------------------------------------------------------------ */
function DashboardContent() {
  const [items, setItems] = useState<Item[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  const [overallChartData, setOverallChartData] = useState<any>(null)
  const [categoryChartData, setCategoryChartData] = useState<any>(null)

  const [aiForecast, setAiForecast] = useState<number[]>([])
  const [aiAnalysis, setAiAnalysis] = useState<string>('')

  useEffect(() => {
    const loadData = async () => {
      const itemsSnap = await getDocs(collection(db, "items"))
      const salesSnap = await getDocs(collection(db, "sales"))

      /* ------------ FIX: PARSE SALES SAFELY ------------ */
      const salesList: Sale[] = salesSnap.docs.map((doc) => {
        const d = doc.data()

        return {
          id: doc.id,
          amount: Number(d.amount ?? 0),
          timestamp: d.timestamp ?? Date.now(),
          date: d.date ?? new Date(d.timestamp ?? Date.now()).toISOString().split("T")[0],
          category: d.category ?? "Uncategorized"
        }
      })

      /* ------------ FIX: PARSE ITEMS SAFELY ------------ */
      const itemsList: Item[] = itemsSnap.docs.map((doc) => {
        const d = doc.data()
        return {
          id: doc.id,
          status: d.status ?? "In Stock"
        }
      })

      setItems(itemsList)
      setSales(salesList.sort((a, b) => a.timestamp - b.timestamp))

      await generateAICharts(salesList)
      await generateCategoryChart(salesList)

      setLoading(false)
    }

    loadData()
  }, [])

  /* ------------------ AI FORECAST CALL ------------------ */
  async function callGeminiAI(salesData: number[]) {
    try {
      const res = await fetch("/api/forecast", {
        method: "POST",
        body: JSON.stringify({ sales: salesData }),
        headers: { "Content-Type": "application/json" }
      })
      return await res.json()
    } catch {
      return { forecast: [], analysis: "AI forecast unavailable." }
    }
  }

  /* ------------------ OVERALL SALES CHART ------------------ */
  async function generateAICharts(salesList: Sale[]) {
    const dailyTotals: Record<string, number> = {}

    for (const s of salesList) {
      dailyTotals[s.date] = (dailyTotals[s.date] || 0) + s.amount
    }

    const sortedDates = Object.keys(dailyTotals).sort()
    const salesAmounts = sortedDates.map((d) => dailyTotals[d])

    const ai = await callGeminiAI(salesAmounts)

    setAiForecast(ai.forecast ?? [])
    setAiAnalysis(ai.analysis ?? "")

    const labels = sortedDates.map(date =>
      new Date(date).toLocaleDateString("en-US", {
        month: "numeric",
        day: "numeric"
      })
    )

    const today = new Date()
    const futureLabels =
      ai.forecast?.map((_: number, i: number) => {
        const d = new Date(today)
        d.setDate(d.getDate() + i + 1)
        return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })
      }) ?? []

    setOverallChartData({
      labels: [...labels, ...futureLabels],
      datasets: [
        {
          label: "Actual Sales (₱)",
          data: [...salesAmounts, ...Array(ai.forecast?.length ?? 0).fill(null)],
          borderColor: "#16a34a",
          backgroundColor: "rgba(22,163,74,0.15)",
          borderWidth: 2,
          tension: 0.3,
        },
        {
          label: "AI Forecast (₱)",
          data: [...Array(salesAmounts.length).fill(null), ...(ai.forecast ?? [])],
          borderColor: "#3b82f6",
          borderDash: [6, 6],
          borderWidth: 2,
          tension: 0.3,
        }
      ]
    })
  }

  /* -------------------- CATEGORY BAR CHART -------------------- */
  async function generateCategoryChart(salesList: Sale[]) {
    const categoryTotals: Record<string, number> = {}

    for (const s of salesList) {
      categoryTotals[s.category] = (categoryTotals[s.category] ?? 0) + 1
    }

    const labels = Object.keys(categoryTotals)
    const values = Object.values(categoryTotals)

    const colors = ["#f59e0b", "#ec4899", "#8b5cf6", "#10b981", "#ef4444"]

    setCategoryChartData({
      labels,
      datasets: [
        {
          label: "Total Sold",
          data: values,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderRadius: 8,
        }
      ]
    })
  }

  /* ----------------------- UI ----------------------- */
  const totalItems = items.length
  const inStock = items.filter(i => i.status === "In Stock").length
  const totalSold = sales.length
  const totalSalesAmount = sales.reduce((sum, s) => sum + s.amount, 0)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p>Loading dashboard...</p>
      </div>
    )
  }

  return (
  <main className="px-4 sm:px-6 lg:px-8 py-8">

    <h1 className="text-3xl font-bold mb-8">Dashboard</h1>

    {/* KPI Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <KPICard title="Total Items" value={totalItems} icon="📦" color="green" />
      <KPICard title="In Stock" value={inStock} icon="📍" color="blue" />
      <KPICard title="Items Sold" value={totalSold} icon="✔️" color="purple" />
      <KPICard title="Total Sales" value={`₱${totalSalesAmount.toFixed(2)}`} icon="💰" color="yellow" />
    </div>

    {/* MAIN GRID: Charts Left, AI Insight Right */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

      {/* LEFT SIDE – Forecast + Category Charts */}
      <div className="lg:col-span-2 space-y-6">

        {/* AI Forecast Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">AI Sales Forecast</h2>
          {overallChartData ? <Line data={overallChartData} /> : <p>No data available</p>}
        </div>

        {/* Category Chart */}
        <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Category Performance</h2>
          {categoryChartData ? <Bar data={categoryChartData} /> : <p>No category data available</p>}
        </div>

      </div>

      {/* RIGHT SIDE – AI Insight Panel */}
      <div>
        <div className="bg-blue-50 dark:bg-blue-900 p-5 rounded-lg shadow sticky top-4">
          <h3 className="font-semibold text-blue-700 dark:text-blue-200 mb-2 text-lg">
            🤖 AI Insights
          </h3>
          <p className="text-sm leading-relaxed text-blue-800 dark:text-blue-100">
            {aiAnalysis || "AI is analyzing your sales trends..."}
          </p>
        </div>
      </div>

    </div>

  </main>
)}