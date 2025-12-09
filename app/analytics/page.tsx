"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, orderBy, query } from "firebase/firestore"
import { Line, Pie } from "react-chartjs-2"
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js"
import { db } from "@/lib/firebase"
import ProtectedRoute from "@/components/ProtectedRoute"
import { TrendingUp, PieChart } from "lucide-react"

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, ArcElement, Tooltip, Legend)

interface SaleData {
  timestamp: number
  amount: number
  category: string
  date: string
}

const currency = (v: number) => `?${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`

export default function AnalyticsPage() {
  return (
    <ProtectedRoute>
      <AnalyticsContent />
    </ProtectedRoute>
  )
}

function AnalyticsContent() {
  const [salesTrendData, setSalesTrendData] = useState<any>(null)
  const [categoryData, setCategoryData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const salesQuery = query(collection(db, "sales"), orderBy("timestamp", "asc"))
    const unsub = onSnapshot(
      salesQuery,
      (snapshot) => {
        const list: SaleData[] = snapshot.docs.map((doc) => {
          const d = doc.data() as any
          const ts = d.timestamp ?? Date.now()
          return {
            timestamp: ts,
            amount: Number(d.amount ?? 0),
            category: d.category ?? "Uncategorized",
            date: d.date ?? new Date(ts).toISOString().split("T")[0],
          }
        })

        buildTrend(list)
        buildCategory(list)
        setLoading(false)
      },
      (err) => {
        console.error("Error loading analytics:", err)
        setLoading(false)
      }
    )
    return () => unsub()
  }, [])

  const buildTrend = (data: SaleData[]) => {
    const daily: Record<string, number> = {}
    data.forEach((d) => {
      daily[d.date] = (daily[d.date] || 0) + d.amount
    })
    const dates = Object.keys(daily).sort()
    const values = dates.map((d) => daily[d])

    setSalesTrendData({
      labels: dates.map((d) =>
        new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
      ),
      datasets: [
        {
          label: "Actual Sales",
          data: values,
          borderColor: "#7c3aed",
          backgroundColor: "rgba(124,58,237,0.12)",
          borderWidth: 2,
          tension: 0.35,
          pointRadius: 0,
        },
      ],
    })
  }

  const buildCategory = (data: SaleData[]) => {
    const totals: Record<string, number> = {}
    data.forEach((d) => {
      totals[d.category] = (totals[d.category] || 0) + d.amount
    })
    const labels = Object.keys(totals)
    const values = Object.values(totals)
    const colors = ["#a855f7", "#22c55e", "#f97316", "#0ea5e9", "#eab308", "#ef4444", "#6366f1"]

    setCategoryData({
      labels,
      datasets: [
        {
          label: "Sales",
          data: values,
          backgroundColor: labels.map((_, i) => colors[i % colors.length]),
          borderRadius: 8,
        },
      ],
    })
  }

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 via-white to-indigo-50">
        <p className="text-slate-600">Loading analytics...</p>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1800px] space-y-8">
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2 text-gray-800">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              <h2 className="text-lg font-semibold">AI Sales Forecast</h2>
            </div>
            <div className="h-[420px]">
              {salesTrendData ? (
                <Line
                  data={salesTrendData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: { mode: "index", intersect: false },
                    plugins: {
                      legend: { display: true, position: "top" },
                      tooltip: {
                        enabled: true,
                        callbacks: {
                          label: (ctx) => `${ctx.dataset.label}: ${currency(Number(ctx.parsed.y || 0))}`,
                        },
                      },
                    },
                    scales: {
                      x: { grid: { display: false }, ticks: { color: "#6b7280" } },
                      y: {
                        beginAtZero: true,
                        ticks: {
                          color: "#6b7280",
                          callback: (val) => currency(Number(val)),
                        },
                        grid: { color: "rgba(0,0,0,0.05)" },
                      },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No sales data available</div>
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-6 shadow-xl ring-1 ring-slate-200">
            <div className="mb-4 flex items-center gap-2 text-gray-800">
              <PieChart className="h-5 w-5 text-orange-500" />
              <h2 className="text-lg font-semibold">Category Mix</h2>
            </div>
            <div className="h-[420px]">
              {categoryData ? (
                <Pie
                  data={categoryData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: "bottom", labels: { padding: 16, color: "#6b7280" } },
                      tooltip: { enabled: true },
                    },
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-500">No category data available</div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
