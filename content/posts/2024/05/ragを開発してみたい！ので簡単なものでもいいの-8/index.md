---
title: "RAGを開発してみたい！ので簡単なものでもいいので作ってみよう！part8"
date: 2024-05-14
slug: "build-rag-app-part-8"
aliases:
  - "/posts/2024/05/ragを開発してみたい！ので簡単なものでもいいの-8/"
categories: 
  - "it"
tags: 
  - "rag"
  - "rag開発"
cover:
  image: "images/build-rag-app-part-8-cover.png"
---

前回問題としていたベクトル化についてですが解決して、ようやく2つ目の目標が終わりました！

まずはこちらをご覧ください。

こんな感じになりました。

今はまだファイル数は20~30なのでまだまだ足りませんが、前回に比べるとかなりましになりました。

今回やったこととしては

- OpenAIのベクトル化からSentence Transformerを使用したベクトル化に変更

- 全ファイルをベクトルデータベースとしてjsonファイルに格納

になります。そのため一旦別プログラムでファイルを全てベクトル化し、画面に表示をさせるときはそのファイルを読み込んで類似度の計算を行っています。

前のコードとそこまでは変わってないので変わった部分で言うと

```
class PDFToVector:
    def __init__(self, model_name: str):
        # モデルを読み込み
        self.model = SentenceTransformer(model_name)

    def split_text2vector(self, text: str, max_tokens=200) -> List[float]:
        vectors = []
        for i in range(0, len(text), max_tokens):
            segment = text[i:i+max_tokens]
            vector = self.model.encode(segment, convert_to_tensor=True)
            vectors.append(vector)
        average_vector = np.mean(vectors, axis=0).tolist()

    def embed_sentence(self, text: str, vector_fol: str, filename: str, vector_database: List) -> List:
        embedding = self.split_text2vector(text)
        vector = {
            'title': filename,
            'body': text,
            'embedding': embedding
        }
        vector_database.append(vector)
        
    def main(self):
        # ベクトルデータベースを格納
        with open(vector_db_json, 'w', encoding='utf-8') as file:
            json.dump(vector_database, file, ensure_ascii=False, indent=4)
```

こんなとこだと思います。一部処理を省略していますが大体の変わったとこはここになります。

画面を表示する際はこれに類似度の計算が入っています。前にもやってので割愛しますが…

これでようやくやりたかったことの前段階が終了しました。ここまでくればもう少しで最終目標に届きそうです。その後は画面をいじったり、実際にリリースしたり、テストしてバグを見つけたりという工程になりそうです。

さて最終目標としては

- 全ファイルのベクトル化(大体15000ファイル)

- モデルの学習を行い、やり取りをする

というところになります。独自のドメイン知識(ここでは判例のpdf)を読み込ませたモデルと生成AIとの組み合わせでやり取りが実現できればいろんなところで応用できると思います。

私の場合は画面まで作ろうとしているので無駄に大変ですがバックエンドだけならpythonがわかっている人は作れると思います。

今は生成AIにどんなのを作りたいか尋ねて作れるので、やろうと思えばきれいな画面も作れると思いますが…

全体の8割くらい終わったので”もうこれでいいや”感が出ているのですが、もう少し頑張っていきます。ではでは。
