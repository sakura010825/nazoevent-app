'use client'

import { Plus } from 'lucide-react'
import { useState } from 'react'
import AddEventModal from './AddEventModal'

export default function AddEventButton() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-1 sm:gap-2 bg-pastel-orange text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-sm sm:text-base font-semibold hover:bg-opacity-90 transition-colors shadow-md"
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">URLから追加</span>
        <span className="sm:hidden">追加</span>
      </button>

      {isOpen && <AddEventModal onClose={() => setIsOpen(false)} />}
    </>
  )
}

