---
title: "GodotとCodexでゲーム制作に挑戦｜環境構築からCloudflareでのブラウザ公開まで"
description: "チャットAIと相談してGodotを選び、VS Codeとの連携、Codexによる基本動作の実装、GitHubへのpush、Cloudflareでのデプロイを進めた体験談。サブドメインのURLでゲームを操作できるまでの流れと、今後の無料公開への目標をまとめます。"
summary: "GodotとCodexを使ったゲーム制作に挑戦。ゲームエンジン選びからVS Codeとの連携、GitHub・Cloudflareを使った公開まで進め、想定したURLで基本操作ができることを確認しました。"
date: 2026-11-20T00:00:00+09:00
lastmod: 2026-11-20T00:00:00+09:00
draft: false
slug: "godot-codex-browser-game"
author: "サイノメ"
ShowToc: true
cover:
  image: "images/godot-dolphin-cover.webp"
  alt: "Godot・Codex・GitHub・Cloudflareを使ったゲーム開発と公開を喜ぶイルカのイラスト"
  caption: "ゲーム制作から公開までの流れをイメージしたイラスト。"
  relative: true
  hiddenInSingle: false
categories:
  - "it"
  - "ゲーム"
tags:
  - "Godot"
  - "Codex"
  - "ゲーム制作"
  - "ブラウザゲーム"
  - "Cloudflare"
  - "GitHub"
---

**GodotとCodexを使ってゲーム制作に挑戦し、Cloudflareで公開したサブドメインのURLから、ゲームの基本操作ができるところまで進めました。**

最初に取り組んだのは、チャットAIとの相談です。作りたいゲームに合うゲームエンジンを探し、Godotを選びました。その後、GodotのインストールとVS Codeとの連携を進め、Codexに基本動作の実装をお願いしました。

以前は、[Codexでインクリメントゲームを作ったときの試行錯誤]({{< relref "/posts/2026/10/codex-incremental-game-trial-and-error" >}})について書きました。今回は、ゲームエンジンを選ぶところから、ブラウザで遊べる形で公開するまでの記録です。

現時点で確認できたのは、ゲームの土台となる基本操作です。ここから内容を作り込んでいくための、最初の一歩になりました。

## Godotでゲームの基本動作を作り、公開するまでの流れ

今回進めた作業を整理すると、次のようになります。

| 段階 | 実際に行ったこと |
| --- | --- |
| ゲームエンジン選び | チャットAIと壁打ちし、作りたいゲームに合うエンジンとしてGodotを選択 |
| 開発環境の準備 | Godotをインストールし、VS Codeとの連携に必要な設定を実施 |
| 基本動作の実装 | チャットAIにプロンプトを作ってもらい、Codexに入力して実装を依頼 |
| ブラウザでの確認 | 実装したゲームの基本動作をブラウザで確認 |
| 公開の準備とデプロイ | GitHubに空のリポジトリを作成してpushし、CloudflareのAPIトークンとGitHub側の設定を整えてデプロイ |
| 公開URLでの確認 | サブドメインを設定し、想定したURLでゲームの基本操作ができることを確認 |

ゲームを作る部分に加えて、ファイルを管理する場所や公開先の準備も必要でした。順番に進めることで、自分のPCでの開発から、URLでアクセスできる状態までつなげられました。

## チャットAIと相談し、ゲームエンジンにGodotを選んだ

**まずはチャットAIと壁打ちをしながら、自分が作りたいゲームに合うゲームエンジンを探しました。**

ゲームを作ろうと思っても、最初にどの開発環境を選ぶかで迷います。そこで、自分の作りたいものについてチャットで相談し、候補を考えるところから始めました。その結果、今回はGodotを使ってみることにしました。

Godotには、制作したゲームをブラウザ向けに書き出すWebエクスポート機能があります。ブラウザで動かすための条件や制約は、[Godot公式ドキュメントのWebエクスポート解説](https://docs.godotengine.org/en/stable/tutorials/export/exporting_for_web.html)で確認できます。

今回のように、ゲームを作ってブラウザから触れる形にしたい場合、制作する環境と公開する方法を一緒に考える必要があります。チャットで相談することが、実装に入る前の整理になりました。

## Godotをインストールし、VS Codeとの連携を準備した

Godotを選んだあとは、インストールと開発環境の準備を進めました。あわせて、**Visual Studio Code（VS Code）と連携するために必要な設定**にも取り組みました。

{{< figure src="images/godot-external-editor.webp" alt="GodotのEditor Settingsで外部エディターの実行パスや起動引数を設定する画面" caption="Godotの外部エディター設定。VS Codeとの連携に必要な設定を進めました。" width="902" height="732" class="godot-dev-screenshot" align="center" link="images/godot-external-editor.webp" >}}

Godotは、VS Codeなどの外部エディターと組み合わせて使用できます。外部エディターの指定や起動時の引数などについては、[Godot公式の外部エディター設定ガイド](https://docs.godotengine.org/en/stable/tutorials/editor/external_editor.html)に説明があります。

今回は、Godotを入れるだけでなく、VS Codeと組み合わせて作業するための準備も進めた形です。ゲームの中身を作る前に、使うツール同士をつなぐ段階がありました。

この記事では、実際にたどった制作と公開の流れを中心に紹介しています。設定画面の項目や入力値は利用する環境によって変わるため、具体的な設定時には公式ドキュメントも参照してください。

## 基本動作のプロンプトを作ってもらい、Codexで実装した

環境の準備を進めたあと、ゲームの基礎となる動きを作りました。

ここでも、最初にチャットAIを使いました。**ゲームの基本動作を実装するためのプロンプトを作ってもらい、その内容をCodexに入力して、実装をお願いする流れです。**

今回の作業では、チャットAIとの相談、Codexへの実装依頼、自分での動作確認という順番で進めました。

- チャットAIとの相談で、作りたい内容を実装用の指示にまとめる。
- そのプロンプトをCodexに入力し、ゲームの基本動作を作ってもらう。
- 出来上がったものをブラウザで開き、動作を確認する。

プロンプトを渡したあとは、ブラウザで実際に確認しました。画面上で操作できる状態になると、文章で考えていたゲームのイメージを、動くものとして確かめられます。

今回進めたのは、ゲームの土台を作るところまでです。基本動作を確かめられるようになったので、これから遊びの内容を足したり、操作したときの感覚を調整したりしていきたいです。

## GitHubにpushし、Cloudflareでデプロイした

ブラウザで基本動作を確認したあとは、公開するための準備を進めました。

まず、**GitHubに空のリポジトリを作成し、制作したファイルをpushしました。** リポジトリはコードやファイルの変更履歴を管理する場所で、pushはローカルのコミットをリモートのリポジトリに送る操作です。

続いて、CloudflareでAPIトークンを作成し、GitHub側でも必要な設定を行いました。そのうえで、デプロイを進めてもらいました。

{{< figure src="images/cloudflare-api-token-menu.webp" alt="CloudflareのユーザーAPIトークン管理画面とトークン作成ボタン" caption="CloudflareのAPIトークン管理画面。ここからトークンを作成します。" width="1200" height="280" class="godot-dev-screenshot" align="center" link="images/cloudflare-api-token-menu.webp" >}}

{{< figure src="images/cloudflare-token-permissions.webp" alt="CloudflareのAPIトークン作成画面でWorkers ScriptsのEdit権限を選択した状態" caption="APIトークンの権限設定画面。画像ではWorkers ScriptsのEditを選択しています。" width="1187" height="700" class="godot-dev-screenshot" align="center" link="images/cloudflare-token-permissions.webp" >}}

{{< figure src="images/github-actions-secrets.webp" alt="GitHub ActionsのSecretsにCLOUDFLARE_ACCOUNT_IDとCLOUDFLARE_API_TOKENを登録した画面" caption="GitHub側のSecrets設定。登録した名前が表示され、値は表示されません。" width="948" height="578" class="godot-dev-screenshot" align="center" link="images/github-actions-secrets.webp" >}}

{{< figure src="images/github-actions-variables.webp" alt="GitHub ActionsのVariablesにデプロイ用の変数を設定した画面" caption="今回の構成で用意したGitHub Actionsの変数。必要な項目はワークフローによって変わります。" width="931" height="581" class="godot-dev-screenshot" align="center" link="images/github-actions-variables.webp" >}}

デプロイは、制作したものを公開先に配置し、アクセスできる状態にする作業です。今回の流れでは、Godotでの制作とブラウザでの確認に加えて、GitHubでのファイル管理、Cloudflareでの公開まで進めています。

ゲームの中身を作る作業と、公開できる状態を整える作業。その両方を経験できたことが、今回の取り組みの一つの成果でした。

## サブドメインを設定し、想定したURLで基本操作を確認した

最後に、ゲームを公開するためのサブドメインを設定しました。

{{< figure src="images/cloudflare-game-subdomain.webp" alt="Cloudflareのgodot-web-testにカスタムドメインtestgame.xainome.blogを設定した画面" caption="ゲーム用のカスタムドメインを設定した画面。想定したURLでアクセスできるようにしました。" width="1200" height="384" class="godot-dev-screenshot" align="center" link="images/cloudflare-game-subdomain.webp" >}}

サブドメインは、例えば「game.example.com」の「game」のように、ドメインの前に名前を付けて使うものです。これは説明用の例で、今回の公開先URLではありません。

設定が完了したあと、**想定していたURLにブラウザでアクセスし、ゲームの基本操作ができることを確認しました。**

デプロイを終えるだけでなく、実際に使いたかったURLから開いて操作できるところまで確かめられたので、公開までの流れを一通り経験できました。

最初はチャットでゲームエンジンを相談するところからでしたが、そこから環境を準備し、基本動作を作り、公開URLで動かすところまで進みました。今後ゲームを作るときにも、今回の経験を生かせそうです。

## 今後はいろいろなジャンルのゲームを作り、無料で公開してみたい

これからも同じように、チャットAIと相談し、Codexに実装を手伝ってもらいながら、いろいろなジャンルのゲームを作ってみたいです。

目標は、作ったゲームを無料で遊べる形で公開していくことです。まず基本動作を作り、自分で触って確かめながら、遊びとして面白くなるように手を入れていきたいと思っています。

今回、Godotを使う準備からブラウザでの公開まで経験できたので、次はゲームの内容を少しずつ充実させていきたいですね。作りたいものを一つずつ形にして、気軽に遊べるゲームを増やしていこうと思います。ではでは。
