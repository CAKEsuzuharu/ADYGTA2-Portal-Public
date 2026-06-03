import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();

async function loadLocalEnv() {
  const envPath = path.join(root, '.env');
  try {
    const text = await fs.readFile(envPath, 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue;
      const [key, ...rest] = trimmed.split('=');
      if (!process.env[key]) process.env[key] = rest.join('=').trim();
    }
  } catch {}
}

await loadLocalEnv();
const streamersPath = path.join(root, 'data', 'streamers.json');
const outputPath = path.join(root, 'data', 'streams.json');
const placeholderImages = [
  './assets/stream-1.jpg',
  './assets/stream-2.jpg',
  './assets/stream-3.jpg',
  './assets/stream-4.jpg',
  './assets/stream-5.jpg',
];

const twitchClientId = process.env.TWITCH_CLIENT_ID || '';
const twitchClientSecret = process.env.TWITCH_CLIENT_SECRET || '';
const youtubeApiKey = process.env.YOUTUBE_API_KEY || '';

function includesKeyword(title = '', keywords = []) {
  if (!keywords.length) return true;
  const normalized = title.toLowerCase();
  return keywords.some((keyword) => normalized.includes(String(keyword).toLowerCase()));
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`${response.status} ${response.statusText}: ${body}`);
  }
  return response.json();
}

async function getTwitchToken() {
  if (!twitchClientId || !twitchClientSecret) return null;

  const params = new URLSearchParams({
    client_id: twitchClientId,
    client_secret: twitchClientSecret,
    grant_type: 'client_credentials',
  });

  const token = await fetchJson(`https://id.twitch.tv/oauth2/token?${params}`, { method: 'POST' });
  return token.access_token;
}


function normalizeTwitchLogin(value = '') {
  return String(value)
    .trim()
    .replace(/^https?:\/\/(www\.)?twitch\.tv\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .toLowerCase();
}

function extractTwitchLogin(item) {
  if (item.login) return normalizeTwitchLogin(item.login);
  if (item.url && /twitch\.tv\//i.test(item.url)) return normalizeTwitchLogin(item.url);
  return '';
}

async function getTwitchStreams(streamers, keywords, filterByKeyword) {
  const token = await getTwitchToken();
  if (!token) return [];

  const twitchStreamers = streamers
    .filter((item) => item.platform === 'twitch')
    .map((item) => ({ ...item, login: extractTwitchLogin(item) }))
    .filter((item) => item.login);

  if (!twitchStreamers.length) return [];

  const params = new URLSearchParams();
  twitchStreamers.forEach((item) => params.append('user_login', item.login));

  const data = await fetchJson(`https://api.twitch.tv/helix/streams?${params}`, {
    headers: {
      'Client-ID': twitchClientId,
      Authorization: `Bearer ${token}`,
    },
  });

  const byLogin = new Map(twitchStreamers.map((item) => [item.login.toLowerCase(), item]));

  return (data.data || [])
    .filter((stream) => !filterByKeyword || includesKeyword(stream.title, keywords))
    .map((stream, index) => {
      const login = String(stream.user_login || '').toLowerCase();
      const base = byLogin.get(login) || {};
      return {
        name: base.name || stream.user_name,
        platform: 'twitch',
        status: 'LIVE',
        title: stream.title,
        viewers: stream.viewer_count || 0,
        image: stream.thumbnail_url
          ? stream.thumbnail_url.replace('{width}', '640').replace('{height}', '360')
          : placeholderImages[index % placeholderImages.length],
        url: base.url || `https://www.twitch.tv/${stream.user_login}`,
        startedAt: stream.started_at,
      };
    });
}

function normalizeYouTubeHandle(value = '') {
  return String(value).trim().replace(/^https?:\/\/(www\.)?youtube\.com\//, '').replace(/^@/, '').split(/[/?#]/)[0];
}

function extractYouTubeHandle(item) {
  if (item.handle) return normalizeYouTubeHandle(item.handle);
  if (item.url && item.url.includes('youtube.com/@')) return normalizeYouTubeHandle(item.url.split('youtube.com/@')[1]);
  return '';
}

function isValidYouTubeChannelId(value = '') {
  return /^UC[a-zA-Z0-9_-]{20,}$/.test(String(value).trim()) && !String(value).includes('x');
}

async function resolveYouTubeChannelId(item) {
  if (isValidYouTubeChannelId(item.channelId)) return item.channelId.trim();

  const handle = extractYouTubeHandle(item);
  if (!handle) return '';

  const params = new URLSearchParams({
    part: 'id',
    forHandle: `@${handle}`,
    key: youtubeApiKey,
  });

  const data = await fetchJson(`https://www.googleapis.com/youtube/v3/channels?${params}`);
  return data.items?.[0]?.id || '';
}

async function getYouTubeStreams(streamers, keywords, filterByKeyword) {
  if (!youtubeApiKey) return [];

  const youtubeStreamers = streamers.filter((item) => item.platform === 'youtube' && (item.channelId || item.handle || item.url));
  const results = [];

  for (const item of youtubeStreamers) {
    const channelId = await resolveYouTubeChannelId(item);
    if (!channelId) {
      console.warn(`[youtube] skipped: channel id not found for ${item.name || item.handle || item.url || 'unknown'}`);
      continue;
    }

    const searchParams = new URLSearchParams({
      part: 'snippet',
      channelId,
      eventType: 'live',
      type: 'video',
      maxResults: '1',
      key: youtubeApiKey,
    });

    const search = await fetchJson(`https://www.googleapis.com/youtube/v3/search?${searchParams}`);
    const video = search.items?.[0];
    if (!video) continue;

    const title = video.snippet?.title || 'YouTube Live';
    if (filterByKeyword && !includesKeyword(title, keywords)) continue;

    const videoId = video.id?.videoId;
    let viewers = 0;

    if (videoId) {
      const videoParams = new URLSearchParams({
        part: 'liveStreamingDetails',
        id: videoId,
        key: youtubeApiKey,
      });
      const videoData = await fetchJson(`https://www.googleapis.com/youtube/v3/videos?${videoParams}`);
      viewers = Number(videoData.items?.[0]?.liveStreamingDetails?.concurrentViewers || 0);
    }

    results.push({
      name: item.name || video.snippet?.channelTitle || 'YouTube',
      platform: 'youtube',
      status: 'LIVE',
      title,
      viewers,
      image: video.snippet?.thumbnails?.high?.url || video.snippet?.thumbnails?.medium?.url || './assets/stream-1.jpg',
      url: videoId ? `https://www.youtube.com/watch?v=${videoId}` : item.url || '#',
      startedAt: video.snippet?.publishedAt,
    });
  }

  return results;
}

function offlineRows(streamers) {
  return streamers.map((item, index) => ({
    name: item.name || item.login || item.handle || item.channelId || 'Unknown',
    platform: item.platform,
    status: 'OFFLINE',
    title: '配信情報取得待ち',
    viewers: 0,
    image: item.image || placeholderImages[index % placeholderImages.length],
    url: item.url || (item.platform === 'twitch' && extractTwitchLogin(item) ? `https://www.twitch.tv/${extractTwitchLogin(item)}` : item.platform === 'youtube' && item.handle ? `https://www.youtube.com/@${normalizeYouTubeHandle(item.handle)}` : '#'),
  }));
}

async function main() {
  const config = JSON.parse(await fs.readFile(streamersPath, 'utf8'));
  const streamers = config.streamers || [];
  const keywords = config.keywords || [];
  const filterByKeyword = Boolean(config.filterByKeyword);

  const [twitchLive, youtubeLive] = await Promise.all([
    getTwitchStreams(streamers, keywords, filterByKeyword).catch((error) => {
      console.warn('[twitch] skipped:', error.message);
      return [];
    }),
    getYouTubeStreams(streamers, keywords, filterByKeyword).catch((error) => {
      console.warn('[youtube] skipped:', error.message);
      return [];
    }),
  ]);

  const live = [...twitchLive, ...youtubeLive];
  const liveKeys = new Set(live.map((item) => `${item.platform}:${item.name}`.toLowerCase()));
  const offline = offlineRows(streamers).filter((item) => !liveKeys.has(`${item.platform}:${item.name}`.toLowerCase()));

  const output = {
    updatedAt: new Date().toISOString(),
    liveCount: live.length,
    totalViewers: live.reduce((sum, item) => sum + Number(item.viewers || 0), 0),
    streams: [...live.sort((a, b) => b.viewers - a.viewers), ...offline],
  };

  await fs.writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`, 'utf8');
  console.log(`updated ${path.relative(root, outputPath)} (${live.length} live / ${streamers.length} streamers)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
