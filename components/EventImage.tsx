'use client'

import { useState } from 'react'

interface EventImageProps {
  imageUrl: string | null
  title: string
}

export default function EventImage({ imageUrl, title }: EventImageProps) {
  const [imageError, setImageError] = useState(false)

  if (!imageUrl || imageError) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-orange via-pink-200 to-mint-green">
        <div className="text-center">
          <div className="text-white text-6xl mb-2">🔍</div>
          <div className="text-white text-lg font-bold">謎解きイベント</div>
        </div>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      className="w-full h-full object-cover"
      onError={() => setImageError(true)}
    />
  )
}

