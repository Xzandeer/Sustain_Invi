'use client'

import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, updateDoc, doc, query, orderBy } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Truck, Calendar, MapPin, Phone, CheckSquare, RefreshCw } from 'lucide-react'

interface DeliveryItem {
  reservationDocId: string
  itemId: string
  itemName: string
  reservedBy: string
  phone?: string
  address?: string
  deliveryDate?: number | null
  notes?: string
  deliveryStatus?: 'Pending' | 'Delivered'
  timestamp?: number
}

function DeliveryContent() {
  const [deliveries, setDeliveries] = useState<DeliveryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchDeliveries = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'reservations'), orderBy('timestamp', 'desc')))
      const list = snap.docs.map((d) => ({ reservationDocId: d.id, ...(d.data() as any) })) as DeliveryItem[]
      setDeliveries(list)
    } finally {
      setLoading(false)
    }
  }, [])

  const markDelivered = async (delivery: DeliveryItem) => {
    try {
      await updateDoc(doc(db, 'reservations', delivery.reservationDocId), {
        deliveryStatus: 'Delivered',
        deliveredAt: Date.now(),
      })
      fetchDeliveries()
    } catch (err) {
      console.error('Error marking delivered:', err)
      alert('Failed to update delivery status.')
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      await fetchDeliveries()
    })
    return () => unsub()
  }, [fetchDeliveries])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-14 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-[320px] w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1800px] space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl bg-white/85 p-6 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Delivery</p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Delivery Tracker</h1>
            </div>
          </div>
          <Button onClick={fetchDeliveries} className="gap-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700">
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>

        <div className="rounded-2xl bg-white/95 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800">
          {deliveries.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">No deliveries yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Item</th>
                    <th className="px-6 py-3 text-left font-semibold">Customer</th>
                    <th className="px-6 py-3 text-left font-semibold">Address</th>
                    <th className="px-6 py-3 text-left font-semibold">Delivery Date</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                  {deliveries.map((d) => (
                    <tr key={d.reservationDocId} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{d.itemName || 'Item'}</td>
                      <td className="px-6 py-4 space-y-1 text-slate-600 dark:text-slate-300">
                        <div className="font-semibold text-slate-800 dark:text-white">{d.reservedBy || 'Unknown'}</div>
                        {d.phone && (
                          <div className="flex items-center gap-2"><Phone size={14} /> {d.phone}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {d.address ? (
                          <span className="flex items-center gap-2"><MapPin size={14} /> {d.address}</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-2">
                          <Calendar size={14} />
                          {d.deliveryDate ? new Date(d.deliveryDate).toLocaleDateString() : 'Not set'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            d.deliveryStatus === 'Delivered'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-amber-100 text-amber-700'
                          }`}
                        >
                          {d.deliveryStatus || 'Pending'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {d.deliveryStatus === 'Delivered' ? (
                          <span className="text-xs text-green-600 dark:text-green-300">Delivered</span>
                        ) : (
                          <Button
                            onClick={() => markDelivered(d)}
                            className="h-9 rounded-full bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            <CheckSquare size={14} className="mr-1" /> Mark Delivered
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}

export default function DeliveryPage() {
  return (
    <ProtectedRoute>
      <DeliveryContent />
    </ProtectedRoute>
  )
}
