# Deskrawl Build Planner

Stormcaller用の装備、宝石Tier 6、強化、候補比較、複数ビルドのWebアプリ。

## 公開URL（GitHub Pages有効化後）

`https://kanazawatokyo.github.io/deskrawl-build-planner/`

**まだ公開されていません。** リポジトリ作成とGitHub Pagesの設定後に有効になります。

## 初回設定（GitHub）

1. GitHubの https://github.com/new で、`KanazawaTokyo/deskrawl-build-planner` を作成。無料のGitHub Pagesを使う場合は通常 **Public** リポジトリが必要です。公開前にソース内の初期ビルド例も公開される点を確認してください。
2. 本フォルダのファイル・フォルダをGitHubの新規リポジトリへコミット。ChatGPTからコミットする場合は、新規リポジトリを作成してそのURLを知らせてください。
3. `Settings` → `Pages` → `Build and deployment` → `Source` にて **GitHub Actions** を選択します。
4. `Actions` にある `Test and deploy Deskrawl Build Planner` ワークフローの成功を確認します。
5. 公開URLにアクセスします。以後はGitHubの `main` にプッシュするたびにテスト→Webサイトが自動更新されます。ブラウザの再読込で最新版を確認できます。

## 開発

- `index.source.html`, `styles.css`, `master.js`, `calc.js`, `app.js` が編集元。
- `node test.js && node test-gems.js` でデータと比較処理をテスト。
- `node scripts/build.js` で静的Webサイト `dist/index.html` を生成。
- `.github/workflows/pages.yml` が毎回テスト・ビルド・Pages公開を実行。
- **`index.html` は旧HTMLファイル互換のスナップショットです。GitHub Pagesで配信するのは生成された `dist/index.html` です。**

## 既存データ移行

以前のローカルHTMLで入力した情報は、公開URLへ自動移行しません。旧HTMLの `⇩` ボタンでJSONをエクスポートし、公開URLの `⇧` ボタンで**初回だけ**取り込みます。

GitHub Pages利用時点では**ブラウザ内保存**です。別PC・iPhone・iPadへ自動同期されません。GitHubへのコード保存とSupabaseによるビルドデータのクラウド同期は別の機能であり、後者は未設定です。

## セキュリティ

- リポジトリがPublicなら、ソースコードと初期のStormcaller構成例は公開されます。現在のブラウザで保存した装備データはGitHubにコミットされません。
- `.env`、Supabase Secret Key、GitHub OAuth Client SecretなどをGitHubにアップロードしないでください。
- GitHub OAuthとSupabase連携は別途構築が必要です。現在、GitHub Pagesへ公開するだけではログインや端末間同期は有効になりません。
- 現在のゲーム数値には公開データ由来の推定値を含みます。計算式は実測と照合してください。
