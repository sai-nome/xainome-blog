---
title: "Cloudflareにドメインを追加！ConoHaでDNSを確認しながら設定した話"
description: "Cloudflareに独自ドメインを追加し、ConoHa側のDNSを確認しながら設定した体験を紹介。DNSレコードとネームサーバーの違い、切り替え手順、Workersとの接続で確認することを整理します。"
date: 2026-10-14T12:00:00+09:00
draft: false
slug: "cloudflare-domain-conoha-dns"
author: "サイノメ"
ShowToc: true
cover:
  image: "images/ドメイン移管完了！イルカの祝賀デスク.png"
  alt: "Cloudflareのドメイン設定を進めるイルカのイメージイラスト"
  relative: true
categories:
  - "it"
tags:
  - "Cloudflare"
  - "ConoHa"
  - "DNS"
  - "独自ドメイン"
  - "ブログ運営"
---

Cloudflare側に新しくドメインを追加し、ConoHaの管理画面でDNSの設定を確認しながら作業を進めていました。サイトの置き場所を変えるだけで終わると思っていたのですが、ドメインがどこを参照するのかも整理する必要があるんですね。

今回のポイントは、**Cloudflareにドメインを追加したあと、ConoHa側のDNSレコードと照らし合わせて設定を確認すること**です。ネームサーバーの変更と、ドメインの管理会社を変える「移管」も、それぞれ別の作業として考えると分かりやすくなりました。

この記事では、設定を進めていたときの話と、同じようにConoHaからCloudflareへDNSを切り替える場合の確認手順をまとめます。

※カバーはイメージイラストです。画像内に「移管完了」とありますが、この記事で扱うのはドメインの追加とDNS設定であり、登録管理会社の移管完了を示すものではありません。

<!-- 執筆メモ：日付は下書き作成日。公開前に、対象ドメイン、実際に変更したレコード、ネームサーバーの保存結果、Cloudflareの有効化状況を確認して追記する。手順や確認例は実施済みの記録と区別する。 -->

## Cloudflareにドメインを追加した理由

以前、[WordPressからHugoへ移行し、GitHubとCloudflare Pagesでブログを公開する手順]({{< ref "posts/2026/07/wordpress-hugo-github-cloudflare-pages-guide/index.md" >}})を書きました。その後、[Cloudflare PagesからWorkersへの移行]({{< ref "posts/2026/09/cloudflare-pages-to-workers/index.md" >}})も進めています。

サイトの公開先を変えていく中で、独自ドメインの設定もCloudflare側で進めようと思いました。そこでCloudflareへドメインを追加し、もともと使っていたConoHa側の設定を確認することにしました。

ここでいう「新しく追加」は、Cloudflareにドメインを登録する作業のことです。新しいドメインを購入する手続きや、ドメイン移管とは区別して書いています。

{{< figure src="images/Screenshot 2026-10-11 185931.png" alt="Cloudflareのサイト追加画面。ドメイン接続・移管・購入の3つの選択肢が表示されている" caption="ドメインの接続、移管、新規購入はそれぞれ別の選択肢になっています。" width="720" align="center" >}}

## DNSレコード・ネームサーバー・ドメイン移管の違い

管理画面を行き来していると、DNS、ネームサーバー、ドメインなど似た言葉が出てきます。役割を整理すると、何を変更しようとしているのかが分かりやすくなります。

| 項目 | 役割 | 今回の設定での位置づけ |
| --- | --- | --- |
| ドメイン | サイトの名前になるもの | Cloudflareに追加する対象 |
| DNSレコード | ドメインやサブドメインの接続先などを指定する情報 | ConoHa側とCloudflare側で照合する内容 |
| ネームサーバー | どのDNSサーバーに問い合わせるかを決めるもの | DNSの管理先をCloudflareへ切り替える際に変更する |
| ドメイン移管 | ドメインの登録・更新を管理する会社を変更する手続き | DNSの切り替えとは別に進める作業 |

ConoHaでドメインの契約を管理していても、DNSの管理をCloudflareへ切り替える構成は可能です。Cloudflareの一般的な設定方式では、ドメインの追加、DNSレコードの確認、登録会社側でのネームサーバー変更を行います。[Cloudflare公式「DNSを使い始める」](https://developers.cloudflare.com/dns/get-started/)

## ConoHaのDNSを確認しながら設定していた

今回の作業では、Cloudflareの画面だけを見るのではなく、ConoHa側にあるDNSの設定も確認しながら進めていました。移行元の設定と照らし合わせると、どの情報がサイトの接続に関係しているのかを整理しやすいですね。

ただ、ConoHaのDNS画面にレコードが残っていることと、現在そのDNSが参照されていることは別です。**どちらのDNSが有効なのかは、ドメインに設定されているネームサーバーも併せて確認する必要があります。** [ConoHa公式「DNSを使う」](https://support.conoha.jp/w/dns/)

### ConoHaでDNSレコードを確認する場所

ConoHa WINGの公式ガイドでは、コントロールパネルの「DNS」から対象のドメイン名をクリックすると、DNSレコード一覧を確認できます。[ConoHa公式「DNSを使う」](https://support.conoha.jp/w/dns/)

照合するときは、レコードの種類だけでなく、名前・値・TTLも控えておくと確認しやすくなります。TTLは、DNS情報をキャッシュしておく時間の目安です。

| レコード | 主な用途 | 確認する内容 |
| --- | --- | --- |
| A | ホスト名をIPv4アドレスに対応させる | 現在の公開先に合ったIPアドレスか |
| AAAA | ホスト名をIPv6アドレスに対応させる | IPv6の接続先も現在の構成に合っているか |
| CNAME | ホスト名を別のホスト名に対応させる | `www`などの参照先が適切か |
| MX | メールの配送先を指定する | 独自ドメインのメールを使っている場合に必要な設定か |
| TXT | 所有権確認やメール認証などの情報を持たせる | 認証用の値を引き継ぐ必要があるか |

これらはDNSを確認するときの代表例です。すべてを必ず追加するわけではなく、サイトやメールで実際に使っているものを確認します。[Cloudflare公式「DNSレコードの種類」](https://developers.cloudflare.com/dns/manage-dns-records/reference/dns-record-types/)

## Cloudflareへドメインを追加するときの設定手順

ここからは、ConoHa側の情報を確認しながらCloudflareへDNSを切り替える場合の手順です。今回の作業を整理するために、公式ガイドをもとに流れをまとめました。

### 1. Cloudflareに対象のドメインを追加する

Cloudflareのダッシュボードでドメイン追加の画面を開き、対象のドメインを入力します。入力するのは、`https://`や記事のパスを含むURLではなく、`example.com`のようなドメイン名です。

{{< figure src="images/Screenshot 2026-10-11 185916.png" alt="CloudflareのDomains画面に表示されたAdd domainボタン" caption="CloudflareのDomains画面から「Add domain」で追加を始めます。" width="720" align="center" >}}

今回、接続画面に入力していたのは`xainome.blog`です。この画面では、DNSの取り込みに加えて、検索やAIによるアクセスの方針も選べました。

{{< figure src="images/Screenshot 2026-10-11 190120.png" alt="xainome.blogの接続画面。Search・Agent・TrainingがAllowになっている変更前の設定" caption="変更前の画面では、Search・Agent・Trainingがすべて「Allow」でした。" width="720" align="center" >}}

次の画面では、SearchとAgentは「Allow」のまま、Trainingが「Disallow」になっています。検索やAIによる回答のためのアクセスと、AIモデルの学習利用を分けて設定できるのが分かります。これは保存前の画面の記録であり、現在の本番設定を確認したものではありません。

{{< figure src="images/Screenshot 2026-10-11 190523.png" alt="SearchとAgentをAllow、TrainingをDisallowにしたCloudflareのドメイン接続画面" caption="設定変更後の画面。検索・回答用のアクセスと学習利用の方針を分けています。" width="720" align="center" >}}

「Bot Preference Sync」は、これらの方針を`robots.txt`に反映する機能です。アクセス方針の設定だけで検索順位やAIでの引用が保証されるわけではありません。[Cloudflare公式「Bot Preference Sync」](https://blog.cloudflare.com/bot-preference-sync/)

ドメインの入力後には、プラン選択画面も表示されました。以下は作業時点の画面で、料金や機能は今後変更される場合があります。

{{< figure src="images/Screenshot 2026-10-11 190603.png" alt="xainome.blog向けにFree・Pro・Business・Enterpriseを比較するCloudflareのプラン選択画面" caption="ドメイン追加時に表示されたプラン選択画面。2026年10月11日の記録です。" width="720" align="center" >}}

### 2. 読み込まれたDNSレコードをConoHa側と照合する

Cloudflareには既存のDNSレコードを自動検出する機能があります。ただし、すべてのレコードが検出されるとは限らないため、ConoHa側の情報と照合し、必要なレコードがそろっているか確認します。

サイトの公開先を変更する場合は、古いサーバーを向いている設定をそのまま引き継ぐだけでは目的のサイトにつながりません。Webサイトの接続先は移行先に合わせ、引き続き利用するメールや認証の設定は個別に確認します。

### 3. 割り当てられたネームサーバーを確認する

Cloudflare側に表示されるネームサーバーを控えます。ほかの人の設定例をコピーするのではなく、対象のドメインに割り当てられた値を使います。

{{< figure src="images/Screenshot 2026-10-11 192900.png" alt="ConoHaのネームサーバーをCloudflareから割り当てられたネームサーバーに置き換える案内画面" caption="Cloudflareが表示した切り替え案内。この画面は変更の指示であり、ConoHa側での保存完了を示すものではありません。" width="600" align="center" >}}

ここまでの流れは、[Cloudflare公式「ネームサーバーを変更する」](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)で確認できます。

### 4. ConoHaのドメイン設定でネームサーバーを変更する

ドメインの登録管理がConoHaにある場合は、ConoHaの「WING」→「ドメイン」→対象ドメイン→「ネームサーバー設定」を開きます。Cloudflareへ切り替えるには「カスタム」を選び、Cloudflareが指定したネームサーバーを入力して保存します。[ConoHa公式「ドメインにネームサーバーを設定する」](https://support.conoha.jp/w/domainnameserver/)

ドメインを別の会社で管理している場合は、その会社の管理画面で変更します。ConoHaのサーバーを使っているという理由だけで、変更場所がConoHaになるとは限りません。

DNSSECが有効な場合は、切り替え前に登録会社側で無効化し、Cloudflareでドメインが有効になってから再設定する手順も確認します。[Cloudflare公式のDNSSECに関する切り替え手順](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/#33-turn-off-dnssec)

## Workersへの接続とDNSの反映を確認する

Cloudflareへのドメイン追加と、Workersへの独自ドメイン接続も、確認する場所が異なります。Workersでサイトを公開する場合は、対象のWorkerの「Settings」→「Domains & Routes」からカスタムドメインを設定します。

Workersのカスタムドメインでは、Cloudflareが接続に必要なDNSレコードと証明書を作成します。ConoHaのサーバーを公開先にする場合とは設定が異なるので、Workers用の接続手順を確認して進めます。[Cloudflare公式「Workersのカスタムドメイン」](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

### 切り替え後に確認する項目

設定を保存したあとは、次の点を確認します。

- Cloudflare側でドメインが有効な状態になっているか。
- 独自ドメインで、意図したサイトがHTTPS表示されるか。
- トップページだけでなく、記事ページや画像も表示されるか。
- `www`を使う場合、そのアクセス先や転送先が適切か。
- 独自ドメインのメールを利用している場合、送受信できるか。

ConoHaの案内では、ネームサーバーの変更が浸透するまで最大24〜72時間かかる場合があります。これは今回の実測時間ではなく、公式ガイドに記載された目安です。[ConoHa公式のネームサーバー設定ガイド](https://support.conoha.jp/w/domainnameserver/)

### WindowsでDNSを確認するコマンド例

ブラウザ表示に加えて、WindowsではPowerShellからDNSの応答も確認できます。以下の`example.com`は、自分のドメインに置き換えます。

```powershell
# ドメインのネームサーバーを確認する
Resolve-DnsName -Name example.com -Type NS

# ドメインのIPv4アドレスを確認する
Resolve-DnsName -Name example.com -Type A
```

これは確認方法の例で、今回実行した結果ではありません。また、Cloudflareでプロキシが有効なレコードはCloudflareのIPアドレスを返すため、Aレコードの応答がConoHaのIPと違うだけで設定ミスとは判断できません。[Cloudflare公式「プロキシの状態」](https://developers.cloudflare.com/dns/proxy-status/)

## CloudflareとConoHaのドメイン設定でよくある疑問

### Cloudflareにドメインを追加すれば、移管も完了する？

いいえ。Cloudflareへの追加やDNSの切り替えと、登録管理会社を変更するドメイン移管は別の手続きです。DNSをCloudflareで管理しても、ドメインの更新や契約の管理が元の会社に残ることがあります。[Cloudflare公式「DNSを使い始める」](https://developers.cloudflare.com/dns/get-started/)

### ネームサーバーをCloudflareへ変えたあと、DNSはどちらで編集する？

一般的な切り替え構成では、Cloudflare側で編集します。ConoHa側に残ったレコードを変更しても、Cloudflareが権威DNSになっているドメインには反映されません。まず現在のネームサーバーを確認すると、編集する場所を判断できます。[ConoHa公式「DNSを使う」](https://support.conoha.jp/w/dns/)、[Cloudflare公式「DNSを使い始める」](https://developers.cloudflare.com/dns/get-started/)

### ConoHaのDNSレコードは全部コピーすればよい？

現在も必要なレコードを確認して引き継ぎます。Webサイトの公開先をWorkersへ変更するなら、その接続にはWorkersのカスタムドメイン設定を使います。メールや認証に必要なレコードは、サイトの移行とは分けて確認します。[Cloudflare公式「Workersのカスタムドメイン」](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)

## 設定を進めてみて感じたこと

Cloudflareにドメインを追加する作業を進めてみると、ConoHa側のDNSを見ながら整理することも必要でした。ドメインの契約、DNSの管理先、サイトの公開先を分けて考えると、それぞれの画面で何を確認するのかがつかみやすくなります。

特に、DNSレコードを設定することと、そのDNSを使うようにネームサーバーを変更することは、別の作業なんですね。画面に設定があるだけで安心せず、実際にどこを参照しているのかまで確認するのが大切だと感じました。

ブログの表示だけでなく、ドメインまわりの管理も少しずつ整理していきたいところです。ではでは。
