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
| maker | text | 制作団体 |
| price | text | 価格情報 |
| description | text | ストーリー・概要 |
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

## 次のステップ

Phase 1完了後、以下を実装：
- Phase 2: AI自動入力機能（URLから情報抽出）
- Phase 3: UI/UX磨き込み（お気に入り機能、デザイン適用）

