import { load } from 'cheerio'

const BASE_URL = 'https://nazohiroba.com'

// クロール対象の都道府県コード
const TARGET_PREFECTURES = [
  { code: '13', name: '東京' },
  { code: '14', name: '神奈川' },
  { code: '11', name: '埼玉' },
  { code: '12', name: '千葉' },
]

// クロール対象のイベントタイプコード
const TARGET_TYPES = [
  { code: '01', name: '街歩き' },
  { code: '02', name: '周遊型' },
  { code: '11', name: '持ち帰り' },
]

/**
 * 1ページ分のイベントURLスラグを取得
 * @returns イベントの絶対URL一覧
 */
async function fetchEventUrlsFromPage(url: string): Promise<string[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) {
    console.warn(`ページ取得失敗: ${url} (status: ${response.status})`)
    return []
  }

  const html = await response.text()
  const $ = load(html)

  // /mysteries/{slug} 形式のリンクを抽出（スラグは英数字8文字以上）
  const slugPattern = /^\/mysteries\/([A-Za-z0-9]{8,})$/
  const urls = new Set<string>()

  $('a[href]').each((_, el) => {
    const href = $(el).attr('href') || ''
    if (slugPattern.test(href)) {
      urls.add(`${BASE_URL}${href}`)
    }
  })

  return Array.from(urls)
}

/**
 * ページ数を取得（ページネーションリンクから最大ページ番号を読み取る）
 */
async function fetchTotalPages(url: string): Promise<number> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    },
  })

  if (!response.ok) return 1

  const html = await response.text()
  const $ = load(html)

  // ページネーションリンクから /page/{n} の最大値を取得
  let maxPage = 1
  $('a[href*="/page/"]').each((_, el) => {
    const href = $(el).attr('href') || ''
    const match = href.match(/\/page\/(\d+)/)
    if (match) {
      const page = parseInt(match[1], 10)
      if (page > maxPage) maxPage = page
    }
  })

  return maxPage
}

/**
 * ナゾヒロバのイベント詳細ページから公式サイトURLを取得する
 * 「〇〇の公式ページはこちら」というリンクを探す
 */
export async function fetchOfficialUrl(nazohirobaEventUrl: string): Promise<string | null> {
  try {
    const response = await fetch(nazohirobaEventUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
    })
    if (!response.ok) return null

    const html = await response.text()
    const $ = load(html)

    // 公式ページリンクを探す（SNS・アプリストア・Google系は除外）
    const EXCLUDE_DOMAINS = ['nazohiroba.com', 'twitter.com', 'x.com', 'instagram.com',
      'facebook.com', 'apple.com', 'google.com', 'youtube.com', 'line.me']

    let officialUrl: string | null = null

    $('a[href]').each((_, el) => {
      if (officialUrl) return // 見つかったら終了
      const href = $(el).attr('href') || ''
      if (!href.startsWith('http')) return
      const isExcluded = EXCLUDE_DOMAINS.some((d) => href.includes(d))
      if (!isExcluded) {
        officialUrl = href
      }
    })

    return officialUrl
  } catch {
    return null
  }
}

/**
 * 全対象ページからイベントURLを収集する
 * （東京/神奈川/埼玉/千葉 × 街歩き/周遊型/持ち帰りの全組み合わせ）
 */
export async function collectAllEventUrls(): Promise<string[]> {
  const allUrls = new Set<string>()

  for (const pref of TARGET_PREFECTURES) {
    for (const type of TARGET_TYPES) {
      const basePageUrl = `${BASE_URL}/mysteries/prefectures/${pref.code}/types/${type.code}`

      console.log(`[crawl] 巡回中: ${pref.name} × ${type.name} (${basePageUrl})`)

      // 1ページ目を取得しつつ総ページ数を確認
      const [firstPageUrls, totalPages] = await Promise.all([
        fetchEventUrlsFromPage(basePageUrl),
        fetchTotalPages(basePageUrl),
      ])

      firstPageUrls.forEach((u) => allUrls.add(u))
      console.log(`  → ページ1: ${firstPageUrls.length}件, 全${totalPages}ページ`)

      // 2ページ目以降を順次取得（サーバー負荷軽減のため直列）
      for (let page = 2; page <= totalPages; page++) {
        const pageUrl = `${basePageUrl}/page/${page}`
        const urls = await fetchEventUrlsFromPage(pageUrl)
        urls.forEach((u) => allUrls.add(u))
        console.log(`  → ページ${page}: ${urls.length}件`)

        // 連続リクエストを少し間隔をあける
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  console.log(`[crawl] 合計収集URL数: ${allUrls.size}件`)
  return Array.from(allUrls)
}
