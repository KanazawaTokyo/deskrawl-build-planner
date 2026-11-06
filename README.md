# Deskrawl Build Planner

Stormcaller用の装備、宝石Tier 6、強化、候補比較、複数ビルドのWebアプリ。

## 公開URL（GitHub Pages有効化後）

`https://kanazawatokyo.github.io/deskrawl-build-planner/`

**GitHub Pagesで公開済み。** デプロイ元は `main` です。

## 公開済みのGitHub Pages構成（参考）

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


## クラウド同期（Supabase / GitHub認証）

公開用接続設定は `cloud-config.js`（URL + publishable keyのみ）で設定済みです。OAuth AppとSupabaseのProvider設定が有効化されるまでGitHubログインは機能しません。
同期の詳細な手順・データ保護・初回データ移行については [SUPABASE_SETUP.md](SUPABASE_SETUP.md) を参照してください。
同期中の競合を認識して利用者がローカルを維持すると、自動同期は止まり、明示的な解消までクラウドへ書き込みません。


### 固定セット保存 (2026-11-06)
- 全11部位が装備済みで固定状態の場合のみ、装備情報とビルド設定を名前付きで一式保存します。
- ヘッダー下の「固定セット」から選択・呼び出し・削除ができます。呼び出しは新規ビルドと独立した装備個体を作成し、元のビルドは上書きしません。
- 保存時の装備・宝石・強化値・ビルド設定はコピーされ、元装備を変更しても保存セットは変わりません。
- `lockedSets` は既存の `schemaVersion:1` JSONに追加され、Supabase同期とJSONバックアップの対象です。
