'use client'

import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, updateDoc, doc, query, where, deleteDoc, addDoc } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Bookmark, CheckSquare, XCircle, Clock, Package } from 'lucide-react'

interface ReservedItem {
  id: string
  name: string
  price: number
  category: string
  condition: string
  reservedBy: string
  reservationTimestamp: number
  reservationDocId?: string
}

function ReservationsContent() {
  const [reservedItems, setReservedItems] = useState<ReservedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const fetchReservedItems = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const itemsQuery = query(collection(db, 'items'), where('status', '==', 'Reserved'))
      const itemsSnapshot = await getDocs(itemsQuery)
      const reservedItemsList = itemsSnapshot.docs.map((d) => ({ id: d.id, ...(d.data() as ReservedItem) }))

      if (reservedItemsList.length === 0) {
        setReservedItems([])
        return
      }

      const itemIds = reservedItemsList.map((item) => item.id)
      const reservationsQuery =
        itemIds.length && itemIds.length <= 10
          ? query(collection(db, 'reservations'), where('itemId', 'in', itemIds))
          : collection(db, 'reservations')
      const reservationsSnapshot = await getDocs(reservationsQuery)
      const reservationsMap = new Map<string, { reservedBy: string; reservationTimestamp: number; reservationDocId: string }>()
      reservationsSnapshot.docs.forEach((d) => {
        const data = d.data() as { itemId: string; reservedBy?: string; timestamp?: number }
        if (data.itemId) {
          reservationsMap.set(data.itemId, {
            reservedBy: data.reservedBy || 'N/A',
            reservationTimestamp: data.timestamp || Date.now(),
            reservationDocId: d.id,
          })
        }
      })

      const finalReservedItems = reservedItemsList.map((item) => {
        const reservationDetails = reservationsMap.get(item.id)
        return {
          ...item,
          reservedBy: reservationDetails?.reservedBy || 'Contact missing',
          reservationTimestamp: reservationDetails?.reservationTimestamp || Date.now(),
          reservationDocId: reservationDetails?.reservationDocId,
        }
      })

      setReservedItems(finalReservedItems)
      try {
        localStorage.setItem('reservations_cache', JSON.stringify(finalReservedItems))
      } catch {
        /* ignore cache write errors */
      }
    } catch (err) {
      console.error('Error fetching reservations:', err)
      setError('Failed to load reservation data.')
    } finally {
      setLoading(false)
    }
  }, [])

  const handleMarkSold = async (item: ReservedItem) => {
    if (!confirm(`Confirm sale of ${item.name} (\u20b1${item.price.toFixed(2)})?`)) return

    try {
      await updateDoc(doc(db, 'items', item.id), { status: 'Sold' })

      await addDoc(collection(db, 'sales'), {
        amount: item.price,
        category: item.category,
        timestamp: Date.now(),
      })

      if (item.reservationDocId) {
        await deleteDoc(doc(db, 'reservations', item.reservationDocId))
      }

      alert(`Sale of ${item.name} successfully recorded.`)
      fetchReservedItems()
    } catch (err) {
      console.error('Error finalizing sale:', err)
      alert('Failed to mark item as sold.')
    }
  }

  const handleCancelReservation = async (item: ReservedItem) => {
    if (!confirm(`Cancel the reservation for ${item.name}? This returns it to In Stock.`)) return

    try {
      await updateDoc(doc(db, 'items', item.id), { status: 'In Stock' })

      if (item.reservationDocId) {
        await deleteDoc(doc(db, 'reservations', item.reservationDocId))
      }

      alert(`Reservation for ${item.name} cancelled.`)
      fetchReservedItems()
    } catch (err) {
      console.error('Error canceling reservation:', err)
      alert('Failed to cancel reservation.')
    }
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem('reservations_cache')
      if (cached) {
        setReservedItems(JSON.parse(cached))
        setLoading(false)
      }
    } catch {
      /* ignore cache read errors */
    }
  }, [])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      await fetchReservedItems()
    })
    return () => unsub()
  }, [fetchReservedItems])

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-14 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-12 w-48 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-[320px] w-full animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
        </div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-10">
        <div className="mx-auto max-w-xl rounded-xl bg-red-50 p-6 text-center text-red-700 ring-1 ring-red-200 dark:bg-red-900/30 dark:text-red-100 dark:ring-red-800/60">
          {error}
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[calc(100vh-64px)] bg-gradient-to-br from-slate-50 via-white to-indigo-50 px-4 py-8 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-[1800px] space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl bg-white/85 p-6 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/70 dark:ring-slate-800 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
              <Bookmark className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Reservations</p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Item Reservations</h1>
            </div>
          </div>
          <div className="rounded-xl bg-white/80 px-4 py-2 text-sm text-slate-600 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-800">
            Active Reservations: <span className="font-semibold text-purple-600 dark:text-purple-300">{reservedItems.length}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white/95 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800">
          {reservedItems.length === 0 ? (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-purple-50 text-purple-600 dark:bg-purple-900/40 dark:text-purple-200">
                <Package size={20} />
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-white">No Active Reservations</div>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Items marked as Reserved will appear here for quick fulfillment.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Item Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Category</th>
                    <th className="px-6 py-3 text-left font-semibold">Condition</th>
                    <th className="px-6 py-3 text-left font-semibold">Price</th>
                    <th className="px-6 py-3 text-left font-semibold">Reserved By</th>
                    <th className="px-6 py-3 text-left font-semibold">Date Reserved</th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                  {reservedItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.category}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{item.condition}</td>
                      <td className="px-6 py-4 font-semibold text-indigo-600 dark:text-indigo-300">{'\u20b1'}{item.price.toFixed(2)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-purple-600 dark:text-purple-300">{item.reservedBy}</td>
                      <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Clock size={14} />
                        {formatDate(item.reservationTimestamp)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={() => handleMarkSold(item)}
                            className="h-9 rounded-full bg-green-600 px-3 text-xs font-semibold text-white hover:bg-green-700"
                          >
                            <CheckSquare size={14} className="mr-1" /> Finalize Sale
                          </Button>
                          <Button
                            onClick={() => handleCancelReservation(item)}
                            className="h-9 rounded-full bg-red-500 px-3 text-xs font-semibold text-white hover:bg-red-600"
                          >
                            <XCircle size={14} className="mr-1" /> Cancel
                          </Button>
                        </div>
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

export default function ReservationsPage() {
  return (
    <ProtectedRoute>
      <ReservationsContent />
    </ProtectedRoute>
  )
}
