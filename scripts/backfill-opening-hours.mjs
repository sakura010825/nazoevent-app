/**
 * opening_hours バックフィルスクリプト（ローカル実行用）
 * Vercelのタイムアウト制限なしで全件処理する
 *
 * 使い方:
 *   node scripts/backfill-opening-hours.mjs
 *
 * 対象: official_url があり opening_hours が null のイベント
 * 処理: 専用AIプロンプトで時間情報を抽出し保存
 *       見つからない場合は 'none' を保存（再処理防止）
 */

import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'
import { load } from 'cheerio'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// .env.local を読み込む
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = join(__dirname, '..', '.env.local')
const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(line => line.includes('='))
    .map(line => {
      const idx = line.indexOf('=')
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()]
    })
)

const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
const SUPABASE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
const GEMINI_API_KEY = env['GEMINI_API_KEY']

if (!SUPABASE_URL || !SUPABASE_KEY || !GEMINI_API_KEY) {
  console.error('必要な環境変数が設定されていません')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)

// ページテキストを取得（Jina Reader → 直接fetch+cheerioの順で試行）
async function fetchPageText(url) {
  // 1. Jina Reader経由
  try {
    const res = await fetch(`https://r.jina.ai/${url}`, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(15000),
    })
    if (res.ok) {
      const text = (await res.text()).replace(/\s+/g, ' ').trim().slice(0, 8000)
      if (text.length >= 200) return text
    }
  } catch { /* フォールバックへ */ }

  // 2. 直接fetch + cheerio
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0' },
    signal: AbortSignal.timeout(15000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const html = await res.text()
  const $ = load(html)
  $('script, style, nav, footer, header').remove()
  return $('body').text().replace(/\s+/g, ' ').trim().slice(0, 8000)
}

// Geminiで営業時間を抽出
async function extractOpeningHours(url, text) {
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

  const modelName = env['GEMINI_MODEL_NAME'] || 'gemini-2.0-flash'
  const model = genAI.getGenerativeModel({ model: modelName })
  const result = await model.generateContent(prompt)
  const responseText = result.response.text().trim()

  if (!responseText || responseText === 'null' || responseText === 'NULL') return null
  return responseText.replace(/^["'`]+|["'`]+$/g, '').trim() || null
}

// メイン処理
async function main() {
  console.log('===== opening_hours バックフィル開始 =====\n')

  // official_urlがあり、opening_hoursがnullのイベントを全件取得
  const { data: events, error } = await supabase
    .from('events')
    .select('id, title, official_url')
    .is('opening_hours', null)
    .not('official_url', 'is', null)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })

  if (error) {
    console.error('イベント取得エラー:', error)
    process.exit(1)
  }

  if (!events || events.length === 0) {
    console.log('処理対象なし（全件処理済み）')
    return
  }

  console.log(`処理対象: ${events.length}件\n`)
  const results = { updated: 0, skipped: 0, failed: 0 }

  for (let i = 0; i < events.length; i++) {
    const event = events[i]
    console.log(`[${i + 1}/${events.length}] ${event.title}`)
    console.log(`  URL: ${event.official_url}`)

    try {
      const text = await fetchPageText(event.official_url)
      const openingHours = await extractOpeningHours(event.official_url, text)

      const valueToSave = openingHours || 'none'
      const { error: updateError } = await supabase
        .from('events')
        .update({ opening_hours: valueToSave })
        .eq('id', event.id)

      if (updateError) throw new Error(String(updateError.message ?? updateError))

      if (openingHours) {
        results.updated++
        console.log(`  ✓ 取得成功: ${openingHours}`)
      } else {
        results.skipped++
        console.log(`  - 情報なし`)
      }
    } catch (err) {
      results.failed++
      console.log(`  ✗ エラー: ${err.message}`)
    }

    // API負荷軽減（1秒待機）
    if (i < events.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log('\n===== 最終結果 =====')
  console.log(`  取得成功: ${results.updated}件`)
  console.log(`  情報なし: ${results.skipped}件`)
  console.log(`  エラー:   ${results.failed}件`)
}

main().catch(err => {
  console.error('致命的エラー:', err)
  process.exit(1)
})
