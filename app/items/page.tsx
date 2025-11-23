'use client'

import { useEffect, useState } from 'react'
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import ItemForm from '@/components/ItemForm'
import AddCategoryModal from '@/components/AddCategoryModal'
import AddConditionModal from '@/components/AddConditionModal'
import AddStatusModal from '@/components/AddStatusModal'
import { Button } from '@/components/ui/button'

interface Item {
  id?: string
  name: string
  category: string
  condition: string
  price: number
  status: 'In Stock' | 'Sold' | 'Missing'
  timestamp: number
}

function ItemsContent() {
  const [items, setItems] = useState<Item[]>([])
  const [filteredItems, setFilteredItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<Item | undefined>()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')

  const [categoriesList, setCategoriesList] = useState<string[]>([])
  const [conditionsList, setConditionsList] = useState<string[]>([])
  const [statusesList, setStatusesList] = useState<string[]>([])

  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false)
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async () => {
      await fetchCategories()
      await fetchConditions()
      await fetchStatuses()
      await fetchItems()
    })
    return () => unsub()
  }, [])

  const fetchCategories = async () => {
    const snapshot = await getDocs(collection(db, 'categories'))
    setCategoriesList(snapshot.docs.map(d => d.data().name))
  }

  const fetchConditions = async () => {
    const snapshot = await getDocs(collection(db, 'conditions'))
    setConditionsList(snapshot.docs.map(d => d.data().name))
  }

  const fetchStatuses = async () => {
    const snapshot = await getDocs(collection(db, 'statuses'))
    setStatusesList(snapshot.docs.map(d => d.data().name))
  }

  const fetchItems = async () => {
    const snapshot = await getDocs(collection(db, 'items'))
    const itemsList = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Item[]

    setItems(itemsList)
    applyFilters(itemsList, searchTerm, selectedCategory)
    setLoading(false)
  }

  const applyFilters = (itemList: Item[], search: string, category: string) => {
    let filtered = [...itemList]

    if (search) {
      filtered = filtered.filter((item) =>
        item.name.toLowerCase().includes(search.toLowerCase())
      )
    }

    if (category !== 'All') {
      filtered = filtered.filter((item) => item.category === category)
    }

    setFilteredItems(filtered)
  }

  const handleSearch = (term: string) => {
    setSearchTerm(term)
    applyFilters(items, term, selectedCategory)
  }

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category)
    applyFilters(items, searchTerm, category)
  }

  const handleAddItem = () => {
    setEditingItem(undefined)
    setIsModalOpen(true)
  }

  const handleEditItem = (item: Item) => {
    setEditingItem(item)
    setIsModalOpen(true)
  }

  const handleSaveItem = async (itemData: Item) => {
    try {
      if (itemData.id) {
        await updateDoc(doc(db, 'items', itemData.id), itemData)
      } else {
        await addDoc(collection(db, 'items'), {
          ...itemData,
          status: 'In Stock',
        })
      }

      if (itemData.status === 'Sold' && editingItem?.status !== 'Sold') {
        await addDoc(collection(db, 'sales'), {
          amount: itemData.price,
          category: itemData.category,
          timestamp: Date.now(),
        })
      }

      await fetchItems()
      setIsModalOpen(false)
      setEditingItem(undefined)
    } catch (err) {
      console.error('Error saving item:', err)
    }
  }

  const handleDeleteItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return
    await deleteDoc(doc(db, 'items', itemId))
    fetchItems()
  }

  const categories = ['All', ...categoriesList]

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">Loading...</div>
    )
  }

  return (
    <main className="px-4 sm:px-6 lg:px-8 py-8">

      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold dark:text-white">Items</h1>
        <Button onClick={handleAddItem} className="bg-green-600 text-white">
          + Add Item
        </Button>
      </div>

      {/* ADD CATEGORY + CONDITION + STATUS */}
      <div className="flex gap-2 mb-6 flex-wrap">
        <Button onClick={() => setIsCategoryModalOpen(true)} className="bg-blue-600 text-white">
          + Add Category
        </Button>
        <Button onClick={() => setIsConditionModalOpen(true)} className="bg-purple-600 text-white">
          + Add Condition
        </Button>
        <Button onClick={() => setIsStatusModalOpen(true)} className="bg-orange-600 text-white">
          + Add Status
        </Button>
      </div>

      {/* SEARCH + FILTER */}
      <div className="flex flex-col sm:flex-row gap-4 mb-8">
        <input
          type="text"
          placeholder="Search items..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
        />

        <select
          value={selectedCategory}
          onChange={(e) => handleCategoryChange(e.target.value)}
          className="px-4 py-2 border rounded-lg dark:bg-slate-700 dark:text-white"
        >
          {categories.map((cat) => (
            <option key={cat}>{cat}</option>
          ))}
        </select>
      </div>

      {/* ITEMS TABLE */}
      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-100 dark:bg-slate-700">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-semibold">Name</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Category</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Condition</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Price</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Status</th>
                <th className="px-6 py-3 text-left text-sm font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredItems.map((item) => (
                <tr key={item.id} className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700">
                  <td className="px-6 py-4">{item.name}</td>
                  <td className="px-6 py-4">{item.category}</td>
                  <td className="px-6 py-4">{item.condition}</td>
                  <td className="px-6 py-4 font-semibold">₱{item.price.toFixed(2)}</td>

                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      item.status === 'In Stock'
                        ? 'bg-green-100 text-green-800'
                        : item.status === 'Sold'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      {item.status}
                    </span>
                  </td>

                  {/* ACTION BUTTONS */}
                  <td className="px-6 py-4 flex flex-wrap gap-2">

                    {/* EDIT */}
                    <button
                      onClick={() => handleEditItem(item)}
                      className="px-3 py-1 rounded-md bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700"
                    >
                      Edit
                    </button>

                    {/* DELETE */}
                    <button
                      onClick={() => handleDeleteItem(item.id!)}
                      className="px-3 py-1 rounded-md bg-red-600 text-white text-xs font-semibold hover:bg-red-700"
                    >
                      Delete
                    </button>

                    {/* SOLD */}
                    {item.status !== 'Sold' && item.status !== 'Missing' && (
                      <button
                        onClick={() => handleSaveItem({ ...item, status: 'Sold' })}
                        className="px-3 py-1 rounded-md bg-green-600 text-white text-xs font-semibold hover:bg-green-700"
                      >
                        Sold
                      </button>
                    )}

                    {/* MISSING */}
                    {item.status !== 'Missing' && (
                      <button
                        onClick={() => handleSaveItem({ ...item, status: 'Missing' })}
                        className="px-3 py-1 rounded-md bg-orange-500 text-white text-xs font-semibold hover:bg-orange-600"
                      >
                        Missing
                      </button>
                    )}

                  </td>
                </tr>
              ))}
            </tbody>

          </table>
        </div>
      </div>

      <ItemForm
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingItem(undefined)
        }}
        onSubmit={handleSaveItem}
        editItem={editingItem}
        canEditPrice={true}
        categoriesList={categoriesList}
        conditionsList={conditionsList}
        statusesList={statusesList}
      />

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
