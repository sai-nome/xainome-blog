# WordPress → Hugo 301リダイレクト

## 対応表

[wordpress-redirects.csv](wordpress-redirects.csv) に旧URL・現URL・HTTPステータス・WordPress ID・記事名・照合方法・Hugoのファイルを記録しています。Excelで開けるUTF-8 BOM付きCSVです。

- 元データ: WordPress.2026-10-31.xml
- 対象: 公開記事261件、公開固定ページ4件、計265件。未対応0件。
- 263件はタイトルの完全一致。残り2件は本文を照合して明示的に対応付けました。
  - ID 4395: 献血記事。タイトル変更あり。同じ400mL献血の体験・写真・本文を確認。
  - ID 4402: Wellington / Te Papa記事。タイトルと公開日が異なるため、同じ英語本文・展示内容から確認。
- 非公開記事、添付ファイル、コメント、著者情報、プラグイン用データは移行データに含めていません。XML自体はGitに登録しません。
- Hugoで新規作成された記事に、推測したWordPress旧URLは割り当てていません。

## 動作

Cloudflare Workerのworker/index.mjsが静的ファイルより先に実行され、対応するURLにHTTP 301とLocationヘッダーを返します。転送先はHugoの「hugo list published」が返す正規URLです。

- WordPressの旧パーマリンク、日本語のURLエンコードの大文字・小文字、末尾スラッシュの有無に対応。
- /?p=記事ID、/?page_id=固定ページID、/index.php?p=記事ID等にも対応。IDパラメータは転送先から除去し、UTM等は維持。
- Hugoが生成した既存のmeta refreshページも検出し、HTTP 301で最終URLへ直接転送。/index.html形式にも対応。
- 該当しないURLは通常の静的配信へ渡す。未知のWordPress IDは404。全404をトップページへ転送するルールはありません。
- GET / HEADのみ転送。POST等は静的配信の既存動作に渡します。
- run_worker_first: trueは必須です。無効にするとホームページや既存のalias HTMLが先に200で返り、ID転送や301が機能しません。静的ファイルのリクエストもWorkerを通るため、Workerの使用量に含まれます。

_redirectsではクエリパラメータによる照合ができないため、Workerで一元処理しています。
[Cloudflare: Redirects](https://developers.cloudflare.com/workers/static-assets/redirects/)
[Cloudflare: Configuration and Bindings](https://developers.cloudflare.com/workers/static-assets/binding/)

Googleは移転に恒久的なサーバー側リダイレクトを推奨しています。再クロール・検索結果更新の完了は301の実装だけでは確認できません。
[Google: Redirects and Google Search](https://developers.google.com/search/docs/crawling-indexing/301-redirects)

## 再生成・検証

通常のビルドにはNode.jsとHugoを使用します。PythonはWordPressのXMLを取り込み直すときだけ必要です。

~~~sh
npm run build
npm run test:redirects
~~~

ビルド時にHugoが出力したHTMLとsitemap.xmlを照合し、対応先の未公開・削除、転送ループ、転送チェーン、競合があれば失敗します。worker/redirects.jsonとCSVを再生成するため、記事のslugを変更しても元ファイルとの対応から追従します。ファイル自体を移動した場合はmigration/wordpress-urls.jsonのcontentFileも更新します。

XMLから照合をやり直す場合:

~~~sh
python -X utf8 scripts/redirects/import-wordpress.py /path/to/WordPress.2026-10-31.xml
npm run build
npm run test:redirects
~~~

新しいXMLに一致しない記事があると取り込みは停止します。推測で転送せず、内容を確認して対応付けてください。

## 本番反映と独自ドメイン

GitHubへのpushとCloudflareへの反映は別です。CloudflareのGit連携が有効なら、mainのビルド・デプロイ結果を確認します。手動の場合は認証済み環境でnpm run deployを実行します。

公開DNSで解決したCloudflareのIPへTLSのホスト名を維持して接続し、修正前の本番で旧URL /hello-world/ が404、新しい献血記事URLとsitemap.xmlが200であることを確認しました。独自ドメインの配信先はHugoです。

このPCのWindows hostsファイルには、xainome.blogとwww.xainome.blogを旧WordPressサーバーへ向ける固定設定がありました。そのため、このPCの通常のHTTPアクセスでは旧WordPressが表示されます。本番確認はhostsを使わない接続で行ってください。移行元の閲覧に使っている可能性があるため、hostsは変更していません。この固定設定はGoogle側のアクセスには影響しません。

この作業環境にはCloudflare CLIの認証がありません。push後のGit連携デプロイと、本番の301応答を別途確認します。

反映後の確認例:

~~~sh
curl -I https://xainome.blog/hello-world/
curl -I 'https://xainome.blog/?p=1'
curl -I https://xainome.blog/posts/2026/10/first-blood-donation-400ml/
~~~

旧URLは301でCSVの転送先をLocationに返し、転送先は200になることを確認します。Search Consoleではhttps://xainome.blog/sitemap.xmlを送信し、旧URLと新URLのURL検査でライブ応答を確認してください。
