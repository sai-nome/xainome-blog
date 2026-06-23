---
title: "短期売買と分析力が向上しそうな株価予測をだらだらとやる part6"
date: 2024-07-02
slug: "stock-price-prediction-part-6"
aliases:
  - "/posts/2024/07/短期売買と分析力が向上しそうな株価予測をだら-5/"
categories: 
  - "it"
tags: 
  - "サイノメ"
  - "株価予測"
cover:
  image: "images/stock-price-prediction-part-6-cover.png"
  relative: true
---

## 前回のあらすじ

トレンド系指標の説明変数を追加したところで終わりました。

## オシレーター系指標

今回作成したのは

- RSI

- RCI

- 移動平均線乖離率

- スローストキャスティクス

- モメンタムとROC

- MFI

- CCI

- ギャップ

- ヒストリカル・ボラティリティ

```
def rsi(df):
  # RSIの計算
  window = 14

  # 終値の変化
  df['Change'] = df['Adj Close'].diff()

  # 上昇幅と下落幅の計算
  df['Gain'] = np.where(df['Change'] > 0, df['Change'], 0)
  df['Loss'] = np.where(df['Change'] < 0, -df['Change'], 0)

  # 平均上昇幅と平均下落幅の計算
  df['Avg_Gain'] = df['Gain'].rolling(window=window).mean()
  df['Avg_Loss'] = df['Loss'].rolling(window=window).mean()

  # 相対力（RS）の計算
  df['RS'] = df['Avg_Gain'] / df['Avg_Loss']

  # RSIの計算
  df['RSI'] = 100 - (100 / (1 + df['RS']))

  # シグナルの判定
  df['rsi_Signal'] = np.where(df['RSI'] > 70, 'Sell', np.where(df['RSI'] < 30, 'Buy', np.nan))

def calculate_rci(series):
    n = len(series)
    date_rank = np.arange(1, n + 1)
    price_rank = series.rank().values
    ssd = np.sum((date_rank - price_rank) ** 2)
    rci = 1 - (6 * ssd) / (n * (n ** 2 - 1))
    return rci

def rci(df):
  # RCIの計算
  window = 14

  df['RCI'] = df['Adj Close'].rolling(window=window).apply(calculate_rci, raw=False)

  # シグナルの判定（RSIと同様に70以上で売りシグナル、30以下で買いシグナル）
  df['rci_Signal'] = np.where(df['RCI'] > 70, 'Sell', np.where(df['RCI'] < 30, 'Buy', np.nan))

def madp(df):
  # 乖離率の計算
  df['madp'] = (df['Adj Close'] - df['SMA']) / df['SMA'] * 100

  # シグナルの判定
  df['madp_Signal'] = np.nan
  threshold = 5  # 閾値の設定

  for i in range(1, len(df)):
      if df['madp'].iloc[i-1] < -threshold and df['madp'].iloc[i] > df['madp'].iloc[i-1]:
          df.at[df.index[i], 'madp_Signal'] = 'Buy'
      elif df['madp'].iloc[i-1] > threshold and df['madp'].iloc[i] < df['madp'].iloc[i-1]:
          df.at[df.index[i], 'madp_Signal'] = 'Sell'

def stochastic(df):
  # %Kの計算
  window = 14
  df['14-High'] = df['High'].rolling(window=window).max()
  df['14-Low'] = df['Low'].rolling(window=window).min()
  df['%K'] = (df['Adj Close'] - df['14-Low']) / (df['14-High'] - df['14-Low']) * 100

  # スロー%Dの計算
  df['slow%D'] = df['%K'].rolling(window=3).mean()

  # シグナルの判定
  df['sto_Signal'] = np.nan
  for i in range(1, len(df)):
      if df['slow%D'].iloc[i-1] < 20 and df['slow%D'].iloc[i] > df['slow%D'].iloc[i-1]:
          df.at[df.index[i], 'sto_Signal'] = 'Buy'
      elif df['slow%D'].iloc[i-1] > 80 and df['slow%D'].iloc[i] < df['slow%D'].iloc[i-1]:
          df.at[df.index[i], 'sto_Signal'] = 'Sell'

def momentum_roc(df):
  # モメンタムとROCの計算
  window = 14
  df['Momentum'] = df['Adj Close'] - df['Adj Close'].shift(window)
  df['ROC'] = ((df['Adj Close'] - df['Adj Close'].shift(window)) / df['Adj Close'].shift(window)) * 100

  # トレンドの判定
  df['Momentum_Trend'] = np.where(df['Momentum'] > 0, 'Uptrend', np.where(df['Momentum'] < 0, 'Downtrend', 'Neutral'))
  df['ROC_Trend'] = np.where(df['ROC'] > 0, 'Uptrend', np.where(df['ROC'] < 0, 'Downtrend', 'Neutral'))

def mfi(df):
  # 典型価格（TP）の計算
  df['TP'] = (df['High'] + df['Low'] + df['Adj Close']) / 3

  # マネーフロー（Raw Money Flow）の計算
  df['Raw Money Flow'] = df['TP'] * df['Volume']

  # ポジティブマネーフローとネガティブマネーフローの計算
  df['Positive Money Flow'] = np.where(df['TP'] > df['TP'].shift(1), df['Raw Money Flow'], 0)
  df['Negative Money Flow'] = np.where(df['TP'] < df['TP'].shift(1), df['Raw Money Flow'], 0)

  # 14期間の合計
  window = 14
  df['Positive Money Flow Sum'] = df['Positive Money Flow'].rolling(window=window).sum()
  df['Negative Money Flow Sum'] = df['Negative Money Flow'].rolling(window=window).sum()

  # MFIの計算
  df['Money Flow Ratio'] = df['Positive Money Flow Sum'] / df['Negative Money Flow Sum']
  df['MFI'] = 100 - (100 / (1 + df['Money Flow Ratio']))

  # シグナルの判定
  df['mfi_Signal'] = np.nan
  for i in range(1, len(df)):
      if df['MFI'].iloc[i-1] < 20 and df['MFI'].iloc[i] > df['MFI'].iloc[i-1]:
          df.at[df.index[i], 'mfi_Signal'] = 'Buy'
      elif df['MFI'].iloc[i-1] > 80 and df['MFI'].iloc[i] < df['MFI'].iloc[i-1]:
          df.at[df.index[i], 'mfi_Signal'] = 'Sell'

def cci(df):
  # 典型価格（TP）の計算
  df['TP'] = (df['High'] + df['Low'] + df['Adj Close']) / 3

  # 単純移動平均（SMA）の計算
  window = 20
  df['cci_SMA'] = df['TP'].rolling(window=window).mean()

  # 偏差（Mean Deviation）の計算
  df['Mean Deviation'] = df['TP'].rolling(window=window).apply(lambda x: np.mean(np.abs(x - x.mean())), raw=True)

  # CCIの計算
  df['CCI'] = (df['TP'] - df['cci_SMA']) / (0.015 * df['Mean Deviation'])

  # シグナルの判定
  df['cci_Signal'] = np.nan
  for i in range(1, len(df)):
      if df['CCI'].iloc[i-1] < -100 and df['CCI'].iloc[i] > df['CCI'].iloc[i-1]:
          df.at[df.index[i], 'cci_Signal'] = 'Buy'
      elif df['CCI'].iloc[i-1] > 100 and df['CCI'].iloc[i] < df['CCI'].iloc[i-1]:
          df.at[df.index[i], 'cci_Signal'] = 'Sell'

def gap(df):
# ギャップアップとギャップダウンの計算
  df['Previous Close'] = df['Adj Close'].shift(1)
  df['Gap'] = df['Open'] - df['Previous Close']
  df['Gap Type'] = np.where(df['Gap'] > 0, 'Gap Up', np.where(df['Gap'] < 0, 'Gap Down', 'No Gap'))

def hv(df):
  # ヒストリカル・ボラティリティの計算
  window = 20

  # リターンの計算
  df['Return'] = np.log(df['Adj Close'] / df['Adj Close'].shift(1))

  # 標準偏差の計算
  df['HV'] = df['Return'].rolling(window=window).std() * np.sqrt(252)

  # df['RCI'] = df['Adj Close'].rolling(window=window).apply(calculate_rci, raw=False)

  # シグナルの判定
  df['hv_Signal'] = np.nan
  for i in range(1, len(df)):
      if df['RCI'].iloc[i-1] < -80 and df['RCI'].iloc[i] > df['RCI'].iloc[i-1]:
          df.at[df.index[i], 'hv_Signal'] = 'Buy'
      elif df['RCI'].iloc[i-1] > 80 and df['RCI'].iloc[i] < df['RCI'].iloc[i-1]:
          df.at[df.index[i], 'hv_Signal'] = 'Sell'
```

次回は予測をしていこうと思います。

取得した株価の量が多いのでどこまで有効活用できるかはわかりませんが、やれるだけやってみます。

予測の部分は一旦LSTMを使おうかと思いますが、Chat-GPTと相談しながら試行錯誤してみます。

ではでは。
