---
title: "Gemini-proを使って簡単なチャットボットを作ってみよう！"
date: 2024-01-22
slug: "gemini-pro-tutorial"
aliases:
  - "/posts/2024/01/gemini-proを使って簡単なチャットボットを作ってみよう/"
categories: 
  - "it"
tags: 
  - "gemini-pro"
  - "チャットボット"
cover:
  image: "images/gemini-pro-tutorial-cover.png"
---

生成AIがどんどん進化していく中でGoogleが新たなモデルを出しました。それが"Gemini-pro"です。

ちなみに[こちら](https://deepmind.google/technologies/gemini/#bard)のページの下の画像リンクからGeminiが搭載されたBardを使うことができます。

![](images/スクリーンショット-2024-01-22-161239-1024x359.png)

チャットボットを作るにはAPIが必要なのでまずはAPIキーを取得します。キーは[こちら](https://ai.google.dev/)から取得できます。画像の"Get API key in Google AI Studio"のリンクをクリックします。

![](images/スクリーンショット-2024-01-22-162015-1024x430.png)

ページが移動したら"Get API key"タブから"Create API key in new project"をクリックすればAPIキーを取得することができます。これでチャットボットの準備ができました。

![](images/スクリーンショット-2024-01-22-162415-1024x230.png)

次にGoogle Colaboratoryを起動します。APIキーの設定とモデルの取得と機械学習webアプリケーションを設定するだけで使うことができます。今回は"Gradio"を使うことにします。他のアプリもありますが、いつか使ってみたいですね。

コードは以下のように設定します。"YOU'RE\_APIKEY"に取得したAPIキーを入れてください。

!pip install gradio  
  
import gradio as gr  
import google.generativeai as genai  
  
\# APIキーの設定  
GOOGLE\_API\_KEY = "YOU'RE\_APIKEY"  
genai.configure(api\_key=GOOGLE\_API\_KEY)  
  
\# Generative AIモデルの初期化  
model = genai.GenerativeModel("gemini-pro")  
  
\# チャットボットの動作を定義  
def chatbot(prompt):  
\# Generative AIモデルを使用して推論を実行  
response = model.generate\_content(prompt)  
return response.text  
  
\# Gradio UIの設定  
iface = gr.Interface(  
fn=chatbot,  
inputs=gr.Textbox(type="text", placeholder="Press Enter to Submit"),  
outputs="text",  
live=True  
)  
  
\# Enterキーで送信されるようにする  
iface.launch(share=True, debug=True)

こうすると次の画面が表示されます。

![](images/スクリーンショット-2024-01-22-163714-1024x147.png)

試しに入力してみます。

![](images/スクリーンショット-2024-01-22-164017-1024x322.png)

なるほど、それっぽい返答が返ってきました。一応うまくいってるみたいです。簡易的なチャットボットの完成です！ﾊﾟﾁﾊﾟﾁ

他のAPIを使ったチャットボットや別のWebアプリ、言語も使ってみたいのでもう少し探ってみようと思います。ではでは
