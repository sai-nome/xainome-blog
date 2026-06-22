---
title: "短期売買と分析力が向上しそうな株価予測をだらだらとやる part7"
date: 2024-07-06
slug: "stock-price-prediction-part-7"
aliases:
  - "/posts/2024/07/短期売買と分析力が向上しそうな株価予測をだら-6/"
categories: 
  - "it"
tags: 
  - "サイノメ"
  - "株価予測"
cover:
  image: "images/stock-price-prediction-part-7-cover.png"
---

## 前回のあらすじ

オシレーター系指標の説明変数を追加するコードを書きました。

## 株価予測\_コード

今回やることは株価の予測になります。

今回は1ファイルずつ読み込んで実行しています。ティッカーリストがあればティッカーごとにダウンロードしてきて加工する方法もあったのでいずれやります。

```
import pandas as pd
import numpy as np
import yfinance as yf
from sklearn.linear_model import SGDRegressor
from sklearn.metrics import mean_squared_error
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
import matplotlib.pyplot as plt

dm_fol = './datamart/'

import glob
stock_list = glob.glob(dm_fol + "*.parquet")

def preprocess_data(df):

    df.sort_values('Date', inplace=True)
    # 日付を特徴量に変換
    df['Year'] = df['Date'].dt.year
    df['Month'] = df['Date'].dt.month
    df['Day'] = df['Date'].dt.day
    df['Weekday'] = df['Date'].dt.weekday
    df['Quarter'] = df['Date'].dt.quarter

    # 周期成分のエンコーディング
    df['Month_sin'] = np.sin(2 * np.pi * df['Month'] / 12)
    df['Month_cos'] = np.cos(2 * np.pi * df['Month'] / 12)
    df['Day_sin'] = np.sin(2 * np.pi * df['Day'] / 31)
    df['Day_cos'] = np.cos(2 * np.pi * df['Day'] / 31)
    df['Weekday_sin'] = np.sin(2 * np.pi * df['Weekday'] / 7)
    df['Weekday_cos'] = np.cos(2 * np.pi * df['Weekday'] / 7)

    # 日付を削除
    df.drop(columns=['symbol','Date'], inplace=True)
    # "symbol"以外のobject型カラムをワンホットエンコーディング
    df = pd.get_dummies(df, columns=[col for col in df.select_dtypes(include=['object']).columns])

    # 全ての値が欠損している列を削除
    df.dropna(axis=1, how='all', inplace=True)

    # 値が欠損している行を削除
    df.dropna(axis=0, how='any', inplace=True)
    return df

def train_model(df):
    target = df['Close'].shift(-1).dropna()
    features = df.drop(columns=['Close'])
    features = features[:-1]

    # データのスケーリング
    scaler = StandardScaler()
    X = scaler.fit_transform(features.values)
    y = target.values
    
    # データを7:3に分割
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42, shuffle=False)
    
    model = SGDRegressor(max_iter=1000, tol=1e-3)
    model.fit(X_train, y_train)
    
    return model, scaler, X_test, y_test

def evaluate_model(model, scaler, X_test, y_test):
    y_pred = model.predict(X_test)
    mse = mean_squared_error(y_test, y_pred)
    print(f"Mean Squared Error: {mse}")
    plt.figure(figsize=(14, 7))
    plt.plot(y_test, label='Actual', color='black')
    plt.plot(y_pred, label='Predicted', color='blue')
    plt.title('Actual vs Predicted Stock Prices')
    plt.xlabel('Sample')
    plt.ylabel('Price')
    plt.legend()
    plt.show()

def predict_next_day(model, scaler, df):
    last_row = df.iloc[-1, :-1].values.reshape(1, -1)
    df.iloc[-1, :-1].to_csv("test.csv")
    last_row_scaled = scaler.transform(last_row)
    next_day_prediction = model.predict(last_row_scaled)
    print(f"Next Day Prediction: {next_day_prediction[0]}")

# 初回データロードとモデル学習
# start_date = '1990-04-01'
# end_date = '2024-07-03'
# symbols = ['AAPL', 'MSFT', 'GOOGL']
for stock_data in stock_list:
  df = pd.read_parquet(stock_data)
  df = preprocess_data(df)
  model, scaler, X_test, y_test = train_model(df)

  # モデルの評価
  evaluate_model(model, scaler, X_test, y_test)

  # 次の日の予測
  predict_next_day(model, scaler, df)
```

## コードの内容

やったこととしては日付を特徴量に変換しました。

それから全て欠損のとなってるカラムと欠損になってる行があれば削除しました。

今回予測で使用したモデルはSGDRegressor(確率的勾配降下法)になります。一旦予測をしてみるということで実行しました。

最後に予測として次の日の'Close'を設定しました。こちらはうまくいってないのでもう少し試行錯誤しながらやってみます。

## 終わりに

加工の準備段階としてはある程度問題ないかと思いますが、予測の部分がまだまだですね。

私の知識と実践不足なのでもう少し勉強する必要があります。

また、モデルについては複数作成して複合的に見てみたいと考えています。ではでは。
