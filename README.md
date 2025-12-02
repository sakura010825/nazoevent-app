# NazoNote - 謎解きイベント収集・共有アプリ

「次の週末、どこ行く？」をURLひとつで解決する、ポップで賢い謎解きイベントストックアプリ。

## 技術スタック

- **Frontend:** Next.js 14 (App Router), React, TypeScript
- **Styling:** Tailwind CSS, Lucide React
- **Backend:** Supabase (PostgreSQL, Auth, Edge Functions)
- **Font:** M PLUS Rounded 1c

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. Supabaseプロジェクトのセットアップ

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. SQL Editorで `supabase/migrations/001_initial_schema.sql` を実行
3. プロジェクトの「Settings」→「API」から以下を取得：
   - Project URL
   - anon/public key

### 3. 環境変数の設定

`.env.local` ファイルを作成し、以下を設定：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

**Gemini APIキーの取得方法:**
1. [Google AI Studio](https://makersuite.google.com/app/apikey) にアクセス
2. 「Create API Key」をクリック
3. 生成されたAPIキーをコピーして `.env.local` に設定

### 4. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開いてアプリを確認できます。

## 機能

### Phase 1 ✅
- ✅ イベント一覧表示（カード形式）
- ✅ 手動でのイベント登録
- ✅ お気に入り機能（ハートボタン）
- ✅ フィルター機能（すべて/お気に入り/開催中、エリア別）
- ✅ ステータスバッジ（開催中/終了間近/開催予定）

### Phase 2 ✅
- ✅ AI自動入力機能（URLから情報抽出）
  - URLを入力して「自動入力」ボタンをクリック
  - Gemini 1.5 FlashがHTMLを解析してイベント情報を自動抽出
  - 抽出された情報がフォームに自動入力される

### Phase 3 ✅
- ✅ 紙吹雪エフェクト（登録完了時の演出）
- ✅ ハートボタンのアニメーション改善
- ✅ 「行った」機能の実装（クリア/失敗、評価、メモ）
- ✅ カードホバーエフェクトとトランジションの改善
- ✅ レスポンシブデザインの最適化（モバイル対応）

## 完成した機能

すべてのPhaseが完了しました！🎉

## プロジェクト構造

```
nazoevent-app/
├── app/
│   ├── layout.tsx          # ルートレイアウト
│   ├── page.tsx             # ホームページ
│   └── globals.css          # グローバルスタイル
├── components/
│   ├── EventList.tsx         # イベント一覧
│   ├── EventCard.tsx        # イベントカード
│   ├── AddEventButton.tsx   # 追加ボタン
│   └── AddEventModal.tsx    # 登録モーダル
├── lib/
│   ├── supabase/            # Supabaseクライアント
│   └── utils/               # ユーティリティ関数
├── types/                   # TypeScript型定義
└── supabase/
    └── migrations/          # データベースマイグレーション
```

## デプロイ手順（Vercel）

### 1. GitHubにプッシュ

```bash
# Gitリポジトリを初期化（まだの場合）
git init

# ファイルを追加
git add .

# コミット
git commit -m "Initial commit"

# GitHubでリポジトリを作成後、リモートを追加
git remote add origin https://github.com/your-username/nazoevent-app.git

# プッシュ
git push -u origin main
```

### 2. Vercelにプロジェクトを追加

1. [Vercel](https://vercel.com) にアクセスしてログイン
2. 「Add New Project」をクリック
3. GitHubリポジトリを選択
4. プロジェクト設定：
   - **Framework Preset**: Next.js
   - **Root Directory**: `./` (デフォルト)
   - **Build Command**: `npm run build` (デフォルト)
   - **Output Directory**: `.next` (デフォルト)

### 3. 環境変数の設定

Vercelのプロジェクト設定で、以下の環境変数を追加：

**Settings** → **Environment Variables** から以下を追加：

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GEMINI_API_KEY=your_gemini_api_key
```

**重要：**
- すべての環境（Production, Preview, Development）に設定してください
- `NEXT_PUBLIC_` で始まる変数はクライアント側でも使用されるため、公開されても問題ない値のみを設定してください

### 4. デプロイ

1. 「Deploy」ボタンをクリック
2. ビルドが完了するまで待機（通常1-2分）
3. デプロイ完了後、表示されたURLでアプリにアクセス

### 5. カスタムドメインの設定（オプション）

1. **Settings** → **Domains** に移動
2. カスタムドメインを入力
3. DNS設定を指示に従って更新

## トラブルシューティング

### ビルドエラーが発生する場合

- 環境変数が正しく設定されているか確認
- ビルドログを確認してエラーの詳細を確認
- ローカルで `npm run build` を実行してエラーを確認

### 画像が表示されない場合

- 一部のイベントで画像URLが正しく取得できない場合があります
- 手動で画像URLを編集するか、再度AI自動入力を試してください

### 認証エラーが発生する場合

- SupabaseのURLとキーが正しく設定されているか確認
- Supabaseのプロジェクトで認証が有効になっているか確認

## ライセンス

MIT

