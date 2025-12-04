'use client'

import { useState, useEffect } from 'react'
import { Palette } from 'lucide-react'

const PASTEL_COLORS = [
  { name: 'ホワイト', value: 'white', bgClass: 'bg-white' },
  { name: 'パステルピンク', value: 'pastel-pink', bgClass: 'bg-pink-100' },
  { name: 'パステルブルー', value: 'pastel-blue', bgClass: 'bg-blue-100' },
  { name: 'パステルグリーン', value: 'pastel-green', bgClass: 'bg-green-100' },
  { name: 'パステルイエロー', value: 'pastel-yellow', bgClass: 'bg-yellow-100' },
  { name: 'パステルパープル', value: 'pastel-purple', bgClass: 'bg-purple-100' },
  { name: 'パステルオレンジ', value: 'pastel-orange', bgClass: 'bg-orange-100' },
  { name: 'パステルミント', value: 'pastel-mint', bgClass: 'bg-emerald-100' },
  { name: 'パステルグレー', value: 'pastel-gray', bgClass: 'bg-gray-100' },
] as const

const COLOR_MAP: Record<string, string> = {
  'white': '#FFFFFF',
  'pastel-pink': '#FFE4E6',
  'pastel-blue': '#DBEAFE',
  'pastel-green': '#D1FAE5',
  'pastel-yellow': '#FEF3C7',
  'pastel-purple': '#E9D5FF',
  'pastel-orange': '#FFEDD5',
  'pastel-mint': '#D1FAE5',
  'pastel-gray': '#F3F4F6',
}

export default function ColorPalette() {
  const [selectedColor, setSelectedColor] = useState<string>('white')
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    // LocalStorageから背景色を読み込む
    const savedColor = localStorage.getItem('background-color') || 'white'
    setSelectedColor(savedColor)
    applyBackgroundColor(savedColor)
  }, [])

  const applyBackgroundColor = (colorValue: string) => {
    const color = COLOR_MAP[colorValue] || COLOR_MAP['white']
    // CSS変数を更新
    document.documentElement.style.setProperty('--background', color)
    // body要素に直接背景色を適用
    if (typeof document !== 'undefined') {
      document.body.style.backgroundColor = color
      // main要素にも適用（bg-creamクラスを上書き）
      const mainElement = document.querySelector('main')
      if (mainElement) {
        mainElement.style.backgroundColor = color
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('background-color', colorValue)
    }
  }

  const handleColorSelect = (colorValue: string) => {
    setSelectedColor(colorValue)
    applyBackgroundColor(colorValue)
    setIsOpen(false)
  }

  const currentColor = PASTEL_COLORS.find(c => c.value === selectedColor) || PASTEL_COLORS[0]

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white text-gray-700 rounded-2xl text-sm sm:text-base font-semibold hover:bg-gray-100 transition-colors shadow-sm"
        title="背景色を変更"
      >
        <Palette className="w-4 h-4 sm:w-5 sm:h-5" />
        <span className="hidden sm:inline">背景色</span>
      </button>

      {isOpen && (
        <>
          {/* オーバーレイ */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          {/* カラーパレット */}
          <div className="absolute right-0 top-full mt-2 bg-white rounded-2xl shadow-lg p-4 z-50 min-w-[200px]">
            <div className="text-sm font-semibold text-gray-700 mb-3">背景色を選択</div>
            <div className="grid grid-cols-3 gap-2">
              {PASTEL_COLORS.map((color) => (
                <button
                  key={color.value}
                  onClick={() => handleColorSelect(color.value)}
                  className={`${color.bgClass} w-full h-12 rounded-xl border-2 transition-all hover:scale-110 ${
                    selectedColor === color.value
                      ? 'border-pastel-orange ring-2 ring-pastel-orange ring-offset-2'
                      : 'border-gray-200'
                  }`}
                  title={color.name}
                />
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 text-center">
              {currentColor.name}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

