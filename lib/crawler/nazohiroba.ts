import { load } from 'cheerio'
import { isNonOfficialUrl } from '@/lib/utils/official-url'

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
 * ナゾヒロバのイベント詳細ページから開催場所を取得する
 * 詳細情報テーブルの「場所」行から値を抽出
 */
export async function fetchLocationFromNazohiroba(nazohirobaEventUrl: string): Promise<string | null> {
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

    // .MysteryFiltersRow-title が「場所」の行を探し、同じ行の .MysteryFiltersRow-text を取得
    let location: string | null = null
    $('.MysteryFiltersRow').each((_, row) => {
      const title = $(row).find('.MysteryFiltersRow-title').text().trim()
      if (title === '場所') {
        const text = $(row).find('.MysteryFiltersRow-text').text().trim()
        if (text) location = text
      }
    })

    return location
  } catch {
    return null
  }
}

// cheerio と @types/cheerio でエクスポート名が異なるため load() の戻り値から型を取る
type CheerioRoot = ReturnType<typeof load>

// 「『〇〇』の公式ページはこちら」形式のリンク文言
const OFFICIAL_LINK_TEXT = /公式(ページ|サイト)(は)?こちら/
// 「PR」表記の広告枠（fw-ad / futariwari-ad-section など）
const AD_CONTAINER_SELECTOR = '[class*="fw-ad"], [class*="ad-section"], [class*="ad__"]'

/**
 * リンク文言から公式ページリンクを探す（マークアップ変更時のフォールバック）
 * 広告枠（rel="sponsored" / PRバナー内）のリンクは除外する
 */
function findOfficialLinkByText($: CheerioRoot): string | undefined {
  let found: string | undefined

  $('a[href^="http"]').each((_, el) => {
    if (found) return
    const link = $(el)
    const rel = link.attr('rel') || ''
    if (rel.split(/\s+/).includes('sponsored')) return
    if (link.closest(AD_CONTAINER_SELECTOR).length > 0) return
    if (OFFICIAL_LINK_TEXT.test(link.text().replace(/\s+/g, ''))) {
      found = link.attr('href')
    }
  })

  return found
}

/**
 * ナゾヒロバのイベント詳細ページから公式サイトURLを取得する
 *
 * 詳細ページ下部の「『〇〇』の公式ページはこちら」ボタン（.official-button-container）
 * だけを対象にする。ページ内には公式リンクより手前に「PR」表記の広告バナー
 * （futariwari 等）が差し込まれているため、外部リンクを先頭から拾う方式では
 * 広告ページを公式URLとして誤登録してしまう。
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

    const candidates = [
      $('.official-button-container a[href^="http"]').first().attr('href'),
      $('a.official-button[href^="http"]').first().attr('href'),
      findOfficialLinkByText($),
    ]

    for (const href of candidates) {
      if (href && !isNonOfficialUrl(href)) return href
    }

    // 公式サイトが無いイベントもあるため、見つからなければ null を返す
    // （イベント詳細画面ではナゾヒロバのページにフォールバックする）
    return null
  } catch {
    return null
  }
}

// ターゲット都道府県名のセット（フィルタリング用）
export const TARGET_PREFECTURE_NAMES = TARGET_PREFECTURES.map((p) => p.name)

/**
 * 全対象ページからイベントURLを収集する
 * （東京/神奈川/埼玉/千葉 × 街歩き/周遊型/持ち帰りの全組み合わせ）
 * 各URLにはクロール元の都道府県名を紐付けて返す
 */
export async function collectAllEventUrls(): Promise<{ url: string; crawledPrefecture: string }[]> {
  const urlMap = new Map<string, string>() // url -> crawledPrefecture（最初に見つかったもの優先）

  for (const pref of TARGET_PREFECTURES) {
    for (const type of TARGET_TYPES) {
      const basePageUrl = `${BASE_URL}/mysteries/prefectures/${pref.code}/types/${type.code}`

      console.log(`[crawl] 巡回中: ${pref.name} × ${type.name} (${basePageUrl})`)

      // 1ページ目を取得しつつ総ページ数を確認
      const [firstPageUrls, totalPages] = await Promise.all([
        fetchEventUrlsFromPage(basePageUrl),
        fetchTotalPages(basePageUrl),
      ])

      firstPageUrls.forEach((u) => { if (!urlMap.has(u)) urlMap.set(u, pref.name) })
      console.log(`  → ページ1: ${firstPageUrls.length}件, 全${totalPages}ページ`)

      // 2ページ目以降を順次取得（サーバー負荷軽減のため直列）
      for (let page = 2; page <= totalPages; page++) {
        const pageUrl = `${basePageUrl}/page/${page}`
        const urls = await fetchEventUrlsFromPage(pageUrl)
        urls.forEach((u) => { if (!urlMap.has(u)) urlMap.set(u, pref.name) })
        console.log(`  → ページ${page}: ${urls.length}件`)

        // 連続リクエストを少し間隔をあける
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }

  console.log(`[crawl] 合計収集URL数: ${urlMap.size}件`)
  return Array.from(urlMap.entries()).map(([url, crawledPrefecture]) => ({ url, crawledPrefecture }))
}
