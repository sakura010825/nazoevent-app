-- 所要時間カラムを追加（テキスト形式で柔軟に対応）
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS duration_text TEXT;

-- インデックス作成（オプション）
CREATE INDEX IF NOT EXISTS idx_events_duration_text ON public.events(duration_text);

-- RLSポリシーの変更: 認証済みユーザーは誰でも更新・削除可能に
-- 既存のポリシーを削除（古いポリシーと新しいポリシーの両方）
DROP POLICY IF EXISTS "Users can update their own events" ON public.events;
DROP POLICY IF EXISTS "Users can delete their own events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can update events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users can delete events" ON public.events;

-- 新しいポリシー: 認証済みユーザーは誰でも更新可能
CREATE POLICY "Authenticated users can update events"
    ON public.events
    FOR UPDATE
    USING (auth.role() = 'authenticated');

-- 新しいポリシー: 認証済みユーザーは誰でも削除可能
CREATE POLICY "Authenticated users can delete events"
    ON public.events
    FOR DELETE
    USING (auth.role() = 'authenticated');

-- events_with_stats ビューを再作成（duration_textを含める）
DROP VIEW IF EXISTS public.events_with_stats;

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

