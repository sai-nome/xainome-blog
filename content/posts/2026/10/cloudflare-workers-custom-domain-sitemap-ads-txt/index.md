---
title: "Cloudflare Workersにカスタムドメインを追加したよ！CNAMEのエラーとサイトマップ・ads.txtの整備"
description: "Cloudflare Workersへ独自ドメインを接続した続編。追加時のエラーでCNAMEを削除した話とその理由、Hugoのサイトマップを独自ドメインに合わせたこと、ads.txtを追加したことをまとめます。"
date: 2026-10-20T00:00:00+09:00
draft: false
slug: "cloudflare-workers-custom-domain-sitemap-ads-txt"
author: "サイノメ"
ShowToc: true
cover:
  image: "images/Overwhelmed Dolphin’s SEO Night Shift.png"
  alt: "Cloudflareやサイトマップ、AdSenseの設定に奮闘するイルカのイメージイラスト"
  relative: true
categories:
  - "it"
tags:
  - "Cloudflare"
  - "Workers"
  - "DNS"
  - "Hugo"
  - "ブログ運営"
---

以前、[Cloudflareにドメインを追加し、ConoHaのDNSを確認しながら設定した話]({{< ref "posts/2026/10/cloudflare-domain-conoha-dns/index.md" >}})を書きました。[ConoHaのサーバー解約やドメイン移管の話]({{< ref "posts/2026/10/conoha-cancellation-domain-transfer/index.md" >}})も進めていましたが、今回はブログの公開先を整えた話です。

Cloudflare Workersにカスタムドメインを追加して、ブログで使っている`xainome.blog`を接続しました。ただ、追加しようとしたときにエラーが出て、DNSレコードのCNAMEを削除する作業が必要でした。

それに合わせて、サイトマップのURLを独自ドメインにそろえ、広告用の`ads.txt`も追加しました。サイトを移すだけで終わりかと思っていましたが、周りの設定も少しずつ整える必要がありますね。

## Cloudflare Workersにカスタムドメインを追加した

前回は、Cloudflareにドメインを追加して、DNSの管理先を切り替えるための設定を進めていました。今回は、そのドメインでWorkers上のブログを表示するための設定です。

{{< figure src="images/Screenshot 2026-10-15 103135.png" alt="CloudflareのDomains一覧。xainome.blogのステータスがActiveになっている" caption="Cloudflare側では、xainome.blogが「Active」になっていました。" width="720" align="center" link="images/Screenshot 2026-10-15 103135.png" >}}

もともとWorkersでは、次のURLでブログを公開していました。

```text
https://xainome-blog.beeskynohito.workers.dev/
```

これを、ブログで使い続けている次のドメインから開けるようにします。

```text
https://xainome.blog/
```

Workersのカスタムドメインは、対象のWorkerの「Settings」→「Domains & Routes」→「Add」→「Custom Domain」から追加できます。設定すると、接続に必要なDNSレコードと証明書はCloudflareが作成してくれます。[Cloudflare公式「Custom Domains」](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

Cloudflareにドメインを追加することと、どのWorkerにそのドメインを接続するかを設定することは、それぞれ別の作業なんですね。

{{< figure src="images/Screenshot 2026-10-15 103340.png" alt="xainome-blogのWorker構成画面。workers.devのURLとAdd a custom domainの項目が表示されている" caption="追加前のWorkerの画面。この時点では、カスタムドメインはまだ表示されていません。" width="720" align="center" link="images/Screenshot 2026-10-15 103340.png" >}}

## ドメイン追加時にエラーが出て、CNAMEを削除した

カスタムドメインを追加しようとしたところ、次のエラーが表示されました。保存した画面で確認できる全文は、次のとおりです。

```text
Hostname 'xainome.blog' already has externally managed DNS records (A, CNAME, etc). Delete them first or try a different hostname.
```

{{< figure src="images/Screenshot 2026-10-15 103719.png" alt="xainome.blogの接続画面。既存のDNSレコードを先に削除するか別のホスト名を使うよう求めるエラーが表示されている" caption="カスタムドメイン追加時のエラー。対象ホスト名に既存のDNSレコードがあると案内されています。" width="527" align="center" link="images/Screenshot 2026-10-15 103719.png" >}}

文面からは、対象のホスト名にすでに別途管理されているDNSレコードがあり、先に削除するか、別のホスト名を使うよう求められていることが分かります。今回は、DNSレコードのCNAMEを削除してから、カスタムドメインの追加を進めました。

<!-- 執筆メモ：エラー全文は添付スクリーンショットで確認済み。削除したCNAMEの名前・接続先と、それを管理していたサービスは未確認のため断定しない。 -->

{{< figure src="images/Screenshot 2026-10-15 103956.png" alt="Custom Domains and Routes一覧に、xainome.blogがProductionとして表示されている" caption="追加後の一覧。xainome.blogが「Production」として表示されました。" width="720" align="center" link="images/Screenshot 2026-10-15 103956.png" >}}

### なぜCNAMEを削除する必要があったのか

CNAMEは、あるホスト名の参照先を別のホスト名として指定するDNSレコードです。例えば、`www.example.com`から別のサービスのホスト名を参照する、といった使い方をします。IPアドレスを直接指定するA・AAAAレコードとは役割が異なります。[Cloudflare公式「DNS record types」](https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/)

今回の対応は、同じホスト名にある既存のDNS設定と、これから追加するカスタムドメイン設定との競合を解消する作業として整理できます。どのサービスが既存のDNS設定を管理していたかは、削除前のレコードなどを確認しないと断定できません。

Workersの公式ドキュメントには、**既存のCNAMEレコードがあるホスト名には、カスタムドメインを作成できない**と記載されています。今回の対応は、この制約を踏まえると理解しやすいです。[Cloudflare公式「Custom Domains」の追加条件](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/#add-a-custom-domain)

カスタムドメインを設定すると、Cloudflare側でWorkerへ接続するためのDNSレコードが作成されます。そのため、接続したいホスト名に既存のCNAMEが残っている場合は、その設定を整理してから追加する必要があります。

「Cloudflareにドメインが入っているから、そのまま接続できるだろう」と思っていたのですが、DNSに残っている設定も関係するんですね。

### 削除するのは、接続したいホスト名のレコードを確認してから

今回削除したのはCNAMEですが、カスタムドメインの追加でエラーが出たら、DNSレコードをまとめて消せばよいという話ではありません。

確認するのは、追加しようとしているホスト名と、既存のCNAMEの名前・接続先です。別のサービスで使っているレコードまで削除すると、そのサービスへの接続に影響することがあります。

また、ネームサーバーをCloudflareへ切り替えた構成では、現在使われているCloudflare側のDNSを確認します。ConoHaに残っている設定と混同しないようにしたいところです。この違いは[前回の記事]({{< ref "posts/2026/10/cloudflare-domain-conoha-dns/index.md" >}})でも整理しています。

## サイトマップを独自ドメインに合わせた

カスタムドメインの設定と併せて、サイトマップも独自ドメインに合わせました。ここでいうサイトマップは、検索エンジン向けの`/sitemap.xml`です。

このブログはHugoで作っているので、サイトマップはビルド時に生成されます。XMLを一つずつ手で書き換えるのではなく、サイトの基準になるURLを設定して作り直します。[Hugo公式「Sitemap templates」](https://gohugo.io/templates/sitemap/)

今回変更したのは、`hugo.toml`の`baseURL`です。以前はWorkersのURLを指定していました。

```toml
baseURL = 'https://xainome-blog.beeskynohito.workers.dev/'
```

これを、独自ドメインに変更しました。

```toml
baseURL = 'https://xainome.blog/'
```

この設定でビルドすると、生成されるサイトマップ内のURLも`https://xainome.blog/`を基準にしたものになります。ブラウザで開くドメインだけでなく、サイト側が出力するURLもそろえておくわけですね。

公開時に確認する場所は、次のURLです。

```text
https://xainome.blog/sitemap.xml
```

ファイルが開けることに加えて、中に並んでいる記事のURLが独自ドメインになっているかも確認します。

### Search Consoleでは、サイトマップのURLを指定する

Google Search Consoleの画面も確認しました。作業時の画面には、以前から送信されている`/sitemap.xml`が「成功しました」と表示されていました。ただし、最終読み込み日は2026年10月10日なので、この表示だけで今回更新した内容まで読み込まれたとは判断できません。

{{< figure src="images/Screenshot 2026-10-15 105848.png" alt="Search Consoleの送信されたサイトマップ一覧。sitemap.xmlが成功しましたと表示され、最終読み込み日は2026年10月10日になっている" caption="既存のサイトマップの状態。今回の更新前の読み込み結果が表示されています。" width="720" align="center" link="images/Screenshot 2026-10-15 105848.png" >}}

一方、サイトのトップページのURLである`https://xainome.blog/`を送信した行には、「1件のエラー」と表示されていました。送信するのは、トップページではなく、サイトマップのファイルを指す`https://xainome.blog/sitemap.xml`ですね。

{{< figure src="images/Screenshot 2026-10-15 110953.png" alt="Search Consoleのサイトマップ画面。トップページURLの行は1件のエラー、sitemap.xmlの行は成功しましたと表示されている" caption="トップページのURLとサイトマップのURLを混同しないようにしたいところです。" width="720" align="center" link="images/Screenshot 2026-10-15 110953.png" >}}

## 広告用のads.txtも追加した

もう一つ追加したのが、Google AdSense用の`ads.txt`です。

`ads.txt`は、そのサイトの広告枠を販売することを認めた販売者を示すためのファイルです。Googleの案内では、AdSenseからコピーした情報をテキストファイルに記載し、サイトのルートに配置します。[Google AdSenseヘルプ「ads.txtに関するガイド」](https://support.google.com/adsense/answer/12171612?hl=ja)

### Hugoではstaticフォルダーに配置した

このブログでは、次の場所にファイルを追加しました。

```text
static/ads.txt
```

この構成では、Hugoのビルド後に`public/ads.txt`として出力され、サイトのルートから配信する形になります。

```text
static/ads.txt
    ↓ Hugoでビルド
public/ads.txt
    ↓ サイトへ反映
https://xainome.blog/ads.txt
```

AdSense用の記載例は、次のような形式です。以下のパブリッシャーIDは説明用なので、実際には自分のAdSenseアカウントに表示される内容を使います。

```text
google.com, pub-0000000000000000, DIRECT, f08c47fec0942fa0
```

公開後は`https://xainome.blog/ads.txt`を開き、ファイルの内容が表示されるか確認します。AdSense側での認識には時間がかかる場合もあるため、ファイルを置いたあとは管理画面のステータスも確認する流れです。[Google AdSenseヘルプ「ads.txtに関するガイド」](https://support.google.com/adsense/answer/12171612?hl=ja)

### AdSenseの管理画面でも検出状態を確認した

ファイルを追加したあと、AdSenseの管理画面でも、`xainome.blog`の`ads.txt`が検出されていることを確認できました。ファイルを配置するだけでなく、利用するサービス側でも認識されているか確認しておきたいところです。

## サイトの表示以外にも、整えるところがあった

今回は、Workersへのカスタムドメイン追加、CNAMEの整理、サイトマップの更新、`ads.txt`の追加を進めました。

特にCNAMEのエラーは、既存のDNS設定とWorkers側の設定がつながっていることを知るきっかけになりました。管理画面でドメインを追加するだけでも、その前に残っている設定を確認する必要があるんですね。

サイトマップや`ads.txt`も、普段ブログを読むときにはあまり意識しないファイルですが、移行に合わせて整えておきたい部分でした。少しずつですが、独自ドメインでブログを続けるための準備が進んできました。ではでは。
