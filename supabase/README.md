# Supabase データベースセットアップ

## Phase 1: データベース設計

このディレクトリには、NazoNoteアプリのデータベーススキーマが含まれています。

## ファイル構成

- `migrations/001_initial_schema.sql` - 初期テーブル作成とRLSポリシー

## セットアップ手順

### 1. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) にアクセスしてアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトの「SQL Editor」を開く

### 2. マイグレーションの実行

1. `migrations/001_initial_schema.sql` の内容をコピー
2. SupabaseのSQL Editorに貼り付け
3. 「Run」ボタンをクリックして実行

### 3. テーブルの確認

Supabaseの「Table Editor」で以下のテーブルが作成されていることを確認：

- `events` - イベント情報
- `user_event_logs` - ユーザーのお気に入り・参加ログ

## テーブル構造

### events テーブル

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | プライマリキー |
| title | text | イベント名 |
| url | text | 公式サイトURL（ユニーク） |
| image_url | text | サムネイル画像URL |
| start_date | date | 開始日 |
| end_date | date | 終了日（NULL可：常設の場合） |
| location | text | 場所・集合場所 |
| area | text | 都道府県・主要エリア |
| type | text | 周遊/ホール/ルーム/オンライン |
| maker | text | 制作元（ナゾヒロバの「制作元」欄。`/api/crawl/backfill-maker` で補完） |
| price | text | 価格情報 |
| description | text | ストーリー・概要 |
| is_purchased | boolean | **「行く予定」フラグ**（旧: チケット購入済み。2026-11 に意味を変更、列名はそのまま）。イベント単位なので全員で共有。「行った」を記録すると自動で false に戻る |
| is_deleted | boolean | 論理削除フラグ |
| created_by | uuid | 登録したユーザーID（auth.users参照） |
| created_at | timestamp | 作成日時 |
| updated_at | timestamp | 更新日時 |

### user_event_logs テーブル

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | プライマリキー |
| user_id | uuid | ユーザーID（auth.users参照） |
| event_id | uuid | イベントID（events参照） |
| status | text | 'FAVORITE'（お気に入り）または 'WENT'（行った） |
| result | text | 'CLEAR'（クリア）または 'FAIL'（失敗）、NULL可 |
| rating | integer | 1-5の評価（行った場合のみ） |
| memo | text | 内輪向けコメント |
| updated_at | timestamp | 更新日時 |

## セキュリティ（RLS）

Row Level Security (RLS) が有効化されており、以下のポリシーが設定されています：

### events テーブル
- **閲覧**: 全ユーザーが閲覧可能
- **作成**: 認証済みユーザーのみ
- **更新・削除**: 作成者のみ

### user_event_logs テーブル
- **閲覧**: 全ユーザーが閲覧可能（グループ内で共有）
- **作成・更新**: 自分のログのみ

## 便利なビュー

`events_with_stats` ビューが作成されており、以下を含みます：
- `favorite_count` - お気に入り登録数
- `went_count` - 参加者数
- `current_status` - 現在のステータス（開催中/開催予定/終了）
- `days_until_end` - 終了日までの残り日数

## 新しいテーブル/ビューを追加するときのテンプレ

> **重要 — 2026-10-30 以降の Supabase 仕様変更対応**
>
> 2026-10-30 以降、`public` スキーマに新規作成したテーブルは
> **明示的な GRANT を書かない限り Data API（supabase-js / PostgREST / GraphQL）から見えなくなる**。
> NazoNote は Data API を使っているため、新テーブル追加時は必ず以下のテンプレに沿うこと。
> 既存テーブル（`events`, `user_event_logs`, ビュー `events_with_stats`）は現状の権限が維持されるので触らなくてよい。
>
> 参考: https://github.com/orgs/supabase/discussions/45329

新規マイグレーション（例: `006_add_xxx.sql`）は次のひな形を使う:

```sql
-- 1. テーブル作成
CREATE TABLE IF NOT EXISTS public.your_table (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- ... カラム定義
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Data API 公開のための明示的 GRANT（2026-10-30 以降は省略不可）
GRANT SELECT ON public.your_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.your_table TO service_role;

-- 3. RLS を必ず有効化
ALTER TABLE public.your_table ENABLE ROW LEVEL SECURITY;

-- 4. 必要なポリシーを追加（例）
CREATE POLICY "Anyone can view"
    ON public.your_table
    FOR SELECT
    USING (true);

CREATE POLICY "Authenticated users can write"
    ON public.your_table
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
```

GRANT が抜けていると PostgREST が `42501` エラーで必要な GRANT 文を返してくれるので、エラーを見たらこのテンプレに戻る。

ビューを新規追加する場合も同様に `GRANT SELECT ON public.your_view TO anon, authenticated, service_role;` を書く。

### 既存ビュー `events_with_stats` を作り直すときも GRANT を書く

`DROP VIEW` → `CREATE VIEW` で作り直すと（`002_add_is_purchased.sql` の形）、Postgres 上は**新しいビュー**扱いになり、2026-10-30 以降は権限が付かない。
トップページ（`app/page.tsx`）と詳細ページ（`app/events/[id]/page.tsx`）はこのビューを読んでいるので、**両方とも表示できなくなる**。

- 列の並びを変えずに末尾へ足すだけなら `CREATE OR REPLACE VIEW` で済ませる（権限はそのまま残る）
- `DROP` が必要なときは、同じマイグレーションの最後に次を書く:

```sql
GRANT SELECT ON public.events_with_stats TO anon, authenticated, service_role;
```

## 次のステップ

Phase 1完了後、以下を実装：
- Phase 2: AI自動入力機能（URLから情報抽出）
- Phase 3: UI/UX磨き込み（お気に入り機能、デザイン適用）

