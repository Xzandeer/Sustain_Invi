'use client'

import { useEffect } from 'react'
import { addDoc, collection } from 'firebase/firestore'
import { db } from '@/lib/firebase'

export default function GenerateSalesPage() {
  useEffect(() => {
    const generateData = async () => {
      const categories = ["Clothes", "Shoes", "Accessories", "Electronics", "Home Items"]

      for (let i = 0; i < 50; i++) {
        const randomAmount = Math.floor(Math.random() * 300) + 50 // ₱50–₱350
        const randomCategory = categories[Math.floor(Math.random() * categories.length)]

        // Create random dates from last 30 days
        const now = new Date()
        now.setDate(now.getDate() - Math.floor(Math.random() * 30))

        const dateString = now.toISOString().split("T")[0]

        await addDoc(collection(db, "sales"), {
          amount: randomAmount,
          category: randomCategory,
          timestamp: now.getTime(),
          date: dateString
        })

        console.log(`Added sale ${i + 1}`)
      }

      alert("🔥 50 SALES RECORDS ADDED SUCCESSFULLY!")
    }

    generateData()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Generating Sample Sales Data...</h1>
      <p className="mt-2 text-gray-500">Check console for progress.</p>
    </div>
  )
}
