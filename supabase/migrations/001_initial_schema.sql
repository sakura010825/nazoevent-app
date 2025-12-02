-- NazoNote データベーススキーマ
-- Phase 1: 初期テーブル作成

-- ============================================
-- 1. events テーブル
-- イベントの基本情報（グループ共有マスタデータ）
-- ============================================
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    image_url TEXT,
    start_date DATE NOT NULL,
    end_date DATE, -- NULL可：常設の場合
    location TEXT,
    area TEXT, -- 都道府県・主要エリア（タグ用）
    type TEXT, -- 周遊/ホール/ルーム/オンライン
    maker TEXT, -- 制作団体（SCRAPなど）
    price TEXT, -- 価格情報（テキストで柔軟に）
    description TEXT, -- ストーリー・概要
    created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックス作成（検索・ソート用）
CREATE INDEX IF NOT EXISTS idx_events_start_date ON public.events(start_date);
CREATE INDEX IF NOT EXISTS idx_events_end_date ON public.events(end_date);
CREATE INDEX IF NOT EXISTS idx_events_area ON public.events(area);
CREATE INDEX IF NOT EXISTS idx_events_type ON public.events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_by ON public.events(created_by);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON public.events(created_at DESC);

-- updated_at の自動更新トリガー
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON public.events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 2. user_event_logs テーブル
-- 各ユーザーのステータス管理（お気に入り/行った）
-- ============================================
CREATE TABLE IF NOT EXISTS public.user_event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('FAVORITE', 'WENT')),
    result TEXT CHECK (result IN ('CLEAR', 'FAIL')), -- 行った場合のみ
    rating INTEGER CHECK (rating >= 1 AND rating <= 5), -- 1-5（行った場合のみ）
    memo TEXT, -- 内輪向けコメント
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- 1ユーザー1イベントにつき、1つのステータス（FAVORITE or WENT）のみ
    UNIQUE(user_id, event_id, status)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_user_event_logs_user_id ON public.user_event_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_event_id ON public.user_event_logs(event_id);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_status ON public.user_event_logs(status);
CREATE INDEX IF NOT EXISTS idx_user_event_logs_updated_at ON public.user_event_logs(updated_at DESC);

-- updated_at の自動更新トリガー
CREATE TRIGGER update_user_event_logs_updated_at
    BEFORE UPDATE ON public.user_event_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 3. Row Level Security (RLS) ポリシー
-- Supabaseのセキュリティ設定
-- ============================================

-- events テーブルのRLS有効化
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがイベントを閲覧可能
CREATE POLICY "Anyone can view events"
    ON public.events
    FOR SELECT
    USING (true);

-- 認証済みユーザーのみイベントを作成可能
CREATE POLICY "Authenticated users can create events"
    ON public.events
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- 作成者のみイベントを更新可能
CREATE POLICY "Users can update their own events"
    ON public.events
    FOR UPDATE
    USING (auth.uid() = created_by);

-- 作成者のみイベントを削除可能
CREATE POLICY "Users can delete their own events"
    ON public.events
    FOR DELETE
    USING (auth.uid() = created_by);

-- user_event_logs テーブルのRLS有効化
ALTER TABLE public.user_event_logs ENABLE ROW LEVEL SECURITY;

-- 全ユーザーがログを閲覧可能（グループ内で共有）
CREATE POLICY "Anyone can view event logs"
    ON public.user_event_logs
    FOR SELECT
    USING (true);

-- 認証済みユーザーは自分のログを作成・更新可能
CREATE POLICY "Users can manage their own logs"
    ON public.user_event_logs
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 4. 便利なビュー（オプション）
-- ============================================

-- イベント一覧用ビュー（お気に入り数、参加者数を含む）
CREATE OR REPLACE VIEW public.events_with_stats AS
SELECT 
    e.*,
    COUNT(DISTINCT CASE WHEN uel.status = 'FAVORITE' THEN uel.user_id END) AS favorite_count,
    COUNT(DISTINCT CASE WHEN uel.status = 'WENT' THEN uel.user_id END) AS went_count,
    -- 現在の日付に基づくステータス判定
    CASE 
        WHEN e.end_date IS NULL THEN '開催中'
        WHEN CURRENT_DATE < e.start_date THEN '開催予定'
        WHEN CURRENT_DATE >= e.start_date AND CURRENT_DATE <= e.end_date THEN '開催中'
        WHEN CURRENT_DATE > e.end_date THEN '終了'
    END AS current_status,
    -- 終了日までの残り日数
    CASE 
        WHEN e.end_date IS NOT NULL AND CURRENT_DATE <= e.end_date 
        THEN e.end_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_end
FROM public.events e
LEFT JOIN public.user_event_logs uel ON e.id = uel.event_id
GROUP BY e.id;

-- コメント: このビューは後でクエリを簡潔にするために使用できます

