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
 * URLからHTMLを取得してテキストと画像URLを抽出
 */
async function fetchAndExtractText(url: string): Promise<{ text: string; imageUrl: string | null }> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const html = await response.text()
    const $ = load(html)
    
    // ベースURLを取得（相対パスを絶対URLに変換するため）
    const baseUrl = new URL(url)
    
    // 画像URLを抽出（og:image、メイン画像、最初の画像の順で試行）
    let imageUrl: string | null = null
    
    // og:imageを確認
    const ogImage = $('meta[property="og:image"]').attr('content')
    if (ogImage) {
      imageUrl = ogImage.startsWith('http') ? ogImage : new URL(ogImage, baseUrl).href
    }
    
    // og:imageがない場合、メイン画像を探す
    if (!imageUrl) {
      const mainImage = $('img').first().attr('src')
      if (mainImage) {
        imageUrl = mainImage.startsWith('http') ? mainImage : new URL(mainImage, baseUrl).href
      }
    }
    
    // 不要な要素を削除
    $('script, style, nav, footer, header').remove()
    
    // メインコンテンツを抽出
    const text = $('body').text()
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 10000) // 長すぎる場合は切り詰め
    
    return { text, imageUrl }
  } catch (error) {
    console.error('Error fetching URL:', error)
    throw new Error('URLから情報を取得できませんでした')
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
        `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`,
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
        'gemini-1.5-flash-latest',
        'gemini-1.5-pro-latest',
        'gemini-1.5-flash-002',
        'gemini-1.5-flash',
        'gemini-1.5-pro-002',
        'gemini-1.5-pro',
        'gemini-pro',
      ]
    }
  }

  const prompt = `
以下のWebページのテキストから、謎解きイベントの情報を抽出してください。

URL: ${url}

テキスト:
${text}

以下のJSON形式で情報を抽出してください。

【重要】必須項目について：
- title: イベント名・タイトル（必須、必ず文字列を返すこと。nullは不可）
- start_date: 開始日（必須、YYYY-MM-DD形式で必ず文字列を返すこと。日付が不明な場合は、今日の日付または適切な推定日付を返すこと。nullは不可）

【任意項目】不明な場合はnullにしてください：
- end_date: 終了日（YYYY-MM-DD形式、常設の場合はnull）
- location: 開催場所・集合場所
- area: 都道府県・主要エリア（例: 東京、神奈川、関西）
- type: イベントタイプ（周遊型、ホール、ルーム、オンラインのいずれか、またはnull）
- maker: 制作団体・主催者（例: SCRAP、NAZO）
- price: 価格情報（例: 3,500円、要予約）
- description: ストーリー概要・説明
- image_url: メインビジュアル画像のURL（完全なURL形式）

JSON形式で返してください。他の説明は不要です。
必ずtitleとstart_dateは文字列として返してください。
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
      
      // start_dateがnullの場合は、今日の日付をデフォルト値として設定
      if (!parsed.start_date || parsed.start_date === null) {
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

