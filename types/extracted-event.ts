import { z } from 'zod'

/**
 * LLMが抽出するイベント情報のスキーマ
 */
export const ExtractedEventSchema = z.object({
  title: z.string().describe('イベント名・タイトル'),
  start_date: z.string().describe('開始日（YYYY-MM-DD形式）'),
  end_date: z.string().nullable().optional().describe('終了日（YYYY-MM-DD形式、常設の場合はnull）'),
  location: z.string().nullable().optional().describe('開催場所・集合場所'),
  area: z.string().nullable().optional().describe('都道府県・主要エリア（例: 東京、神奈川、関西）'),
  // LLMからは「街歩き周遊型」などバリエーションの多い文字列が返ってくるため、enumではなく任意の文字列を許可する
  type: z.string().nullable().optional().describe('イベントタイプ（例: 周遊型、ホール、ルーム、オンライン など自由入力）'),
  maker: z.string().nullable().optional().describe('制作団体・主催者（例: SCRAP、NAZO）'),
  price: z.string().nullable().optional().describe('価格情報（例: 3,500円、要予約）'),
  description: z.string().nullable().optional().describe('ストーリー概要・説明'),
  duration_text: z.string().nullable().optional().describe('所要時間（例: 90分、2時間、60-90分）'),
  opening_hours: z.string().nullable().optional().describe('営業時間・受付時間・プレイ可能時間（例: 10:00〜20:00、平日 12:00-19:00 / 土日祝 10:00-20:00）'),
  image_url: z.string().url().nullable().optional().describe('メインビジュアル画像のURL'),
})

export type ExtractedEvent = z.infer<typeof ExtractedEventSchema>

