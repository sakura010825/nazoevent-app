import { Resend } from 'resend'

interface CrawlResults {
  collected: number
  skipped: number
  registered: number
  failed: number
  errors: string[]
}

export async function sendCrawlNotification(results: CrawlResults): Promise<void> {
  const to = process.env.GMAIL_USER
  const apiKey = process.env.RESEND_API_KEY
  if (!to || !apiKey) {
    console.warn('[notify] GMAIL_USER or RESEND_API_KEY not set, skipping notification')
    return
  }

  const resend = new Resend(apiKey)

  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  const statusIcon = results.failed > 0 ? '⚠️' : results.registered > 0 ? '✅' : 'ℹ️'
  const subject = `${statusIcon} NazoNote クロール完了 - ${results.registered}件登録 (${now})`

  const errorLines = results.errors.length > 0
    ? `\nエラー詳細:\n${results.errors.map(e => `  - ${e}`).join('\n')}`
    : ''

  const text = `NazoNote 自動クロール結果

実行日時: ${now}

--- 結果 ---
収集URL数:  ${results.collected} 件
新規登録:   ${results.registered} 件
スキップ:   ${results.skipped} 件（登録済み）
エラー:     ${results.failed} 件
${errorLines}
`

  const { error } = await resend.emails.send({
    from: 'NazoNote <onboarding@resend.dev>',
    to,
    subject,
    text,
  })

  if (error) {
    throw new Error(`Resend送信エラー: ${error.message}`)
  }

  console.log(`[notify] Resend通知送信完了: ${subject}`)
}
