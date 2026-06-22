---
title: "RAGを開発してみたい！ので簡単なものでもいいので作ってみよう！part7"
date: 2024-05-09
slug: "build-rag-app-part-7"
aliases:
  - "/posts/2024/05/ragを開発してみたい！ので簡単なものでもいいの-7/"
categories: 
  - "it"
tags: 
  - "rag"
cover:
  image: "images/build-rag-app-part-7-cover.png"
---

目標としていた部分が完成したのでデモ版という形でお見せしようと思います。

想定していた形が取れたので割と嬉しいですね！ただ、上記はファイルが2つの場合でこのくらい時間がかかっています。

次はファイルが5つの場合です。

かなり時間がかかってますね。というのも実行するたびファイルをベクトル化しているので時間がかかる仕組みになっています。

実行するたびopenaiのAPIもたたいているので料金も増えていきます。ということで次の課題は

- openaiのベクトル化ではない代替手段を見つける

- ベクトルデータベースを作成する(すべてのファイルをベクトル化して、どこかに保存)

ひとまずはこの2つですかね？

代替手段は見つければ何とかなりそうなので時間はかからないと思いますが、ベクトルデータベースの作成は異なるプログラムを作る必要がありそうですし、質問をベクトル化するプログラムの改修も入りそうなので少し時間がかかるかもですね。

第二目標ほど時間はかからないと思いますが…

今回修正した箇所はflaskを使用した場所と応答画面の作成になります。flaskは微修正だったので割愛しますが、画面のほうは以下のようになりました。

```
'use client';

import { useState } from 'react';

export default function QuestionForm() {
  // サーバーからの結果を保持する状態変数
  const [result, setResult] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const question = e.target.elements.question.value;

    // サーバーにPOSTリクエストを送る
    const response = await fetch('http://localhost:5000/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: question })
    });

    // サーバーからのレスポンスをJSON形式で取得
    const data = await response.json();
    // 結果を状態変数に保存
    setResult({ title: data.title, body: data.body, similarity: data.similarity } || 'No result returned'); // デフォルトで"結果がない"と表示
    e.target.reset();
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <textarea
          name="question"
          placeholder="質問を入力してください"
          rows={5}
        />
        <button type="submit">送信</button>
      </form>
      
      {/* サーバーからの結果を表示 */}
      <div>
        <h3>回答:</h3>
        <p><strong>タイトル:</strong> {result.title}</p>
        <p><strong>類似度:</strong> {result.similarity}</p>
        <p><strong>内容:</strong> {result.body}</p>
      </div>
    </div>
  )
}
```

画面にタイトルと類似度と内容が表示されるようになってます。必要ないかもしれませんが、デフォルトでは結果が表示されない文言を出しています。多分出ることはないですが…

まだまだ課題はありますが、少しずつ消化して完成に近づいて行ってるのでガンガン進めたいと思いつつもゲームとの兼ね合いがあるので難しいところです（笑）

また進捗がありましたら記事にしようと思います。ではでは。
