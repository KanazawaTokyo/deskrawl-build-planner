# Deskrawl Build Planner — Supabase 接続手順 (v0.1)

GitHub Pages に公開済みの既存アプリへ GitHub ログインとクラウド同期を追加するための手順。Schedule App / Monthly Time Map の既存Supabaseプロジェクトには適用しないこと。

## 1. 専用プロジェクト

作成済み: **`deskrawl-build-planner`** / `KanazawaTokyo's Org` / `ap-northeast-1` (Tokyo) / ref=`unxqiwzgjexwbvjcspwo`。作成時の費用見積もりは月 $0。管理画面: https://supabase.com/dashboard/project/unxqiwzgjexwbvjcspwo

## 2. データベース

専用プロジェクトには [`supabase/schema.sql`](supabase/schema.sql) を **適用済み**。`public.planner_state` は、ログインユーザーごとに JSON ドキュメント1件を保存し、`revision` により同時更新競合を検出する。

- RLS（Row Level Security）を有効化する。
- SELECT/INSERT/UPDATE/DELETE は `auth.uid() = user_id` に限定。
- `anon` にテーブル権限を付けず、`authenticated` のみに権限を与える。
- **2026年以降の Data API 公開設定**：新しいテーブルは自動公開されない設定になり得るため、Data API の Exposed schemas / GRANT を確認する。`public` をAPI経由で利用できることとRLSでの所有者分離を両方検証する。
- テストとして `pg_policies` / `relrowsecurity` / `has_table_privilege` を確認。ログインした利用者AからBのデータを読み書きできないことも検証する。

## 3. GitHub OAuth

GitHub Developer Settings で OAuth App を登録する。

- Homepage URL: `https://kanazawatokyo.github.io/deskrawl-build-planner/`
- Authorization callback URL: `https://unxqiwzgjexwbvjcspwo.supabase.co/auth/v1/callback` （**GitHub OAuth Appに設定するURL**）
- GitHub OAuth App の Client ID / Client Secret は **Supabase の Authentication → Providers → GitHub** にだけ登録。
- Supabase Authentication → URL Configuration:
  - Site URL: `https://kanazawatokyo.github.io/deskrawl-build-planner/`
  - Redirect URL: `https://kanazawatokyo.github.io/deskrawl-build-planner/`
- OAuth Client SecretをGitHubリポジトリ・Issue・ChatGPTに貼り付けないこと。

公式: https://supabase.com/docs/guides/auth/social-sign-in/auth-github
公式: https://supabase.com/docs/guides/auth/redirect-urls

## 4. 公開用の接続設定

`cloud-config.js` の `window.DBP_CLOUD_CONFIG` には **Supabase URL とpublishable keyが設定済み**です。公開用キーであり、RLSによってデータを保護します。

```javascript
window.DBP_CLOUD_CONFIG = {
  url: 'https://unxqiwzgjexwbvjcspwo.supabase.co',
  key: 'sb_publishable_...（公開用キーは cloud-config.js を参照）'
};
```

**絶対にコミットしない**: `service_role`、`sb_secret_...`、GitHub OAuth Client Secret、DBパスワード。

`node test.js && node test-gems.js && node test-cloud.js && node scripts/build.js` を実行。GitHub Actions はテスト後に `dist/index.html` をGitHub Pagesへ自動公開する。

## 5. 初回データ移行

1. 旧ブラウザの装備データを **JSONバックアップ（⇩）** で保存する。
2. 新版の同じURLを開く。接続設定が入っていればクラウド画面からGitHubログインする。
3. 既存クラウドが空ならローカルデータを初期アップロード。クラウドにデータがあれば、上書きされる前に確認画面が出る。
4. 別端末で同じGitHubアカウントからログインし、クラウドのデータを読み込む。
5. 二端末で同時に編集した場合、revision不一致は**競合として自動同期を停止**。どちらのデータを採用するか判断する前にローカルJSONバックアップを保存する。

## 6. 稼働テスト（公開後必須）

- GitHubログイン→ログアウト→再ログインできる。
- 既存の装備・宝石・Divine・複数ビルドを移行できる。
- PC側でOPを更新後、iPhone側の再読込で同じ値になる。
- 同時更新で古い revision からのPATCHが0件になり、上書きされず競合表示される。
- 別ユーザーからRLSでデータが見えない。
- クラウド接続不可でもローカルデータとJSONバックアップが保持される。

## 参照と制約

SupabaseのOAuth / Data API設定は2026年現在の公式資料に従って最終確認する。ゲームの数値計算は今回の変更対象ではない。専用プロジェクトの作成・OAuth Secret登録・実端末ログイン試験が完了するまではクラウド同期の本番稼働を主張しない。

## 現在の作業状態 (2026-11-06)

- ✅ Supabase の専用プロジェクト新規作成 / 東京 / $0。
- ✅ `planner_state` のRLS有効化、SELECT/INSERT/UPDATE/DELETEの本人制限、`anon`読み取り不可、Security Advisor指摘0件。
- ✅ 公開用 URL + publishable key を `cloud-config.js` に設定。
- ✅ ローカルの同期競合防止テスト、ビルドテスト。
- ⏳ GitHub OAuth App の新規登録はアカウントの Developer settings 管理画面で行う必要がある。
- ⏳ Client SecretをSupabase Authentication/Providers/GitHubに安全に設定し、URL Configuration を登録する必要がある。
- ⏳ ChatGPT GitHub Appのインストール対象にこの公開リポジトリを追加してからコミット・自動公開。
- ⏳ 実際のGitHubログイン / PC・iPhone同期 / RLSの別ユーザー実機テスト。

GitHub OAuth App: https://github.com/settings/applications/new
GitHub App access: https://github.com/settings/installations/160283989
Supabase providers: https://supabase.com/dashboard/project/unxqiwzgjexwbvjcspwo/auth/providers
Supabase URL Configuration: https://supabase.com/dashboard/project/unxqiwzgjexwbvjcspwo/auth/url-configuration
