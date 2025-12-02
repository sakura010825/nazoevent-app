'use client'

interface EventImageProps {
  imageUrl: string | null
  title: string
}

export default function EventImage({ imageUrl, title }: EventImageProps) {
  if (!imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-orange to-mint-green">
        <span className="text-white text-4xl font-bold">?</span>
      </div>
    )
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      className="w-full h-full object-cover"
      onError={(e) => {
        const target = e.target as HTMLImageElement
        target.style.display = 'none'
        // フォールバックを表示
        const parent = target.parentElement
        if (parent && !parent.querySelector('.fallback')) {
          const fallback = document.createElement('div')
          fallback.className = 'fallback w-full h-full flex items-center justify-center bg-gradient-to-br from-pastel-orange to-mint-green'
          fallback.innerHTML = '<span class="text-white text-4xl font-bold">?</span>'
          parent.appendChild(fallback)
        }
      }}
    />
  )
}

