---
title: "短期売買と分析力が向上しそうな株価予測をだらだらとやる part1"
date: 2024-06-10
slug: "stock-price-prediction-part-1"
aliases:
  - "/posts/2024/06/お金かっせぎと分析力を上げられそうな株価予測/"
categories: 
  - "it"
tags: 
  - "サイノメ"
  - "ティッカー"
  - "株価予測"
cover:
  image: "images/stock-price-prediction-part-1-cover.png"
---

[前回](/posts/2024/05/build-rag-app-part-10/)RAGシステムを作ってみてある程度できました。次に、何を作ろうかということで表題になります。

前回と違って完成形は全く思い浮かんでません。とりあえずやってれば何かできるかということで作っていきます。

## ティッカー取得

まずは株価の取得が必要なのですが今回は**yahoo! finance**のAPIを使って取得しようと思います。取得する際のコードは以下。

```
import pandas_datareader.data as web
df = web.get_data_yahoo('1304', '1980-01-01', '2024-06-10')
```

pandas\_datareaderにyahoo用の株価取得ライブラリがあるのでそれを利用します。ティッカー(銘柄)と株価取得の時間を設定します。

株価の取得は簡単なのですが、ティッカーをいちいち手入力するのは面倒ですね。時間は変数で設定できますので問題ないです。

というわけでティッカーを取得するプログラムを作ります。

ティッカーを取得するには東京証券取引所、名古屋証券取引所、福岡証券取引所、札幌証券取引所、各国別SBI証券ティッカー一覧から取れると思いますが、今回はSBI証券から取得しようと思います。

昔やろうとしたことがあったのでそれを流用しようと思います。対象となるサイトは[こちら](https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_usequity_list.html)です。

### ティッカー取得プログラム

```
# SBI証券から海外のティッカーまたはコードと銘柄を取得
from bs4 import BeautifulSoup
import re, sys, time
import requests
import pandas as pd

sbi_foreign_stock_list = [
  {"america":   {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_usequity_list.html", "tag": "table", "c_cd":"", "class": "md-l-table-01 md-l-utl-mt10"}},
  {"china":     {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_hk_list.html",       "tag": "div",   "c_cd":"HK", "class": "accTbl01"}},
  {"korea":     {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_kr_list.html",       "tag": "div",   "c_cd":"KS", "class": "accTbl01"}},
  {"russia":    {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_ru_list.html",       "tag": "div",   "c_cd":"ME", "class": "accTbl01"}},
  {"vietnam":   {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_vn_list.html",       "tag": "div",   "c_cd":"VN", "class": "accTbl01"}},
  {"Indonesia": {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_id_list.html",       "tag": "div",   "c_cd":"JK", "class": "accTbl01"}},
  {"Singapore": {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_sg_list.html",       "tag": "div",   "c_cd":"SI", "class": "accTbl01"}}, # SBIとyahooのティカーが一致しない件
  {"thailand":  {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_th_list.html",       "tag": "div",   "c_cd":"BK", "class": "accTbl01"}},
  {"malaysia":  {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_my_list.html",       "tag": "div",   "c_cd":"KL", "class": "accTbl01"}} # SBIとyahooのティカーが一致しない件
]

for foreign_dict in sbi_foreign_stock_list:
  for country, values in foreign_dict.items():
    country_url = values["url"]
    country_tag = values["tag"]
    country_code = values["c_cd"]
    country_class = values["class"]
    html = requests.get(country_url)
    soup = BeautifulSoup(html.content, "html.parser")
    for table_soup in soup.find_all(country_tag, class_=country_class):
      stock_data = []
      rows = table_soup.find_all("tr")
      for row in rows[1:]:
        ticker = row.find_all("th")[0].text.strip()
        cols = row.find_all("td")
        name = cols[0].text.strip()
        stock_data.append((ticker, name))
      continue

    df_foreign_stock = pd.DataFrame(stock_data, columns=["コード", "銘柄名"])
    df_foreign_stock["コード"] = df_foreign_stock["コード"].astype(str) + country_code
    df_foreign_stock.to_csv(out_oth_fol + country + "_stock_list.csv")
    time.sleep(2)
```

これを流用すれば取得できますが、今のサイトではできません。少し前のサイトが[こちら](https://megalodon.jp/2021-1117-0941-36/https://search.sbisec.co.jp:443/v2/popwin/info/stock/pop6040_usequity_list.html)です。こちらであれば取得できますが、最新のティッカー情報が取れないので修正します。

それから件数の表示設定をする必要があるので**BeautifulSoup4**ではなく**pyppeteer**を使って取得しようと思います。**Selenium**という手段もありますが、一旦はpyppeteerを使っていきます。

### 終わりに

少し時間がなかったので今回はここまでにします。次回はSBIの海外ティッカーを取得できるようにします。国内は複数サイトを使わないといけないので、ある程度株価予測ができてから試します。ではでは。
