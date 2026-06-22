---
title: "RAGを開発してみたい！ので簡単なものでもいいので作ってみよう！part9"
date: 2024-05-24
slug: "build-rag-app-part-9"
aliases:
  - "/posts/2024/05/ragを開発してみたい！ので簡単なものでもいいの-9/"
categories: 
  - "it"
tags: 
  - "rag"
  - "rag開発"
cover:
  image: "images/build-rag-app-part-9-cover.png"
---

一旦行き詰ったのでここまでを記録として残しておきます。

行き詰った内容としてはローカルで実行できないこと、無料枠のcolabを利用してもダメだったことです。

今回実施した内容としては以下

- ベクトルデータベースの完成

- 生成モデルを利用して質問＋ファイルの内容を分割してプロンプトを投げる

‘paraphrase-multilingual-mpnet-base-v2’を利用したベクトルデータベースの作成が完了したのでGithubにあげようとしたのですが、jsonファイルは2GB以上、zip化しても500MB以上あったので断念しました。100MB未満なら簡単にあげられるのですが、それ以上はもう少し手順が必要みたいです。

このファイル作るのに1週間近くはかかるんだなと思いました。ファイル数が多かったのもあるかもしれませんが、こんなに大変なんだなと実感しました。[この記事](https://zenn.dev/knowledgesense/articles/346183afdf750e)でベクトルデータベースの容量削減について書かれていますが、精度とかはまだ分かってないのでなるほどぐらいで終わりました。

生成モデルを利用したプロンプトの作成と推論コードはザックリと以下になります。

```
    def load_or_download_genmodel(model_name: str, local_dir: str) -> tuple[PreTrainedTokenizer | PreTrainedTokenizerFast, PreTrainedModel|SentenceTransformer]:
    # ローカルディレクトリが存在しない場合は作成
    if not os.path.exists(local_dir):
        os.makedirs(local_dir)
    # モデルがローカルに存在するかをチェック
    if not (os.path.exists(os.path.join(local_dir, 'config.json')) and
            os.path.exists(os.path.join(local_dir, 'tokenizer_config.json'))):
        # モデルが存在しない場合はダウンロードして保存
        print(f"Model not found locally. Downloading {model_name}...")
        tokenizer = AutoTokenizer.from_pretrained(model_name, force_download=True)
        model = AutoModelForCausalLM.from_pretrained(model_name, force_download=True)
        print(f"Saving model and tokenizer to {local_dir}...")
        tokenizer.save_pretrained(local_dir)
        model.save_pretrained(local_dir)
    else:
        # モデルが存在する場合はローカルからロード
        print(f"Loading generative model and tokenizer from {local_dir}...")
        tokenizer = AutoTokenizer.from_pretrained(local_dir)
        model = AutoModelForCausalLM.from_pretrained(local_dir)
    
    return tokenizer, model

    def process_text_in_chunks(self, question, text, model, tokenizer):
        for chunk in chunks:
            prompt = f"{question}\n\n{chunk}"
            inputs = tokenizer(prompt, return_tensors="pt", max_length=50, truncation=True)
            input_ids = inputs["input_ids"]
            attention_mask = inputs["attention_mask"]
            output = self.generative_model.generate(input_ids=input_ids, attention_mask=attention_mask, max_new_tokens=100, num_beams=3)
            result_text = tokenizer.decode(output[0], skip_special_tokens=True)
            combined_result += result_text + "\n"
        
        return combined_result

    def main(self, question):
		    # コサイン類推度から近いファイルを取得し、テキストを抽出→ここでは省く
        result = self.process_text_in_chunks(question, text, self.generative_model, self.tokenizer)
        return result

if __name__ == '__main__':
    # 生成モデルをロードまたはダウンロード
    tokenizer, gen_model = load_or_download_genmodel(gen_model_name, gen_local_dir)
    cos_sim_calc = CosSimCalc(gen_model, tokenizer, emb_model)
    cos_sim_calc.main(question = '著作権について教えて下さい。')
```

いろいろ試して見たんですがローカルだと動かないですし、高性能GCPを買うまではいかないので、クラウドで実行するかOpenAIなどのAPIに頼ることになりそうです。

なかなか個人開発での生成AI利用って難しいですね。GCP積んでも電気代の問題もありそうですし、OpenAIのAPI使うよりはGPTsでも使ったほうがよさそうですし…

とはいえ動くところまでは見てみたいのでOpenAIのAPIを使うなり、クラウドを使うなりして動かしてみたいと思います。お金で知見や知恵が得られるのであればまあ良い経験かと

動くのがわかったら他の開発をしようと思います。まだ次のネタは探してないですが何かしらは転がっていそうなので見つけてみます。ではでは。
