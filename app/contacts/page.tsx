'use client'

import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, orderBy } from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import { Button } from '@/components/ui/button'
import { Users, Phone, RefreshCw } from 'lucide-react'
import { addDoc } from 'firebase/firestore'

interface Contact {
  name: string
  phone?: string
}

function ContactsContent() {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' })

  const fetchContacts = useCallback(async () => {
    setLoading(true)
    try {
      const snap = await getDocs(query(collection(db, 'contacts'), orderBy('name')))
      const list = snap.docs.map((d) => d.data() as Contact)
      setContacts(list)
    } finally {
      setLoading(false)
    }
  }, [])

  const addContactManually = async () => {
    if (!form.name.trim() || !form.phone.trim()) {
      alert('Name and phone are required.')
      return
    }
    setIsAdding(true)
    try {
      await addDoc(collection(db, 'contacts'), {
        name: form.name.trim(),
        phone: form.phone.trim(),
      })
      setForm({ name: '', phone: '', email: '', address: '' })
      await fetchContacts()
    } catch (err) {
      console.error('Error adding contact:', err)
      alert('Failed to add contact.')
    } finally {
      setIsAdding(false)
    }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      await fetchContacts()
    })
    return () => unsub()
  }, [fetchContacts])

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
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Contacts</p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Customer Contacts</h1>
            </div>
          </div>
          <Button onClick={fetchContacts} className="gap-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700">
            <RefreshCw size={16} /> Refresh
          </Button>
        </div>

        <div className="rounded-2xl bg-white/90 p-5 shadow-lg ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800">
          <h2 className="mb-3 text-lg font-semibold text-slate-800 dark:text-white">Add Contact</h2>
          <div className="grid gap-3 md:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Name *"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="Phone *"
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
            />
          </div>
          <div className="mt-3 flex justify-end">
            <Button
              onClick={addContactManually}
              disabled={isAdding}
              className="bg-indigo-600 text-white hover:bg-indigo-700"
            >
              {isAdding ? 'Saving...' : 'Save Contact'}
            </Button>
          </div>
        </div>

        <div className="rounded-2xl bg-white/95 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800">
          {contacts.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">No contacts yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1000px]">
                <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Contact Number</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                  {contacts.map((c, idx) => (
                    <tr key={idx} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{c.name}</td>
                      <td className="px-6 py-4 text-slate-600 dark:text-slate-300">
                        {c.phone ? (
                          <span className="flex items-center gap-2">
                            <Phone size={14} /> {c.phone}
                          </span>
                        ) : (
                          '—'
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

export default function ContactsPage() {
  return (
    <ProtectedRoute>
      <ContactsContent />
    </ProtectedRoute>
  )
}
