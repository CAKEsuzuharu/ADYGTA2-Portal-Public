# Googleスプレッドシート管理方法

## streamers シート

1行目は必ず以下にしてください。

| enabled | name | platform | id |
|---|---|---|---|
| TRUE | すずはる | twitch | cakesuzuharu |
| TRUE | あでぃよん公式 | youtube | UC6_4lZN6W0M1ycmwaDwzjlA |

- `enabled`: TRUEなら監視対象、FALSEなら監視しません。
- `name`: サイト上の表示名です。
- `platform`: `twitch` または `youtube` です。
- `id`: Twitchはlogin名、YouTubeはchannelIdです。

## settings シート

1行目は必ず以下にしてください。

| key | value |
|---|---|
| filterByKeyword | TRUE |
| keywords | ADYGTA,ADYGTA2,あでぃよんGTA,adygta,adygta2 |

- `filterByKeyword`: TRUEなら配信タイトルにkeywordsが含まれる配信だけ表示します。FALSEなら全配信を表示します。
- `keywords`: カンマ区切りで指定します。

## GitHub Secrets

GitHubの `Settings → Secrets and variables → Actions` に以下を登録してください。

- `TWITCH_CLIENT_ID`
- `TWITCH_CLIENT_SECRET`
- `YOUTUBE_API_KEY`
- `GOOGLE_SHEET_CSV_URL` — streamersシートのCSV公開URL
- `GOOGLE_SETTINGS_CSV_URL` — settingsシートのCSV公開URL

## 注意

この構成では、YouTubeはURL/handleではなくchannelIdを使います。
チャンネルURLは自動で `https://www.youtube.com/channel/<channelId>/live` になります。
