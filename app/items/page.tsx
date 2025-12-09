'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  where,
  setDoc,
} from 'firebase/firestore'
import { onAuthStateChanged } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import ProtectedRoute from '@/components/ProtectedRoute'
import ItemForm from '@/components/ItemForm'
import AddCategoryModal from '@/components/AddCategoryModal'
import AddConditionModal from '@/components/AddConditionModal'
import AddStatusModal from '@/components/AddStatusModal'
import { Button } from '@/components/ui/button'
import {
  Package,
  Search,
  Edit,
  Trash2,
  CheckSquare,
  AlertTriangle,
  Zap,
  Tag,
  Layers,
  Bookmark,
  XCircle,
} from 'lucide-react'

interface Item {
  id?: string
  name: string
  category: string
  condition: string
  price: number
  status: 'In Stock' | 'Sold' | 'Missing' | 'Reserved'
  timestamp: number
}

const StatusBadge = ({ status }: { status: Item['status'] }) => {
  let classes = 'px-3 py-1 rounded-full text-xs font-semibold'
  switch (status) {
    case 'In Stock':
      classes += ' bg-green-100 text-green-800'
      break
    case 'Sold':
      classes += ' bg-blue-100 text-blue-800'
      break
    case 'Missing':
      classes += ' bg-red-100 text-red-800'
      break
    case 'Reserved':
      classes += ' bg-purple-100 text-purple-800'
      break
    default:
      classes += ' bg-gray-100 text-gray-800'
      break
  }
  return <span className={classes}>{status}</span>
}

function ItemsContent() {
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isItemModalOpen, setIsItemModalOpen] = useState(false)
  const [isReserveModalOpen, setIsReserveModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>()
  const [reserveTarget, setReserveTarget] = useState<Item | null>(null)
  const [reserveForm, setReserveForm] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    deliveryDate: '',
    notes: '',
  })
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const [categoriesList, setCategoriesList] = useState<string[]>([])
  const [conditionsList, setConditionsList] = useState<string[]>([])
  const [statusesList, setStatusesList] = useState<string[]>([])

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  const applyFilters = useCallback(
    (itemList: Item[], search: string, category: string) => {
      const term = search.trim().toLowerCase()
      const filtered = itemList.filter((item) => {
        const matchesSearch = term ? item.name.toLowerCase().includes(term) : true
        const matchesCategory = category === 'All' ? true : item.category === category
        return matchesSearch && matchesCategory
      })
      setFilteredItems(filtered)
    },
    []
  )

  const fetchItems = useCallback(async () => {
    const itemsSnap = await getDocs(query(collection(db, 'items'), orderBy('timestamp', 'desc')))
    const itemList: Item[] = itemsSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Item) }))
    setItems(itemList)
    applyFilters(itemList, searchTerm, selectedCategory)
    try {
      localStorage.setItem('items_cache', JSON.stringify(itemList))
    } catch {
      /* ignore cache write errors */
    }
  }, [applyFilters, searchTerm, selectedCategory])

  const fetchCategories = useCallback(async () => {
    const snap = await getDocs(collection(db, 'categories'))
    const list = snap.docs
      .map((d) => (d.data() as { name: string }).name)
      .filter(Boolean)
      .sort()
    setCategoriesList(list)
  }, [])

  const fetchConditions = useCallback(async () => {
    const snap = await getDocs(collection(db, 'conditions'))
    const list = snap.docs
      .map((d) => (d.data() as { name: string }).name)
      .filter(Boolean)
      .sort()
    setConditionsList(list)
  }, [])

  const fetchStatuses = useCallback(async () => {
    const snap = await getDocs(collection(db, 'statuses'))
    const list = snap.docs
      .map((d) => (d.data() as { name: string }).name)
      .filter(Boolean)
      .sort()
    setStatusesList(list)
  }, [])

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    applyFilters(items, term, selectedCategory)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    applyFilters(items, searchTerm, category)
  }

  const handleReserveInput = (field: keyof typeof reserveForm, value: string) => {
    setReserveForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddItem = () => {
    setEditingItem(undefined)
    setIsItemModalOpen(true)
  }

  const handleSubmitReservation = async () => {
    if (!reserveTarget) return
    if (!reserveForm.name.trim() || !reserveForm.phone.trim()) {
      alert('Name and phone are required to reserve an item.')
      return
    }

    try {
      const contactId =
        reserveForm.phone.trim().replace(/\D/g, '') ||
        reserveForm.email.trim().toLowerCase() ||
        `contact_${Date.now()}`

      await setDoc(
        doc(db, 'contacts', contactId),
        {
          name: reserveForm.name.trim(),
          phone: reserveForm.phone.trim(),
          email: reserveForm.email.trim(),
          address: reserveForm.address.trim(),
          lastReserved: Date.now(),
        },
        { merge: true }
      )

      await addDoc(collection(db, 'reservations'), {
        itemId: reserveTarget.id,
        itemName: reserveTarget.name,
        reservedBy: reserveForm.name.trim(),
        email: reserveForm.email.trim(),
        phone: reserveForm.phone.trim(),
        address: reserveForm.address.trim(),
        deliveryDate: reserveForm.deliveryDate ? new Date(reserveForm.deliveryDate).getTime() : null,
        notes: reserveForm.notes.trim(),
        timestamp: Date.now(),
      })

      await updateDoc(doc(db, 'items', reserveTarget.id as string), { status: 'Reserved' })
      await fetchItems()
      setIsReserveModalOpen(false)
      setReserveTarget(null)
    } catch (err) {
      console.error('Error reserving item:', err)
      alert('Failed to reserve item.')
    }
  }

  const handleOpenReserve = (item: Item) => {
    setReserveTarget(item)
    setReserveForm({
      name: '',
      email: '',
      phone: '',
      address: '',
      deliveryDate: '',
      notes: '',
    })
    setIsReserveModalOpen(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setIsItemModalOpen(true)
  }

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'items', itemId))
      await fetchItems()
    } catch (err) {
      console.error('Error deleting item:', err)
    }
  }

  const handleSaveItem = async (itemData: Item) => {
    try {
      const itemPayload = {
        name: itemData.name,
        category: itemData.category,
        condition: itemData.condition,
        price: itemData.price,
        status: itemData.status,
      }

      if (itemData.id) {
        await updateDoc(doc(db, 'items', itemData.id), itemPayload)
      } else {
        const newItem = await addDoc(collection(db, 'items'), {
          ...itemPayload,
          status: 'In Stock',
          timestamp: Date.now(),
        })
        itemData.id = newItem.id
      }

      if (itemData.status === 'Sold' && editingItem?.status !== 'Sold') {
        await addDoc(collection(db, 'sales'), {
          amount: itemData.price,
          category: itemData.category,
          timestamp: Date.now(),
        })
      }

      const previousStatus = editingItem?.status
      if (previousStatus === 'Reserved' && itemData.status !== 'Reserved') {
        const reservationsSnap = await getDocs(
          query(collection(db, 'reservations'), where('itemId', '==', itemData.id))
        )
        await Promise.all(reservationsSnap.docs.map((r) => deleteDoc(doc(db, 'reservations', r.id))))
      }

      await fetchItems()
      setIsItemModalOpen(false)
      setEditingItem(undefined)
    } catch (err) {
      console.error('Error saving item:', err)
    }
  }

  useEffect(() => {
    try {
      const cached = localStorage.getItem('items_cache')
      if (cached) {
        const parsed: Item[] = JSON.parse(cached)
        setItems(parsed)
        applyFilters(parsed, searchTerm, selectedCategory)
        setLoading(false)
      }
    } catch {
      /* ignore cache read errors */
    }
  }, [applyFilters, searchTerm, selectedCategory])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      setLoading(true)
      try {
        await Promise.all([fetchCategories(), fetchConditions(), fetchStatuses(), fetchItems()])
      } finally {
        setLoading(false)
      }
    })
    return () => unsub()
  }, [fetchCategories, fetchConditions, fetchStatuses, fetchItems])

  const categories = ['All', ...categoriesList]
  const hasItems = filteredItems.length > 0

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 dark:bg-slate-900 px-6 py-10">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="h-14 w-64 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-12 w-full animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
          <div className="h-12 w-60 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-800" />
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
              <Package className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Inventory</p>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Items Inventory</h1>
            </div>
          </div>
          <Button
            onClick={handleAddItem}
            className="rounded-xl bg-green-600 px-4 py-2 text-white shadow-lg shadow-green-200 transition hover:-translate-y-0.5 hover:bg-green-700 hover:shadow-xl dark:shadow-none"
          >
            + Add Item
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr,240px]">
          <div className="flex items-center gap-3 rounded-2xl bg-white/90 px-4 py-3 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900 dark:ring-slate-800">
            <Search className="h-5 w-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search items by name..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full border-none bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/90 px-5 py-4 shadow-sm ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900 dark:ring-slate-800">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Category</span>
            <select
              value={selectedCategory}
              onChange={(e) => handleCategoryChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 ring-1 ring-transparent transition focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
            >
              {categories.map((cat) => (
                <option key={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
          <Button
            onClick={() => setIsCategoryModalOpen(true)}
            className="justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 py-3 text-white text-sm shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl dark:shadow-none"
          >
            <Layers size={16} /> Manage Categories
          </Button>
          <Button
            onClick={() => setIsConditionModalOpen(true)}
            className="justify-center gap-2 rounded-xl bg-gradient-to-r from-fuchsia-500 to-purple-600 py-3 text-white text-sm shadow-lg shadow-purple-200 transition hover:-translate-y-0.5 hover:shadow-xl dark:shadow-none"
          >
            <Zap size={16} /> Manage Conditions
          </Button>
          <Button
            onClick={() => setIsStatusModalOpen(true)}
            className="justify-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 py-3 text-white text-sm shadow-lg shadow-orange-200 transition hover:-translate-y-0.5 hover:shadow-xl dark:shadow-none"
          >
            <Tag size={16} /> Manage Statuses
          </Button>
        </div>

        <div className="rounded-2xl bg-white/95 shadow-2xl ring-1 ring-slate-200 backdrop-blur dark:bg-slate-900/80 dark:ring-slate-800">
          {hasItems ? (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1400px]">
                <thead className="bg-slate-50 text-sm uppercase tracking-wide text-slate-500 dark:bg-slate-800/70 dark:text-slate-300">
                  <tr>
                    <th className="px-6 py-3 text-left font-semibold">Name</th>
                    <th className="px-6 py-3 text-left font-semibold">Category</th>
                    <th className="px-6 py-3 text-left font-semibold">Condition</th>
                    <th className="px-6 py-3 text-left font-semibold">Price</th>
                    <th className="px-6 py-3 text-left font-semibold">Status</th>
                    <th className="px-6 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-base text-slate-700 dark:divide-slate-800 dark:text-slate-200">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                      <td className="px-6 py-3 font-medium text-slate-900 dark:text-white">{item.name}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{item.category}</td>
                      <td className="px-6 py-3 text-slate-600 dark:text-slate-300">{item.condition}</td>
                      <td className="px-6 py-3 font-semibold text-indigo-600 dark:text-indigo-300">{'\u20b1'}{item.price.toFixed(2)}</td>
                      <td className="px-6 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <Button
                            onClick={() => handleEditItem(item)}
                            className="h-9 w-9 rounded-full bg-blue-500 p-0 text-white hover:bg-blue-600"
                            title="Edit Item"
                          >
                            <Edit size={16} />
                          </Button>

                          {item.status === 'In Stock' && (
                            <Button
                              onClick={() => handleSaveItem({ ...item, status: 'Sold' })}
                              className="h-9 w-9 rounded-full bg-green-500 p-0 text-white hover:bg-green-600"
                              title="Mark as Sold"
                            >
                              <CheckSquare size={16} />
                            </Button>
                          )}

                          {item.status === 'In Stock' && (
                            <Button
                              onClick={() => handleOpenReserve(item)}
                              className="h-9 w-9 rounded-full bg-purple-500 p-0 text-white hover:bg-purple-600"
                              title="Reserve Item"
                            >
                              <Bookmark size={16} />
                            </Button>
                          )}

                          {item.status === 'Reserved' && (
                            <Button
                              onClick={() => handleSaveItem({ ...item, status: 'In Stock' })}
                              className="h-9 w-9 rounded-full bg-slate-500 p-0 text-white hover:bg-slate-600"
                              title="Unreserve"
                            >
                              <XCircle size={16} />
                            </Button>
                          )}

                          {item.status !== 'Missing' && item.status !== 'Sold' && item.status !== 'Reserved' && (
                            <Button
                              onClick={() => handleSaveItem({ ...item, status: 'Missing' })}
                              className="h-9 w-9 rounded-full bg-orange-500 p-0 text-white hover:bg-orange-600"
                              title="Mark as Missing"
                            >
                              <AlertTriangle size={16} />
                            </Button>
                          )}

                          <Button
                            onClick={() => handleDeleteItem(item.id!)}
                            className="h-9 w-9 rounded-full bg-red-500 p-0 text-white hover:bg-red-600"
                            title="Delete Item"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-200">
                <Package size={20} />
              </div>
              <div className="text-lg font-semibold text-slate-800 dark:text-white">No items found</div>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Add your first item or adjust the filters above to see your inventory.
              </p>
              <div className="flex gap-3">
                <Button
                  onClick={handleAddItem}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-white shadow-md hover:bg-indigo-700"
                >
                  + Add Item
                </Button>
                <Button
                  onClick={() => setSelectedCategory('All')}
                  className="rounded-lg bg-slate-100 px-4 py-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  Reset Filters
                </Button>
              </div>
            </div>
          )}
        </div>

        <ItemForm
          isOpen={isItemModalOpen}
          onClose={() => {
            setIsItemModalOpen(false)
            setEditingItem(undefined)
          }}
          onSubmit={handleSaveItem}
          editItem={editingItem}
          canEditPrice
          categoriesList={categoriesList}
          conditionsList={conditionsList}
          statusesList={statusesList}
        />

        {isReserveModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <div className="mb-4 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm uppercase tracking-wide text-slate-500 dark:text-slate-400">Reserve Item</p>
                  <h3 className="text-xl font-semibold text-slate-900 dark:text-white">
                    {reserveTarget?.name || 'Item'}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400">{reserveTarget?.category}</p>
                </div>
                <Button variant="ghost" className="px-2" onClick={() => setIsReserveModalOpen(false)}>
                  ✕
                </Button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Customer Name *</label>
                  <input
                    value={reserveForm.name}
                    onChange={(e) => handleReserveInput('name', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Phone *</label>
                  <input
                    value={reserveForm.phone}
                    onChange={(e) => handleReserveInput('phone', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Email</label>
                  <input
                    type="email"
                    value={reserveForm.email}
                    onChange={(e) => handleReserveInput('email', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Delivery Date</label>
                  <input
                    type="date"
                    value={reserveForm.deliveryDate}
                    onChange={(e) => handleReserveInput('deliveryDate', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Address</label>
                  <input
                    value={reserveForm.address}
                    onChange={(e) => handleReserveInput('address', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Notes</label>
                  <textarea
                    value={reserveForm.notes}
                    onChange={(e) => handleReserveInput('notes', e.target.value)}
                    className="min-h-[90px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none ring-1 ring-transparent focus:border-indigo-500 focus:ring-indigo-200 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-900/40"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <Button
                  variant="ghost"
                  className="bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  onClick={() => setIsReserveModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-purple-600 text-white hover:bg-purple-700"
                  onClick={handleSubmitReservation}
                >
                  Confirm Reservation
                </Button>
              </div>
            </div>
          </div>
        )}

        <AddCategoryModal
          isOpen={isCategoryModalOpen}
          onClose={() => setIsCategoryModalOpen(false)}
          onSuccess={fetchCategories}
        />
        <AddConditionModal
          isOpen={isConditionModalOpen}
          onClose={() => setIsConditionModalOpen(false)}
          onSuccess={fetchConditions}
        />
        <AddStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
          onSuccess={fetchStatuses}
        />
      </div>
    </main>
  )
}

export default function ItemsPage() {
  return (
    <ProtectedRoute>
      <ItemsContent />
    </ProtectedRoute>
  )
}
