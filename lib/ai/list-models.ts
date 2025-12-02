import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * 利用可能なGeminiモデルをリストアップ
 */
export async function listAvailableModels(): Promise<string[]> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('GEMINI_API_KEYが設定されていません')
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey)
    // 直接APIを呼び出してモデル一覧を取得
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models?key=${apiKey}`
    )
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()
    const models = data.models
      ?.filter((m: any) => m.supportedGenerationMethods?.includes('generateContent'))
      .map((m: any) => m.name.replace('models/', '')) || []

    return models
  } catch (error) {
    console.error('Error listing models:', error)
    // フォールバック: 一般的なモデル名を返す
    return ['gemini-pro', 'gemini-1.5-pro', 'gemini-1.5-flash']
  }
}

