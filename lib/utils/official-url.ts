/**
 * 公式サイトURL（official_url）の妥当性判定
 *
 * ナゾヒロバの詳細ページには公式ページリンクより手前に「PR」表記の広告バナーが
 * 差し込まれている。これが official_url として保存されないよう、判定ロジックを
 * ここに集約する。
 */

/**
 * 広告バナーのドメイン
 * 公式URLとして絶対に採用せず、既存データも洗い替えの対象にする
 */
export const AD_DOMAINS = ['futariwari.com']

/**
 * クロール時に公式URLとして採用しないドメイン
 * 広告に加え、ナゾヒロバ自身（url カラムと重複）とアプリストア誘導を除く
 */
const NON_OFFICIAL_DOMAINS = [...AD_DOMAINS, 'nazohiroba.com', 'apps.apple.com', 'play.google.com']

function matchesDomain(url: string, domains: string[]): boolean {
  let hostname: string
  try {
    hostname = new URL(url).hostname.toLowerCase()
  } catch {
    return true // URLとして解釈できない文字列は採用しない
  }
  return domains.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))
}

/**
 * 広告ページのURLかどうか（表示時のガード・既存データの洗い替え判定に使用）
 */
export function isAdUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return matchesDomain(url, AD_DOMAINS)
}

/**
 * クロール結果を公式URLとして採用できないかどうか
 */
export function isNonOfficialUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return matchesDomain(url, NON_OFFICIAL_DOMAINS)
}

/**
 * 表示に使える公式サイトURLだけを返す（広告URLなら null）
 * 手動で登録されたURLを壊さないよう、判定は広告ドメインのみに限定する
 */
export function sanitizeOfficialUrl(url: string | null | undefined): string | null {
  if (!url) return null
  return isAdUrl(url) ? null : url
}
