'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

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

  const isActive = (path: string) => pathname === path

  const sidebarContent = (
    <>
      <div className="p-6 border-b border-blue-700">
        <h2 className="text-2xl font-bold text-white">SUSTAIN</h2>
        <p className="text-blue-200 text-xs mt-1">Inventory System</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        <Link
          href="/dashboard"
          className={`block px-4 py-3 rounded-lg transition ${
            isActive('/dashboard')
              ? 'bg-blue-500 text-white'
              : 'text-blue-100 hover:bg-blue-700'
          }`}
        >
          Dashboard
        </Link>
        <Link
          href="/items"
          className={`block px-4 py-3 rounded-lg transition ${
            isActive('/items')
              ? 'bg-blue-500 text-white'
              : 'text-blue-100 hover:bg-blue-700'
          }`}
        >
          Items
        </Link>
        <Link
          href="/sales"
          className={`block px-4 py-3 rounded-lg transition ${
            isActive('/sales')
              ? 'bg-blue-500 text-white'
              : 'text-blue-100 hover:bg-blue-700'
          }`}
        >
          Sales
        </Link>
      </nav>

      <div className="p-4 border-t border-blue-700">
        <div className="mb-4 px-4 py-2 bg-blue-900 rounded-lg text-center">
          <p className="text-blue-100 text-xs">Role</p>
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
        <div className="fixed top-0 left-0 right-0 bg-blue-900 text-white p-4 flex justify-between items-center z-50">
          <h1 className="text-xl font-bold">SUSTAIN</h1>
          <button onClick={() => setIsOpen(!isOpen)} className="text-white">
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
        {isOpen && (
          <div className="fixed top-16 left-0 right-0 bg-blue-900 h-screen z-40 overflow-y-auto">
            <div className="flex flex-col h-full">{sidebarContent}</div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="fixed left-0 top-0 h-screen w-64 bg-blue-900 text-white flex flex-col">
      {sidebarContent}
    </div>
  )
}
