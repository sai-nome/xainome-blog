---
title: "E資格が終わったので実践としてKaggleにも挑戦してみよう！"
date: 2024-03-13
slug: "jdla-deep-learning-engineer-exam-kaggle"
aliases:
  - "/posts/2024/03/e資格が終わったので実践としてkaggleにも挑戦してみ/"
categories: 
  - "it"
tags: 
  - "kaggle"
cover:
  image: "images/jdla-deep-learning-engineer-exam-kaggle-cover.png"
  relative: true
---

G検定に続きE資格も無事取得できたので今度は統計検定準1級やDS検定になるかと思いますが、一旦受験関係はやめて[Kaggle](https://www.kaggle.com/)に挑戦しようと思います。

英語という観点では少し不利ですが、名前はよく知られてますし英語の練習にもなるかもしれないのでこちらを選びました。日本語が良ければ[SIGNATE](https://signate.jp/)というコンペがあります。

まずKaggleとはなんぞやということですが、競技プログラミングのデータサイエンティスト版ですね。要件を確認して、入力データを見て、予測や分類を行い、csvファイルを提出してスコアを競うという流れですね。

Kaggleの始め方は該当のページに飛んでアカウントを作成してください。メールアドレスまたはGoogleアカウントですぐに始められます。

そもそもKaggle以前にプログラム自体に触ったことがない人もいるかと思います。そんな人はpythonの勉強から始めましょう！[こちら](https://www.kaggle.com/learn)からKaggle内で勉強することもできます。pythonやpandasはもちろん、データの可視化、機械学習や深層学習、SQLも勉強できます。

プログラムが書けるようになったらいよいよ挑戦することになると思いますが、データ分析で一番重要なのはデータへの理解と加工だと考えています。

どんなデータが使われているか？、どの変数がどんな型になっているか？、外れ値や欠損値が含まれているか？、各変数の相関関係はどうか？など確認すべき点は多いです。また、そのデータに対する加工が適切かどうかも考えないといけません。欠損値は削除すべきか埋めるべきか？外れ値としてみるべきか？

8割くらいがデータへの理解と加工が重要だと思うので[こちら](https://www.amazon.co.jp/kaggle%E3%81%A7%E4%B8%8A%E4%BD%8D%E3%81%AB%E5%85%A5%E3%82%8B%E3%81%9F%E3%82%81%E3%81%AE%E6%8E%A2%E7%B4%A2%E7%9A%84%E3%83%87%E3%83%BC%E3%82%BF%E8%A7%A3%E6%9E%90%E5%85%A5%E9%96%80-%E7%94%B0%E9%82%89-%E6%AD%A3%E5%B9%B8-ebook/dp/B086H28DBL/ref=sr_1_1?__mk_ja_JP=%E3%82%AB%E3%82%BF%E3%82%AB%E3%83%8A&crid=3O2P01WGDCRTZ&dib=eyJ2IjoiMSJ9.VKo1afpy2lhbFY0QIbE8PSFZ8HBXEAQK3SJjF4dpIJyY9CpYyvuQR1NkXC1viNvj00pv4ZD-9Sw0tdX6JWFIDIucqIAKQOyB7i2V97NPXHI4vLRienyDzYljbQVAbbjKfWnmuPqgoNjToEQYvHoLtNF3dYgodr_RmJpnHe8BPPyFLvnv6wYcu1ZFdItmMSJ9.-MoKmoq2GZtMneC9TEKzZJ7OUz1RjUYNHAwne2-MdWY&dib_tag=se&keywords=kaggle&qid=1710289522&s=digital-text&sprefix=kaggle%2Ckindle-unlimited%2C165&sr=1-1)をさらっと流し見するといいかもです。ただ、プログラムはほぼ書いておらず図の見方やデータの確認方法がメインなので流し見でいいかと思います。

Kindle Unlimitedであればただで見れるので入っておくことをおススメします。サブスクで月額300円くらいですし、他のためになる本やくだらない本も読めますので本を読むいいきっかけになると思います。ただで見れるので細かく見ずわかってる場所は飛ばして、さらっと見ていきましょう。

次は[こちら](https://www.amazon.co.jp/Kaggle%E3%81%A7%E5%8B%9D%E3%81%A4%E3%83%87%E3%83%BC%E3%82%BF%E5%88%86%E6%9E%90%E3%81%AE%E6%8A%80%E8%A1%93-%E9%96%80%E8%84%87-%E5%A4%A7%E8%BC%94-ebook/dp/B07YTDBC3Z/ref=sr_1_3?crid=394DHT0UTXAJA&dib=eyJ2IjoiMSJ9.gCaQZq2uOHGNriHWtAV1E9-VCYpj4wWhqkCaZICwsKaWvIhoEKOBjLI0M9hdGWpLgSNIGNzrL-ORFtorrj6HXZivfzS54iDslsqE7c7GUA3fmQSMdyYd4cTH5cLkqbT4FU4-UIqmtRueX6L9cTTr8Ryi2poweBiqHV1JZ3RuBvOua0zBmiYx1cm2QYPPryLw1_tOlPTl7sL0Ue6DgatP3ESIr8U8DBGEfUez1E2LtZ8.tNSHCrdnjBrTZNfHYMraE6P0iCJgR9TukGiybGfgl8Q&dib_tag=se&keywords=kaggle+%E3%83%87%E3%83%BC%E3%82%BF%E5%88%86%E6%9E%90%E5%85%A5%E9%96%80&qid=1710291336&s=digital-text&sprefix=kaggle%2Ckindle-unlimited%2C237&sr=1-3-catcorr)ですね。たくさんの人がおすすめしてますが、データの加工方法からモデルの作成と評価、細かいポイントまで記載しています。私もまだ読み始めですが、目次を見た限りだとこれを見ればデータ分析が十分できると思います。画像や自然言語処理、GANなどは触れてないですが…

本を読みながらKaggleを触っていくのがいいと思います。よくタイタニックがおすすめされていますが、ランキングはほぼ変わらない上にやる気に繋がりにくいので今開催されているコンペに出るといい気がします。

賞金のほうでもいいですし、SwagやKnowledgeでもいいと思います。最初は上を目指さず、自身でいろいろ試して解答を提出して、他の人のコードを覗いたりDiscussionに参加したりするといいと思います。思わぬアイデアが埋まってたりしますし、知らないですが…

とまあこんな感じで参加しようと思います。まずはテーブルデータのコンペから参加してみて、ゆくゆくは画像系とかやってみたいですね。ではでは
