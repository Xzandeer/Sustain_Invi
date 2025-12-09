'use client'

import { useEffect, useState, useMemo } from 'react'
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase'
import { onAuthStateChanged } from 'firebase/auth'
import ProtectedRoute from '@/components/ProtectedRoute'
import { ShoppingBag, DollarSign, Search, Trash2, Clock, Calendar, Filter } from 'lucide-react'

interface Sale {
  id: string
  amount: number
  category: string
  timestamp: number // Milliseconds since epoch
}

// Custom KPICard for Total Sales (Unchanged)
function SalesKPICard({ totalSales }: { totalSales: number }) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-6 w-full max-w-sm">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">
          Total Sales Value
        </h3>
      </div>
      <p className="text-4xl font-extrabold text-green-600 mt-2">
        ₱{totalSales.toFixed(2)}
      </p>
      <p className="text-xs text-gray-400 mt-1">Record of all transactions</p>
    </div>
  )
}

// Helper function to format timestamp (Unchanged)
const formatTimestamp = (timestamp: number) => {
  if (!timestamp) return 'N/A';
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

// Interface for Date Range Filter (Unchanged)
interface DateRange {
    start: string; // YYYY-MM-DD
    end: string;   // YYYY-MM-DD
}


function SalesContent() {
  const [sales, setSales] = useState<Sale[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [dateRange, setDateRange] = useState<DateRange>({ start: '', end: '' })
  
  // NEW STATE: Store the unique categories found in the sales data
  const [uniqueCategories, setUniqueCategories] = useState<string[]>(['All Categories']);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        await fetchSales()
        await fetchCategories() // Fetch categories when authenticated
      } else {
        setLoading(false)
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

      salesList.sort((a, b) => b.timestamp - a.timestamp)

      setSales(salesList)
    } catch (error) {
      console.error('Error fetching sales:', error)
    } finally {
      setLoading(false)
    }
  }

  // NEW useEffect hook to fetch unique categories from Firestore
  const fetchCategories = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'categories'))
      const categories = snapshot.docs.map((doc) => doc.data().name) // Assuming 'name' is the field holding the category name.
      const unique = ['All Categories', ...Array.from(new Set(categories))]
      setUniqueCategories(unique)
    } catch (error) {
      console.error('Error fetching categories:', error)
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

  // Consolidated Filtering Logic (Updated to use uniqueCategories state)
  const filteredSales = useMemo(() => {
    let currentSales = sales;
    const lowerCaseSearch = searchTerm.toLowerCase();

    // 1. Category Filter
    if (selectedCategory && selectedCategory !== 'All Categories') {
        currentSales = currentSales.filter(sale => sale.category === selectedCategory);
    }
    
    // 2. Date Range Filter
    const startDate = dateRange.start ? new Date(dateRange.start).getTime() : 0;
    const endDate = dateRange.end ? new Date(dateRange.end).getTime() : Infinity;

    // Adjust end date to include the whole day (add 23:59:59.999)
    let adjustedEndDate = endDate;
    if (dateRange.end) {
        const endDay = new Date(dateRange.end);
        endDay.setHours(23, 59, 59, 999);
        adjustedEndDate = endDay.getTime();
    }

    if (startDate || endDate) {
        currentSales = currentSales.filter(sale => {
            const saleTime = sale.timestamp;
            return saleTime >= startDate && saleTime <= adjustedEndDate;
        });
    }

    // 3. Free Text Search Filter
    if (lowerCaseSearch) {
        currentSales = currentSales.filter(sale => 
            sale.category.toLowerCase().includes(lowerCaseSearch) ||
            sale.amount.toString().includes(lowerCaseSearch) ||
            sale.id.toLowerCase().includes(lowerCaseSearch)
        );
    }

    return currentSales;
  }, [sales, searchTerm, selectedCategory, dateRange]);

  const totalSales = useMemo(() => filteredSales.reduce((sum, s) => sum + s.amount, 0), [filteredSales]);


  return (
    <main className="p-8 bg-gray-50 min-h-screen">
      
      {/* Page Header */}
      <div className="flex justify-between items-center mb-6 border-b pb-4 border-gray-200">
        <div className="flex items-center">
          <ShoppingBag className="h-8 w-8 text-indigo-600 mr-3" />
          <h1 className="text-3xl font-bold text-gray-900">Sales Record</h1>
        </div>
      </div>

      {/* KPI Card and Filters */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-6">
        <SalesKPICard totalSales={totalSales} />
        
        {/* Filter Container */}
        <div className="flex flex-col gap-4 p-4 bg-white rounded-xl shadow-lg border border-gray-100 flex-grow max-w-lg">
            <h3 className="text-base font-semibold text-gray-700 flex items-center mb-1 border-b pb-2 border-gray-100">
                <Filter size={18} className="mr-2 text-indigo-500" />
                Filter Records
            </h3>
            
            {/* Row 1: Category Dropdown & Date Range Input */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Category Filter */}
                <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Category</label>
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    >
                        {uniqueCategories.map(category => (
                            <option key={category} value={category}>
                                {category}
                            </option>
                        ))}
                    </select>
                </div>

                {/* Date Range - Start */}
                <div>
                    <label className="text-xs font-medium text-gray-500 flex items-center mb-1">
                        <Calendar size={14} className="mr-1 text-gray-400"/>
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={dateRange.start}
                        onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>
            </div>

            {/* Row 2: Date Range End & Search Bar */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Date Range - End */}
                <div>
                    <label className="text-xs font-medium text-gray-500 flex items-center mb-1">
                        <Calendar size={14} className="mr-1 text-gray-400"/>
                        End Date
                    </label>
                    <input
                        type="date"
                        value={dateRange.end}
                        onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                        className="w-full py-2.5 px-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>

                {/* Free Text Search */}
                <div className="relative">
                    <label className="text-xs font-medium text-gray-500 block mb-1">Quick Search</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                            <Search className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder="Search records..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full py-2.5 pl-10 pr-3 border border-gray-300 rounded-lg text-sm shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        />
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Sales Table Container */}
      <div className="bg-white rounded-xl shadow-xl overflow-hidden border border-gray-100">
        
        {loading ? (
          <div className="p-10 text-center text-lg text-indigo-600 animate-pulse">Loading sales data...</div>
        ) : filteredSales.length === 0 ? (
          <div className="p-10 text-center text-gray-500">
            <Search size={40} className="mx-auto mb-3 text-indigo-400" />
            <p className='text-lg font-medium'>
                {searchTerm || selectedCategory !== 'All Categories' || dateRange.start || dateRange.end 
                    ? `No sales records match your current filters.` 
                    : 'No sales records found.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px] divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount (₱)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    <div className="flex items-center">
                        <Clock size={14} className="mr-1"/> Sale Date & Time
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="bg-white divide-y divide-gray-100">
                {filteredSales.map((sale) => (
                  <tr
                    key={sale.id}
                    className="hover:bg-indigo-50/50 transition duration-100"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {sale.category}
                    </td>

                    <td className="px-6 py-4 text-sm text-green-700 font-bold">
                      ₱{sale.amount.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-sm text-gray-600">
                      {formatTimestamp(sale.timestamp)}
                    </td>
                    
                    <td className="px-6 py-4 text-sm text-gray-400 font-mono text-xs">
                      {sale.id.slice(0, 4)}...{sale.id.slice(-4)} 
                    </td>

                    <td className="px-6 py-4 text-right text-sm">
                      <button
                        onClick={() => handleDeleteSale(sale.id)}
                        className="inline-flex items-center text-red-500 hover:text-red-700 font-medium transition duration-150 p-2 rounded-full hover:bg-red-50"
                        title="Delete Sale Record"
                      >
                        <Trash2 size={16} />
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
