# ADYGTA2 Portal

静的HTML/CSS/JSのポータルサイトです。

## プレビュー

ZIPを展開して `index.html` を開くか、下記でローカルサーバーを起動します。

```bash
npm run dev
```

## 配信監視システム

Twitch / YouTube 混在対応です。参加者は `data/streamers.json` に手動で追加します。

### 1. 配信者リスト

```json
{
  "name": "表示名",
  "platform": "twitch",
  "url": "https://www.twitch.tv/xxxxx"
}
```

Twitchは `url` からログイン名を自動抽出します。既存の `login` を残しても動きます。

```json
{
  "name": "表示名",
  "platform": "youtube",
  "channelId": "YouTubeのチャンネルID",
  "url": "https://www.youtube.com/@xxxxx"
}
```

### 2. APIキー

`.env.example` をコピーして `.env` を作成します。

```bash
TWITCH_CLIENT_ID=
TWITCH_CLIENT_SECRET=
YOUTUBE_API_KEY=
```

TwitchはClient ID / Client Secret、YouTubeはYouTube Data API v3のAPIキーが必要です。

### 3. 更新

```bash
npm run update:streams
```

このコマンドで `data/streams.json` が更新されます。サイト側はこのJSONを読み込んで表示します。

### 4. 自動更新

本番ではサーバー側cronやGitHub Actions等で5分おきに下記を実行します。

```bash
npm run update:streams
```

`data/streamers.json` の `filterByKeyword` を `true` にすると、配信タイトルに `keywords` のいずれかが含まれる配信だけ表示します。

## YouTubeをハンドルで登録する場合

`channelId` が分からない場合は、`handle` または `url` だけでも登録できます。

```json
{
  "name": "日テレNEWS",
  "platform": "youtube",
  "handle": "ntv_news",
  "url": "https://www.youtube.com/@ntv_news"
}
```

`handle` は `ntv_news` / `@ntv_news` のどちらでも対応します。
既に `url` に `https://www.youtube.com/@...` が入っている場合も自動で判定します。
