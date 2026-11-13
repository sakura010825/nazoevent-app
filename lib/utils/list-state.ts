/**
 * 一覧 → 詳細 → 戻る で、一覧の「選んでいたタブ」と「スクロール位置」に戻すための状態保存。
 * タブ・エリアは URL のクエリ（?tab=going&area=千葉）に持たせ、スクロール位置だけ sessionStorage に置く。
 * sessionStorage はブラウザのタブごとに独立し、閉じれば消える。
 */

const STORAGE_KEY = 'nazonote:list-state'
// これより古い保存位置は使わない（翌日に開き直したときなどに変な位置へ飛ばないように）
const MAX_AGE_MS = 6 * 60 * 60 * 1000

interface ListState {
  /** 一覧ページの URL（パス + クエリ） */
  listUrl: string
  /** 一覧のスクロール位置 */
  scrollY: number
  /** 開いた詳細ページのパス */
  openedPath: string
  savedAt: number
}

function currentUrl(): string {
  return window.location.pathname + window.location.search
}

function read(): ListState | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const state = JSON.parse(raw) as ListState
    if (Date.now() - state.savedAt > MAX_AGE_MS) return null
    return state
  } catch {
    return null
  }
}

/** 一覧からイベント詳細を開く直前に呼ぶ */
export function saveListState(openedPath: string): void {
  try {
    const state: ListState = {
      listUrl: currentUrl(),
      scrollY: window.scrollY,
      openedPath,
      savedAt: Date.now(),
    }
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // プライベートモード等で使えない場合は位置の復元を諦める
  }
}

/**
 * 一覧の表示時に呼ぶ。今の URL が保存したときの一覧と同じなら、戻すべきスクロール位置を返す。
 * 一度使ったら消す（リロードで毎回同じ位置に飛ばないように）
 */
export function takeListScroll(): number | null {
  const state = read()
  if (!state || state.listUrl !== currentUrl()) return null
  try {
    window.sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // 無視
  }
  return state.scrollY
}

/** 詳細ページの「戻る」用。直前に開いていた一覧の URL と、その一覧から直接来たかどうか */
export function getReturnTarget(): { listUrl: string; cameFromList: boolean } | null {
  const state = read()
  if (!state) return null
  return { listUrl: state.listUrl, cameFromList: state.openedPath === window.location.pathname }
}
