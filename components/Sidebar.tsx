'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'
import { Menu, X, Home, BarChart, Box, ShoppingBag, Phone, Truck, Calendar } from 'lucide-react' // Updated to import Calendar icon

interface SidebarProps {
  userRole: string | null
}

export default function Sidebar({ userRole }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleLogout = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const isActive = (path: string) => pathname === path || pathname.startsWith(path + '/')

  const sidebarContent = (
    <>
      {/* Logo and Title */}
      <div className="flex items-center p-6 border-b border-gray-700">
        <img src="/Logo.png" alt="Logo" className="h-13 w-13" /> {/* Increased Logo size */}
        <div className="ml-6 text-center">
          <h2 className="text-2xl text-white">SUSTAIN</h2> {/* Smaller text size */}
        </div>
      </div>

      {/* Sidebar Links */}
      <nav className="flex-1 p-4 space-y-2">
        {/* Dashboard */}
        <Link
          href="/dashboard"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/dashboard')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <Home size={20} className="mr-2" />
          Dashboard
        </Link>

        {/* Analytics */}
        <Link
          href="/analytics"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/analytics')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <BarChart size={20} className="mr-2" />
          Analytics
        </Link>

        {/* Inventory */}
        <Link
          href="/items"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/items')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <Box size={20} className="mr-2" />
          Inventory
        </Link>

        {/* Sales */}
        <Link
          href="/sales"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/sales')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <ShoppingBag size={20} className="mr-2" />
          Sales
        </Link>

        {/* Reservation (Updated icon to Calendar) */}
        <Link
          href="/reservations"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/reservations')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <Calendar size={20} className="mr-2" /> {/* Changed to Calendar */}
          Reservation
        </Link>

        {/* Contacts (Kept as Phone) */}
        <Link
          href="/contacts"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/contacts')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <Phone size={20} className="mr-2" />
          Contacts
        </Link>

        {/* Delivery */}
        <Link
          href="/delivery"
          className={`flex items-center px-4 py-3 rounded-lg transition ${
            isActive('/delivery')
              ? 'bg-[#1100ff] text-white'
              : 'text-gray-300 hover:bg-[#444444]'
          }`}
        >
          <Truck size={20} className="mr-2" />
          Delivery
        </Link>
      </nav>

      {/* Role and Logout */}
      <div className="p-4 border-t border-gray-700">
        <div className="mb-4 px-4 py-2 bg-[#444444] rounded-lg text-center">
          <p className="text-gray-300 text-xs">Role</p>
          <p className="text-white font-semibold capitalize">{userRole}</p>
        </div>
        <button
          onClick={handleLogout}
          className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition text-sm font-medium"
        >
          Logout
        </button>
      </div>
    </>
  )

  if (isMobile) {
    return (
      <>
        <div className="fixed top-0 left-0 right-0 bg-[#000000] text-white p-4 flex justify-between items-center z-50">
          <img src="/Logo.png" alt="Logo" className="h-16 w-16" /> {/* Adjusted Logo size for mobile */}
          <button onClick={() => setIsOpen(!isOpen)} className="text-white">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {isOpen && (
          <div className="fixed top-16 left-0 right-0 bg-[#333333] h-screen z-40 overflow-y-auto">
            <div className="flex flex-col h-full">{sidebarContent}</div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-[#000000] text-white flex flex-col">
      {sidebarContent}
    </div>
  )
}
