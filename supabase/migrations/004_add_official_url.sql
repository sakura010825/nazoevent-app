-- official_url カラムを events テーブルに追加
-- url: ナゾヒロバのイベントページURL（重複チェック用キー）
-- official_url: 実際のイベント公式サイトURL（「公式サイトで確認する」リンク用）
ALTER TABLE public.events
ADD COLUMN IF NOT EXISTS official_url TEXT;

-- events_with_stats ビューを再作成（official_url を含める）
DROP VIEW IF EXISTS public.events_with_stats;

CREATE OR REPLACE VIEW public.events_with_stats AS
SELECT
    e.*,
    COUNT(DISTINCT CASE WHEN uel.status = 'FAVORITE' THEN uel.user_id END) AS favorite_count,
    COUNT(DISTINCT CASE WHEN uel.status = 'WENT' THEN uel.user_id END) AS went_count,
    CASE
        WHEN e.end_date IS NULL THEN '開催中'
        WHEN CURRENT_DATE < e.start_date THEN '開催予定'
        WHEN CURRENT_DATE >= e.start_date AND CURRENT_DATE <= e.end_date THEN '開催中'
        WHEN CURRENT_DATE > e.end_date THEN '終了'
    END AS current_status,
    CASE
        WHEN e.end_date IS NOT NULL AND CURRENT_DATE <= e.end_date
        THEN e.end_date - CURRENT_DATE
        ELSE NULL
    END AS days_until_end
FROM public.events e
LEFT JOIN public.user_event_logs uel ON e.id = uel.event_id
GROUP BY e.id;
