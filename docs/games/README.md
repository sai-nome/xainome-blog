# ブラウザゲームの追加・管理

ゲーム一覧は `/games/`、各ゲームは `/games/<game-id>/` に配置します。
一覧は `content/games/` の公開ページから自動生成されます。ゲーム名を一覧HTMLに追記する必要はありません。

## ファイルの規則

`game-id` は半角英小文字・数字・ハイフンで統一します（例: `ai-controler`）。
公開後はURLとセーブの識別名を安易に変更しないでください。

| 場所 | 用途 |
| --- | --- |
| `content/games/_index.md` | ゲーム一覧のタイトル・説明 |
| `layouts/games/list.html` | 全ゲーム共通の一覧 |
| `content/games/<game-id>/index.md` | ゲームの公開情報 |
| `layouts/<game-id>/single.html` | ゲーム専用HTML |
| `layouts/_partials/games/<game-id>/` | ゲーム専用のHTML部品 |
| `assets/games/<game-id>/` | ゲーム専用のJS・CSS・画像等 |
| `scripts/games/<game-id>.test.cjs` | 必要なゲーム計算・動作のテスト |
| `docs/games/<game-id>.md` | ゲームの仕様と保守情報 |

## 新しいゲームを追加する

1. 重複しない `game-id` を決め、上記の専用フォルダーを作成します。
2. `content/games/<game-id>/index.md` に次の公開情報を記述します。

```yaml
---
title: "新しいゲーム"
description: "どんな遊びができるかを説明します。"
type: "<game-id>"
weight: 20
params:
  genre: "パズル"
  hiddenInHomeList: true
---
```

3. `layouts/<game-id>/single.html` にゲーム画面を作成します。独立した画面ならAI Controlerと同じく完全なHTML文書にし、ブログのCSSや他のゲームのスクリプトを読み込ませません。
4. JS・CSSはHugoの `resources.Get` と `fingerprint` で読み込みます。更新時にURLが変わり、古いキャッシュが残る問題を防げます。スクリプトの依存順序も指定してください。
5. 一覧は `weight` の小さい順に表示されます。制作中は `draft: true` を付けて公開ビルドから除外できます。
6. 保存キー・音量設定・チュートリアル設定・タブ間ロック・IndexedDB・キャッシュ名など、ブラウザーの識別名にはゲーム固有の接頭辞を付けます。同じドメインではURLのフォルダーを分けてもlocalStorageは共有されます。AI Controlerの保存キーを流用しないでください。

## 確認・ビルド

```powershell
npm run test:games
npm run build
hugo server --bind 127.0.0.1 --port 1313 --renderToMemory
```

- 一覧: `http://localhost:1313/games/`
- AI Controler: `http://localhost:1313/games/ai-controler/`
- `npm run test:games` は `scripts/games/*.test.cjs` を実行します。従来の `npm run test:game` も利用できます。
- `npm run build` は `public/` の古い生成ファイルも削除します。`public/` は生成専用とし、手書きファイルは置かないでください。
- プレビューは `--renderToMemory` を指定して、公開ビルドの `public/` と競合しないようにします。
- `wrangler.jsonc` の既存ビルド設定は `npm run build` を使用します。この整理では公開・デプロイは実行していません。
