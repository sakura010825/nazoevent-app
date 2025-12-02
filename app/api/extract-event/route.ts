import { NextRequest, NextResponse } from 'next/server'
import { extractEventFromUrl } from '@/lib/ai/extract-event'

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json(
        { error: 'URLが必要です' },
        { status: 400 }
      )
    }

    // URLの形式を検証
    try {
      new URL(url)
    } catch {
      return NextResponse.json(
        { error: '無効なURLです' },
        { status: 400 }
      )
    }

    // イベント情報を抽出
    const extractedData = await extractEventFromUrl(url)

    return NextResponse.json({
      success: true,
      data: extractedData,
      sourceUrl: url,
    })
  } catch (error) {
    console.error('Error in extract-event API:', error)
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'イベント情報の抽出に失敗しました',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 500 }
    )
  }
}

