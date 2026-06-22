---
title: "短期売買と分析力が向上しそうな株価予測をだらだらとやる part2"
date: 2024-06-13
slug: "stock-price-prediction-part-2"
aliases:
  - "/posts/2024/06/短期売買と分析力が向上しそうな株価予測をだら/"
categories: 
  - "it"
tags: 
  - "サイノメ"
  - "ティッカー"
  - "株価分析"
cover:
  image: "images/stock-price-prediction-part-2-cover.png"
---

## 前回までの話

前回ティッカーが取れないという話をしたがあれは嘘だ。

pyppeteerを使うといったがあれも嘘だ。

## ティッカー取得時の注意点

前回作成したものからほとんど変えることなくSBIに記載されている全てのティッカーを取得することができました。

ただ、注意点があります。

- アメリカ以外の国ではティッカーの後に特定の文字列をつける必要がある。
    - ベトナムの「DCL」であれば後ろに「.VN」をつけて「[DCL.VN](http://dcl.vn/)」にする必要がある。

- 中国(香港)の「000621」であれば後ろに「.HK」をつけて、さらに前の0を削除して「[00621.HK](http://00621.hk/)」にする必要がある。

- シンガポールとマレーシアに関しては扱うティッカーの文字列がそもそも違うので使えない。

- 日本の場合は東京で扱っているものは後ろに「.T」、札幌であれば「.S」が必要。

## 前回の修正箇所

日本はまだ取得してないですが上記の点に注意して、コード書いていく必要があります。修正した個所はここ

```
sbi_foreign_stock_list = [
  {"america":   {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_usequity_list.html", "tag": "table", "c_cd":"",    "class": "foo_table md-l-table-01 md-l-utl-mt10"}},
  {"china":     {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_hk_list.html",       "tag": "div",   "c_cd":".HK", "class": "accTbl01"}},
  {"korea":     {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_kr_list.html",       "tag": "div",   "c_cd":".KS", "class": "accTbl01"}},
  {"russia":    {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_ru_list.html",       "tag": "div",   "c_cd":".ME", "class": "accTbl01"}},
  {"vietnam":   {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_vn_list.html",       "tag": "div",   "c_cd":".VN", "class": "accTbl01"}},
  {"Indonesia": {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_id_list.html",       "tag": "div",   "c_cd":".JK", "class": "accTbl01"}},
  # {"Singapore": {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_sg_list.html",       "tag": "div",   "c_cd":".SI", "class": "accTbl01"}}, # SBIとyahooのティカーが一致しない件
  {"thailand":  {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_th_list.html",       "tag": "div",   "c_cd":".BK", "class": "accTbl01"}},
  # {"malaysia":  {"url": "https://search.sbisec.co.jp/v2/popwin/info/stock/pop6040_my_list.html",       "tag": "div",   "c_cd":".KL", "class": "accTbl01"}}, # SBIとyahooのティカーが一致しない件(SBIは英略、yahooは数値)
]
```

## 株価取得コード

修正するとティッカーリストが作られるので、取得したティッカーリストをもとに株価を取得すると以下のようなコードになります。

```
import pandas as pd
import glob
import pandas_datareader.data as web
import yfinance as yf
import datetime, time

inp_jap_fol = "./stock_list/japan_list/"
inp_oth_fol = "./stock_list/overseas_list/"
out_fol = "./stock_data/"

inp_file_jap_list = glob.glob(inp_jap_fol + "*.csv")
inp_file_oth_list = glob.glob(inp_oth_fol + "*.csv")

# 取得したい期間を設定
# 株価が出始めた時点から現在までのデータを取得
# 開始日を非常に古い日付（例: 1900年1月1日）に設定し、終了日には現在の日付を使用
start = datetime.datetime(1900, 1, 1)
end = datetime.datetime.now()

# Yahoo Financeからデータを取得
yf.pdr_override() #追加
for jap_file_list in inp_file_oth_list:
  jap_list = pd.read_csv(jap_file_list).values.tolist()
  for stock in jap_list:
    # df = yf.download(str(stock[1]), start, end)
    # 東京はT、札幌はSが後ろにつくので注意、アメリカは不要
    # df = web.get_data_yahoo([str(stock[1])+".T"], start, end)
    df = web.get_data_yahoo([str(stock[1])], start, end)
    print(df.info)
    df.to_csv(out_fol+stock[2]+".csv")
    time.sleep(2)
```

## 実装時の注意点

そういえばyahooファイナンスの**download**を実行するとエラーが出ます。オーバーライドしたうえでpandas\_datareaderの**get\_data\_yahoo**を使用すると取得できます。

globを使えば「.csv」がついているファイルをすべて取得することができます。

startの時間は1900年に設定していますが、取得したいデータは人によって異なるのでこの辺は調整してみてください。

連続で株価を取得することはできないので時間をおいて取得するようにしています。\*\*timpe.sleep(2)\*\*で2秒間待つ設定ができます。

## 終わりに

これでティッカーリストに載っている株価は全て取得できると思います。

いよいよ分析のほうに入ろうかと思います

分析するにあたってどの値を使用するのか？どんな加工をして計算データを作ればいいのか？この辺りはわからないのでChat-GPT先生に聞いてみて考えようと思います。

次は分析に関する話ではなく株価予測をするにあたり使われているデータや計算を中心にみていきます。ではでは。
