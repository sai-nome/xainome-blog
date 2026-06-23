---
title: "RAGを開発してみたい！ので簡単なものでもいいので作ってみよう！part2"
date: 2024-04-12
slug: "build-rag-app-part-2"
aliases:
  - "/posts/2024/04/ragを開発してみたい！ので簡単なものでもいいの-2/"
categories: 
  - "it"
tags: 
  - "openai-embeddings"
  - "rag"
  - "rag開発"
cover:
  image: "images/build-rag-app-part-2-cover.png"
  relative: true
---

このpartで基本が8割がた作れました。内容としては簡単な質問をすると"タイトル"と"内容"が返ってくる程度です。まだまだ理想には遠いですね。

前回やったのは

- PDFファイル読み込み

- ページ番号取得と削除

- 色んな空白を削除

今回行ったのは

- 特殊文字の削除

- 大文字小文字統一

- ベクトル変換

この辺も全てChat-GPT任せでした。特殊文字に関してはURLとメールアドレス、特殊文字の削除になります。まあ私が扱ってるものの中にURLやメールアドレスはあまりなさそうですが、一般的には必要だと思います。

```
text = re.sub(r'http[s]?://\S+', '', text)
text = re.sub(r'\S*@\S*\s?', '', text)
text = re.sub(r'[!#\$%&\'()*+,\-./:;<=>?@\[\\\]^_`{|}~]', '', text)
```

次は大文字小文字の統一ですね。これが少し特殊ですが例えば "１２３ａｂｃｱｲｳｴｵ①②③¹²³"という文字があった時に"123abcアイウエオ123123"となるように変換しています。これもあまり使われてないと思いますが、一応変換しています。

```
normalized_text = ''.join([unicodedata.normalize('NFKC', char) if not unicodedata.east_asian_width(char) in ('F', 'W', 'A') else char for char in text])
```

それからベクトル変換ですね。OpenAIの埋め込みベクトルに変換していきます。課金が必要なので他のやり方がないか考えたいところですが、簡単に実装するために使用します。いつかはTF-IDFかWord2Vecを使ってみたいです。

```
openai.api_key = os.environ['OPENAI_API_KEY']
vector_database.append({
        'title': filename,
        'body': text,
        'embedding': vector
    })
```

課金といっても10000字くらい埋め込みベクトルに使っても0.01$もかかりませんので数円くらいならお試しで触ってみてください。

一つだけ注意点を話すと8192トークンまでしか入力として受け取れないので、もし文字数が多くなる場合は分割して、それぞれの平均を取るといいかと思います。私の場合はとりあえず7000文字くらいで分割しています。

```
for i in range(0, len(text), max_tokens): # max_tokens=7000
    segment = text[i:i+max_tokens]
    res = openai.embeddings.create(
            model='text-embedding-3-large',
            input=segment
        )
    vectors.append(res.data[0].embedding)
average_vector = np.mean(vectors, axis=0).tolist()
```

そういえばいつからかはわかりませんが埋め込みベクトルの数値を取り出す方法が変わってたみたいで、'res\[data\]\[0\]\[embedding\]' から 'res.data\[0\].embedding'に変わっています。前の方法が良ければバージョンを下げていただければ大丈夫です。

ここまで来れば後もう少しでやりたいことの基本ができます。残りは

- 検索クエリのベクトル化

- コサイン類似度の計算

余談ですが他にテキスト分割やMecabを使った形態素解析、BERTでトークンをIDに変換とかやってたのですが、こちらの方が簡単でしたのでOpenAIのAPIを採用しています。課金が必要になるので将来的に他のやり方に変えていきたいですが、今は実装できることを目指してるのでやりきることを目指そうと思います。ではでは。
