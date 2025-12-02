# デプロイ手順 - NazoNote

このドキュメントでは、NazoNoteアプリをVercelにデプロイする手順を説明します。

## 前提条件

- GitHubアカウント
- Vercelアカウント（GitHubでサインアップ可能）
- Supabaseプロジェクト（既にセットアップ済み）
- Gemini APIキー（既に取得済み）

## ステップ1: GitHubにプッシュ

### 1-1. Gitリポジトリの初期化（まだの場合）

```bash
cd nazoevent-app
git init
```

### 1-2. ファイルを追加してコミット

```bash
git add .
git commit -m "Initial commit: NazoNote app"
```

### 1-3. GitHubでリポジトリを作成

1. [GitHub](https://github.com) にアクセス
2. 「New repository」をクリック
3. リポジトリ名を入力（例: `nazoevent-app`）
4. 「Create repository」をクリック

### 1-4. リモートを追加してプッシュ

```bash
git remote add origin https://github.com/your-username/nazoevent-app.git
git branch -M main
git push -u origin main
```

## ステップ2: Vercelにプロジェクトを追加

### 2-1. Vercelにログイン

1. [Vercel](https://vercel.com) にアクセス
2. 「Sign Up」または「Log In」をクリック
3. GitHubアカウントでログイン（推奨）

### 2-2. 新しいプロジェクトを作成

1. ダッシュボードで「Add New Project」をクリック
2. GitHubリポジトリを選択（`nazoevent-app`）
3. 「Import」をクリック

### 2-3. プロジェクト設定

以下の設定を確認（通常は自動検出されます）：

- **Framework Preset**: Next.js
- **Root Directory**: `./` (デフォルト)
- **Build Command**: `npm run build` (デフォルト)
- **Output Directory**: `.next` (デフォルト)
- **Install Command**: `npm install` (デフォルト)

## ステップ3: 環境変数の設定

### 3-1. 環境変数の追加

1. プロジェクト設定画面で「Environment Variables」セクションを開く
2. 以下の3つの環境変数を追加：

#### 変数1: Supabase URL
- **Key**: `NEXT_PUBLIC_SUPABASE_URL`
- **Value**: SupabaseプロジェクトのURL（例: `https://xxxxx.supabase.co`）
- **Environment**: Production, Preview, Development すべてにチェック

#### 変数2: Supabase Anon Key
- **Key**: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- **Value**: Supabaseのanon/public key
- **Environment**: Production, Preview, Development すべてにチェック

#### 変数3: Gemini API Key
- **Key**: `GEMINI_API_KEY`
- **Value**: Gemini APIキー
- **Environment**: Production, Preview, Development すべてにチェック

### 3-2. 環境変数の確認

各変数を追加したら、「Add」ボタンをクリックして保存してください。

**重要：**
- `NEXT_PUBLIC_` で始まる変数はクライアント側でも使用されます
- 機密情報は `NEXT_PUBLIC_` を付けない変数名にしてください（`GEMINI_API_KEY`は正しい）

## ステップ4: デプロイ

### 4-1. デプロイの実行

1. 環境変数を設定したら、「Deploy」ボタンをクリック
2. ビルドが開始されます（通常1-2分）

### 4-2. デプロイの確認

1. ビルドログを確認してエラーがないか確認
2. デプロイが完了すると、URLが表示されます（例: `https://nazoevent-app.vercel.app`）
3. 表示されたURLをクリックしてアプリにアクセス

### 4-3. 動作確認

1. アプリが正常に表示されるか確認
2. ログイン機能が動作するか確認
3. イベント追加機能が動作するか確認
4. AI自動入力機能が動作するか確認

## ステップ5: カスタムドメインの設定（オプション）

### 5-1. ドメインの追加

1. Vercelのプロジェクト設定で「Settings」→「Domains」に移動
2. カスタムドメインを入力（例: `nazonote.com`）
3. 「Add」をクリック

### 5-2. DNS設定

1. ドメインのDNS設定を開く
2. Vercelが表示するDNSレコードを追加：
   - **Type**: A または CNAME
   - **Name**: @ または www
   - **Value**: Vercelが提供する値

3. DNS設定の反映を待つ（通常数分〜数時間）

## トラブルシューティング

### ビルドエラー

**エラー**: `Module not found` や `Cannot find module`

**解決策**:
- `package.json` にすべての依存関係が含まれているか確認
- ローカルで `npm install` と `npm run build` を実行してエラーを確認

### 環境変数エラー

**エラー**: `GEMINI_API_KEY is not set` や `Supabase URL is not set`

**解決策**:
- Vercelの環境変数設定を確認
- すべての環境（Production, Preview, Development）に設定されているか確認
- 変数名にタイポがないか確認

### 認証エラー

**エラー**: `Auth session missing` や `Invalid API key`

**解決策**:
- SupabaseのURLとキーが正しいか確認
- Supabaseのプロジェクトで認証が有効になっているか確認
- RLS（Row Level Security）ポリシーが正しく設定されているか確認

### 画像が表示されない

**問題**: 一部のイベントで画像が表示されない

**解決策**:
- これは既知の問題です。画像URLが正しく取得できない場合があります
- 手動で画像URLを編集するか、再度AI自動入力を試してください
- 将来的に改善予定です

## 次のステップ

デプロイが完了したら：

1. 友人にURLを共有
2. フィードバックを収集
3. 必要に応じて改善を実装

## サポート

問題が発生した場合：

1. Vercelのビルドログを確認
2. ブラウザの開発者ツール（F12）でエラーを確認
3. Supabaseのログを確認

