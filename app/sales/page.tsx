'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Sale {
  id: string
  amount: number
  category: string
  timestamp: number
}

function SalesContent() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchSales()
      }
    })
    return () => unsubscribe()
  }, [])

  const fetchSales = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'sales'))
      const salesList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Sale[]

      // newest first
      salesList.sort((a, b) => b.timestamp - a.timestamp)

      setSales(salesList)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteSale = async (saleId: string) => {
    if (!confirm('Are you sure you want to delete this sale record?')) return

    try {
      await deleteDoc(doc(db, 'sales', saleId))
      await fetchSales()
    } catch (error) {
      console.error('Error deleting sale:', error)
    }
  }

  const totalSales = sales.reduce((sum, s) => sum + s.amount, 0)

  return (
    <main className="px-6 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">Sales</h1>

      <p className="text-lg font-semibold text-green-600 dark:text-green-400 mb-6">
        Total Sales: ₱{totalSales.toFixed(2)}
      </p>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        {loading ? (
          <div className="p-6 text-center">Loading...</div>
        ) : sales.length === 0 ? (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            No sales recorded.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-100 dark:bg-slate-700 border-b dark:border-slate-600">
                <tr>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Item / Category
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Amount (₱)
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900 dark:text-white">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {sales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition"
                  >
                    <td className="px-6 py-4 text-sm text-gray-800 dark:text-gray-200">
                      {sale.category}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white font-semibold">
                      ₱{sale.amount.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(sale.timestamp).toLocaleDateString()}
                    </td>

                    <td className="px-6 py-4 text-sm">
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 font-semibold"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}

export default function SalesPage() {
  return (
    <ProtectedRoute>
      <SalesContent />
    </ProtectedRoute>
  )
}
