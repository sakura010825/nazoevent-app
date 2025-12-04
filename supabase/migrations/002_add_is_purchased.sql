-- is_purchased カラムを events テーブルに追加
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS is_purchased BOOLEAN DEFAULT FALSE;

-- インデックス作成（購入済みフィルター用）
CREATE INDEX IF NOT EXISTS idx_events_is_purchased ON public.events(is_purchased);

-- events_with_stats ビューを更新して is_purchased を含める
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

