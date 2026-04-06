import { GoogleGenerativeAI } from '@google/generative-ai'
import { ExtractedEventSchema, ExtractedEvent } from '@/types/extracted-event'
import { load } from 'cheerio'
import { z } from 'zod'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY

if (!GEMINI_API_KEY) {
  console.error('GEMINI_API_KEY is not set')
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null

/**
 * Geminiモデル名を取得するヘルパー
 */
async function getModelNames(): Promise<string[]> {
  const preferredModel = process.env.GEMINI_MODEL_NAME
  if (preferredModel) return [preferredModel]

  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set')

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
      { method: 'GET', headers: { 'Content-Type': 'application/json' } }
    )

    if (response.ok) {
      const data = await response.json()
      const available = data.models
        ?.filter((m: any) =>
          m.supportedGenerationMethods?.includes('generateContent') &&
          m.name && !m.name.includes('embedding') && !m.name.includes('embed')
        )
        .map((m: any) => m.name.replace('models/', '')) || []
      if (available.length > 0) return available
    }
  } catch (error) {
    console.error('Error fetching available models:', error)
  }

  return [
    'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest',
  ]
}

/**
 * URLからテキストと画像URLを抽出
 * 1. Jina Reader（Markdown）で取得を試みる
 * 2. 失敗/短すぎる場合は通常のHTML取得＋cheerioでフォールバック
 */
async function fetchAndExtractText(url: string): Promise<{ text: string; imageUrl: string | null }> {
  let lastError: unknown = null

  // 1. Jina Reader 経由の取得を試行
  try {
    const jinaUrl = `https://r.jina.ai/${url}`

    const response = await fetch(jinaUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`Jina Reader経由での取得に失敗しました (status: ${response.status})`)
    }

    const markdown = await response.text()

    const text = markdown
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000) // 長すぎる場合は切り詰め

    // テキストが極端に短い場合は、フォールバックに切り替える
    if (text.length >= 200) {
      // 画像URLはMarkdown中の最初の画像（![]()）があれば利用する
      let imageUrl: string | null = null
      const imageMatch = markdown.match(/!\[[^\]]*]\((https?:\/\/[^\s)]+)\)/)
      if (imageMatch && imageMatch[1]) {
        imageUrl = imageMatch[1]
      }

      return { text, imageUrl }
    } else {
      lastError = new Error(
        'Jina Reader経由で取得できるテキストが非常に短いため、フォールバック処理に切り替えました。'
      )
      console.warn(lastError)
    }
  } catch (error) {
    lastError = error
    console.warn('Error fetching URL via Jina Reader, falling back to direct fetch:', error)
  }

  // 2. 通常のHTML取得＋cheerioを使ったフォールバック
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
      },
    })

    if (!response.ok) {
      throw new Error(`直接取得に失敗しました (status: ${response.status})`)
    }

    const html = await response.text()
    const $ = load(html)

    // ベースURLを取得（相対パスを絶対URLに変換するため）
    const baseUrl = new URL(url)

    // 画像URLを抽出（og:image、メイン画像、最初の画像の順で試行）
    let imageUrl: string | null = null

    const ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage) {
      imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, baseUrl).href
    }

    if (!imageUrl) {
      const mainImage = $('img').first().attr('src')
      if (mainImage) {
        imageUrl = mainImage.startsWith('http') ? mainImage : new URL(mainImage, baseUrl).href
      }
    }

    // 不要な要素を削除
    $('script, style, nav, footer, header').remove()

    // メインコンテンツを抽出
    const text = $('body')
      .text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000)

    if (!text || text.length === 0) {
      throw new Error('HTMLから有効なテキストを抽出できませんでした')
    }

    return { text, imageUrl }
  } catch (error) {
    console.error('Error fetching URL directly after Jina Reader failed:', error, 'First error:', lastError)
    throw new Error('サイトの制限により自動入力が制限されました。手動で補完してください。')
  }
}

/**
 * LLMを使用してHTMLテキストからイベント情報を抽出
 */
export async function extractEventFromUrl(url: string): Promise<ExtractedEvent> {
  if (!genAI) {
    throw new Error('GEMINI_API_KEYが設定されていません。環境変数を確認してください。')
  }

  // HTMLを取得してテキストと画像URLを抽出
  const { text, imageUrl: extractedImageUrl } = await fetchAndExtractText(url)

  // 環境変数でモデル名を指定可能（デフォルトは利用可能なモデルを取得）
  const preferredModel = process.env.GEMINI_MODEL_NAME

  // 利用可能なモデルを取得
  let modelNames: string[] = []
  
  if (preferredModel) {
    modelNames = [preferredModel]
  } else {
    try {
      // APIを直接呼び出して利用可能なモデルを取得
      const apiKey = process.env.GEMINI_API_KEY
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY is not set')
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`,
        { 
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        }
      )
      
      if (response.ok) {
        const data = await response.json()
        const availableModels = data.models
          ?.filter((m: any) => 
            m.supportedGenerationMethods?.includes('generateContent') &&
            m.name && 
            !m.name.includes('embedding') &&
            !m.name.includes('embed')
          )
          .map((m: any) => m.name.replace('models/', '')) || []
        
        if (availableModels.length > 0) {
          modelNames = availableModels
          console.log('Found available models:', availableModels)
        } else {
          console.warn('No available models found in API response')
        }
      } else {
        const errorText = await response.text()
        console.error(`Failed to fetch models: ${response.status} ${response.statusText}`, errorText)
      }
    } catch (error) {
      console.error('Error fetching available models:', error)
    }

    // フォールバック: 一般的なモデル名（最新の形式も含む）
    if (modelNames.length === 0) {
      modelNames = [
        'gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-flash-latest',
      ]
    }
  }

  const prompt = `
あなたは謎解きイベントの情報抽出の専門家です。
提供されたテキストから、イベント情報を正確にJSONで抽出してください。

URL: ${url}

テキスト:
${text}

【抽出ルール】
1. title: 最も大きく扱われているイベント名を抽出してください。「チケット購入」などのボタンの文字と混同しないでください。
2. start_date / end_date: 
   - 「2024年4月1日〜5月31日」のような表記から日付を特定してください。
   - 年が省略されている場合は、現在の年（2026年）または文脈から判断してください。
3. price: 「前売 3,500円」「当日 4,000円」など、価格体系がわかるように抽出してください。
4. duration_text: 「100分」「約2時間」などの所要時間を抽出してください。
5. type: 以下のいずれかに分類してください：[周遊型, ホール型, ルーム型, オンライン, 持ち帰り謎, その他]
6. description: イベントの世界観やストーリー、どんな謎解きかを100文字程度で要約してください。
7. location: 開催場所・会場名・集合場所を抽出してください（例: "東京ミステリーサーカス"、"下北沢駅周辺"）。住所があれば会場名+住所で。
8. opening_hours: プレイ可能時間・営業時間・受付時間を抽出してください。「10:00〜20:00（最終受付19:00）」「平日 12:00-21:00 / 土日祝 10:00-21:30」のような形式で。開始時間と終了時間の両方があれば含めてください。「受付時間」「プレイ可能時間」「営業時間」「開館時間」などの表記を探してください。

【注意】
- 出力は必ず純粋なJSONのみとしてください。
- テキスト内に情報がない項目は必ず null にしてください。推測しすぎないでください。
- テキスト量が少ない場合でも、分からない項目は必ず null を設定し、存在しないフィールドを勝手に作らないでください。
- 日本語で回答してください。
`

  // 複数のモデル名を試行（利用可能なものを自動検出）
  let lastError: Error | null = null

  for (const modelName of modelNames) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName })
      console.log(`Trying model: ${modelName}`)
      
      const result = await model.generateContent(prompt)
      const response = result.response
      const responseText = response.text()

      // JSONを抽出（```json で囲まれている場合も考慮）
      let jsonText = responseText.trim()
      if (jsonText.startsWith('```')) {
        jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      }

      // JSONをパース
      const parsed = JSON.parse(jsonText)

      // 日本語形式の日付（"2026年4月8日"）をYYYY-MM-DD形式に変換するヘルパー
      const normalizeDate = (val: unknown): string | null => {
        if (!val || typeof val !== 'string') return null
        // すでにYYYY-MM-DD形式ならそのまま
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val
        // "YYYY年M月D日" 形式を変換
        const m = val.match(/(\d{4})年(\d{1,2})月(\d{1,2})日/)
        if (m) {
          return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
        }
        return val
      }

      // 日付フィールドを正規化
      parsed.start_date = normalizeDate(parsed.start_date)
      parsed.end_date = normalizeDate(parsed.end_date)

      // start_dateがnullの場合は、今日の日付をデフォルト値として設定
      if (!parsed.start_date) {
        const today = new Date()
        const year = today.getFullYear()
        const month = String(today.getMonth() + 1).padStart(2, '0')
        const day = String(today.getDate()).padStart(2, '0')
        parsed.start_date = `${year}-${month}-${day}`
        console.warn('start_date was null, using today\'s date as default:', parsed.start_date)
      }

      // titleがnullの場合は、URLから推測
      if (!parsed.title || parsed.title === null) {
        parsed.title = 'イベント名不明'
        console.warn('title was null, using default value')
      }

      // typeが配列で返ってきた場合は先頭の文字列を使用
      if (Array.isArray(parsed.type)) {
        parsed.type = parsed.type[0] ?? null
        console.warn('type was array, using first element:', parsed.type)
      }

      // duration_textが存在しない場合はnullを設定
      if (!('duration_text' in parsed)) {
        parsed.duration_text = null
      }

      // opening_hoursが存在しない場合はnullを設定
      if (!('opening_hours' in parsed)) {
        parsed.opening_hours = null
      }
      
      // image_urlがnullまたは相対パスの場合、抽出した画像URLを使用
      if (!parsed.image_url || parsed.image_url === null) {
        if (extractedImageUrl) {
          parsed.image_url = extractedImageUrl
          console.log('Using extracted image URL:', extractedImageUrl)
        }
      } else if (!parsed.image_url.startsWith('http')) {
        // 相対パスの場合は絶対URLに変換
        try {
          const baseUrl = new URL(url)
          parsed.image_url = new URL(parsed.image_url, baseUrl).href
          console.log('Converted relative image URL to absolute:', parsed.image_url)
        } catch (error) {
          console.warn('Failed to convert image URL, using extracted URL:', error)
          if (extractedImageUrl) {
            parsed.image_url = extractedImageUrl
          }
        }
      }
      
      // Zodスキーマで検証
      try {
        const validated = ExtractedEventSchema.parse(parsed)
        console.log(`Successfully extracted event using model: ${modelName}`)
        return validated
      } catch (validationError) {
        // バリデーションエラーの詳細をログに出力
        if (validationError instanceof z.ZodError) {
          console.error('Validation error:', validationError.errors)
          throw new Error(
            `データの検証に失敗しました: ${validationError.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`
          )
        }
        throw validationError
      }
    } catch (error) {
      console.error(`Error with model ${modelName}:`, error)
      lastError = error instanceof Error ? error : new Error(String(error))
      
      // モデルが見つからないエラーの場合、次のモデルを試す
      if (error instanceof Error && error.message.includes('not found')) {
        continue
      }
      
      // その他のエラー（JSON解析エラーなど）の場合は再試行しない
      if (error instanceof SyntaxError) {
        throw new Error('LLMのレスポンスを解析できませんでした。手動で入力してください。')
      }
      
      if (error instanceof Error && error.message.includes('API_KEY')) {
        throw new Error('Gemini APIキーが正しく設定されていません。')
      }
      
      // モデルが見つからないエラー以外の場合は、そのエラーを投げる
      if (!(error instanceof Error && error.message.includes('not found'))) {
        throw new Error(`イベント情報の抽出に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`)
      }
    }
  }

  // すべてのモデルで失敗した場合
  throw new Error(
    `利用可能なGeminiモデルが見つかりませんでした。試行したモデル: ${modelNames.join(', ')}。最後のエラー: ${lastError?.message}`
  )
}

/**
 * 公式ページのURLからプレイ可能時間（営業時間・受付時間）を抽出する
 */
export async function extractOpeningHoursFromUrl(url: string): Promise<string | null> {
  if (!genAI) {
    console.error('GEMINI_API_KEYが設定されていません')
    return null
  }

  try {
    const { text } = await fetchAndExtractText(url)

    const modelNames = await getModelNames()

    const prompt = `
以下のテキストは謎解きイベントの公式ページの内容です。
このイベントをプレイできる時間帯（営業時間・受付時間・開催時間）を抽出してください。

テキスト:
${text}

【ルール】
- 「営業時間」「受付時間」「開催時間」「プレイ可能時間」「開館時間」「受付開始」などの表現を探してください
- 「10:00〜20:00」「11時〜18時（最終受付17:00）」「平日 12:00-19:00 / 土日祝 10:00-20:00」のような形式で返してください
- 時間帯情報が見つかった場合のみ返してください。見つからない場合は "null" と返してください
- 「開催期間中いつでもプレイ可能」「24時間」など時間制限のないイベントは "null" を返してください
- 余計な説明は不要です。時間帯の文字列だけを返してください
`

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const responseText = result.response.text().trim()

        if (!responseText || responseText === 'null' || responseText === 'NULL') {
          return null
        }

        const cleaned = responseText.replace(/^["'`]+|["'`]+$/g, '').trim()
        return cleaned || null
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) continue
        console.error(`Error extracting opening hours with model ${modelName}:`, error)
        return null
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting opening hours from URL:', error)
    return null
  }
}

/**
 * 公式ページのURLから開催場所を抽出する
 */
export async function extractLocationFromUrl(url: string): Promise<string | null> {
  if (!genAI) {
    console.error('GEMINI_API_KEYが設定されていません')
    return null
  }

  try {
    const { text } = await fetchAndExtractText(url)

    const modelNames = await getModelNames()

    const prompt = `
以下のテキストは謎解きイベントの公式ページの内容です。
このイベントの開催場所（会場名や住所）を抽出してください。

テキスト:
${text}

【ルール】
- 開催場所・会場名・集合場所を簡潔に返してください（例: "東京ミステリーサーカス"、"下北沢駅周辺"、"新宿区立〇〇ホール"）
- 複数の会場がある場合は代表的なものを1つ選んでください
- 場所が特定できない場合は "null" と返してください
- 余計な説明は不要です。場所の文字列だけを返してください
`

    for (const modelName of modelNames) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName })
        const result = await model.generateContent(prompt)
        const responseText = result.response.text().trim()

        if (!responseText || responseText === 'null' || responseText === 'NULL') {
          return null
        }

        // 余計な引用符やマークダウンを除去
        const cleaned = responseText.replace(/^["'`]+|["'`]+$/g, '').trim()
        return cleaned || null
      } catch (error) {
        if (error instanceof Error && error.message.includes('not found')) continue
        console.error(`Error extracting location with model ${modelName}:`, error)
        return null
      }
    }

    return null
  } catch (error) {
    console.error('Error extracting location from URL:', error)
    return null
  }
}

