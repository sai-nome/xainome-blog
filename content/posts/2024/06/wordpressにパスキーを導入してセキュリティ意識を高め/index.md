---
title: "WordPressにパスキーを導入してセキュリティ意識を高めよう！"
date: 2024-06-16
slug: "wordpress-passkeys-cybersecurity"
aliases:
  - "/posts/2024/06/wordpressにパスキーを導入してセキュリティ意識を高め/"
categories: 
  - "it"
tags: 
  - "ownid"
  - "wordpress"
  - "サイノメ"
  - "パスキー"
cover:
  image: "images/wordpress-passkeys-cybersecurity-cover.png"
  relative: true
---

## はじめに

ここ最近セキュリティに関するニュースが後を絶たないですね…。例えば

- [岡山の病院で患者情報流出](https://www.nikkei.com/article/DGXZQOUE119GJ0R10C24A6000000/)

- [ニコニコ動画サイバー攻撃](https://news.yahoo.co.jp/articles/9bfd4c3577e2beb21023ebc1bfe951c2986e2734)

- [積水ハウス個人情報流出](https://www.nikkei.com/article/DGXZQOUF249OW0U4A520C2000000/)

流出や攻撃だけでも頻繁に起きますし、脆弱性の発見も日々起こっています。[こちら](https://www.ipa.go.jp/security/vuln/index.html)のサイトなどで見ることができます。

そこで自身もセキュリティ意識を高めるため、パスワードではなく**パスキー**を使ったWordPressのログインを試みようという話になります。

## 設定手順

まずはWordPressにログインして「**OwnID Passwordless Login**」をインストールします。その後設定画面に移動すると以下の画像画面に行くので、「OwnID Console.」をクリックします。

![OwnID Settings](images/スクリーンショット-2024-06-16-185906-1.png)

OwnID Console画面に入ったらアカウントを作ってログインしましょう！Githubがあればそちらでも大丈夫です。

![OwnID Sign up](images/スクリーンショット-2024-06-14-121921-1024x599.png)

ログインができたら「Create Application」でアプリの作成を行います。

![Add Passkeys](images/スクリーンショット-2024-06-14-123214.png)

まずはアプリ名を決めましょう。適当で大丈夫です。

![App name](images/スクリーンショット-2024-06-14-123344.png)

アプリ名を決めたら使用するシステムを選択しましょう！今回の場合はWordPressになります。

![Choose your integration](images/スクリーンショット-2024-06-14-123431.png)

もし開発に使用する場合は以下から選択することになると思います。いつか開発で使ってみたいですね。

![Build your own](images/スクリーンショット-2024-06-14-123508.png)

WordPressの場合は自身のURLサイトを設定しましょう。

![website URL](images/スクリーンショット-2024-06-14-123541.png)

設定が完了したら準備完了です！

![your app is ready](images/スクリーンショット-2024-06-14-125011.png)

## 複数サイト設定

ここから先は複数作る場合になります。カスタムドメインで作ると複数パターン設定できます。

![Custom Domain](images/スクリーンショット-2024-06-14-125121-1024x314.png)

カスタムドメインをまずは作ります。基本は「passwordless.あなたのドメイン」で設定します。

![Custom Domain](images/スクリーンショット-2024-06-14-125415.png)

カスタムドメインの設定が完了したらDNSにStep1とStep2の値を設定します。

![Custom Domain set up steps](images/スクリーンショット-2024-06-14-125516.png)

設定が完了してチェックが通れば「Verified」になります。

![Custom Domain check](images/スクリーンショット-2024-06-14-130305.png)

![Custom Domain check](images/スクリーンショット-2024-06-14-130819.png)

設定が完了したら「App ID」と「Shared Secret」の画面を出したまま、WordPressの画面に戻ります。

![OwnID settings](images/スクリーンショット-2024-06-14-132904.png)

OwnIDの設定画面で先ほどの**App ID**と**Shared secret**を入力して完了です。

![OwnID settings](images/スクリーンショット-2024-06-14-132952.png)

この画面が出れば成功したことになるのでログアウトしてみましょう！

![](images/スクリーンショット-2024-06-14-133040.png)

そうするとパスワードの部分にパスキー用のアイコンが出ますのでこれでログインができるようになります。

![WordPress passkeys](images/スクリーンショット-2024-06-16-155401.png)

これにてパスキーの設定が完了になります。パスワードを忘れてもログインできるようになるので、多少便利になると思います。

またパスキーについて詳しくなればログイン周りのセキュリティも強化されるのでやっておくと後々良くなると思います。

## 終わりに

最後に余談ですが私の環境ではうまく機能せず、ログインしようとすると「**アカウントが見つかりません**」と言われます。

環境の問題なのかプラグインの問題なのか設定の問題なのかわかってないのですが、もう少し調べて修正しようと思います。ではでは。
