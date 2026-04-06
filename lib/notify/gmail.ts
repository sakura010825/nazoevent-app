import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true, // SSL（Vercelでport 587/STARTTLSはブロックされる場合がある）
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
  connectionTimeout: 5000, // 5秒で接続タイムアウト
  greetingTimeout: 5000,
  socketTimeout: 5000,
})

interface CrawlResults {
  collected: number
  skipped: number
  registered: number
  failed: number
  errors: string[]
}

export async function sendCrawlNotification(results: CrawlResults): Promise<void> {
  const to = process.env.GMAIL_USER
  if (!to || !process.env.GMAIL_APP_PASSWORD) {
    console.warn('[notify] GMAIL_USER or GMAIL_APP_PASSWORD not set, skipping notification')
    return
  }

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

  await transporter.sendMail({
    from: `NazoNote <${to}>`,
    to,
    subject,
    text,
  })

  console.log(`[notify] Gmail通知送信完了: ${subject}`)
}
