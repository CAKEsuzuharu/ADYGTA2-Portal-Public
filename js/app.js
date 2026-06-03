const iconSvg = {
  users: '<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  clipboard: '<svg viewBox="0 0 24 24"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 12h6M9 16h6"/></svg>',
  mountain: '<svg viewBox="0 0 24 24"><path d="m3 20 7-16 4 9 2-4 5 11H3z"/></svg>',
  chevron: '<svg viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></svg>',
  "chevron-left": '<svg viewBox="0 0 24 24"><path d="m15 18-6-6 6-6"/></svg>',
  tv: '<svg viewBox="0 0 24 24"><rect x="3" y="7" width="18" height="13" rx="2"/><path d="m8 3 4 4 4-4"/></svg>',
  heart: '<svg viewBox="0 0 24 24"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 0 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z"/></svg>',
  game: '<svg viewBox="0 0 24 24"><path d="M6 12h4m-2-2v4"/><path d="M15 13h.01M18 11h.01"/><path d="M6.5 8h11A4.5 4.5 0 0 1 22 12.5v1A4.5 4.5 0 0 1 17.5 18c-1.6 0-2.6-1-3.5-2h-4c-.9 1-1.9 2-3.5 2A4.5 4.5 0 0 1 2 13.5v-1A4.5 4.5 0 0 1 6.5 8Z"/></svg>',
};

const fallbackStreams = [
  { name: "ADYGTA公式", viewers: 0, image: "./assets/stream-1.jpg", platform: "youtube", status: "OFFLINE", title: "配信情報取得待ち", url: "#" },
  { name: "Twitchサンプル", viewers: 0, image: "./assets/stream-2.jpg", platform: "twitch", status: "OFFLINE", title: "配信情報取得待ち", url: "#" },
];

function injectIcons() {
  document.querySelectorAll("[data-icon]").forEach((el) => {
    el.innerHTML = iconSvg[el.dataset.icon] || "";
  });
}

function setActiveNav() {
  const page = document.body.dataset.page;

  document.querySelectorAll(".nav a").forEach((link) => {
    if (link.dataset.nav === page) {
      link.classList.add("active");
    }
  });
}

function setupMenu() {
  const button = document.querySelector(".menu-btn");
  const nav = document.querySelector(".nav");

  if (!button || !nav) return;

  button.addEventListener("click", () => {
    nav.classList.toggle("open");
  });
}

function platformIcon(platform) {
  const type = (platform || "twitch").toLowerCase();

  if (type === "youtube") {
    return '<span class="platform-icon youtube" aria-label="YouTube">▶</span>';
  }

  return '<span class="platform-icon twitch" aria-label="Twitch">T</span>';
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function streamCard(stream, index = 0) {
  const isLive = (stream.status || "OFFLINE").toUpperCase() === "LIVE";
  const delay = Math.min(index * 70, 420);
  const title = escapeHtml(stream.title || "配信情報取得待ち");
  const name = escapeHtml(stream.name || stream.channel || "Unknown");
  const image = escapeHtml(stream.image || "./assets/stream-1.jpg");
  const url = stream.url && stream.url !== "#" ? escapeHtml(stream.url) : null;
  const viewers = Number(stream.viewers || 0).toLocaleString("ja-JP");

  const inner = `
    <div class="thumb">
      <img src="${image}" alt="${name}" loading="lazy">
      ${isLive ? '<span class="live-badge">LIVE</span>' : '<span class="live-badge off">OFF</span>'}
      <span class="viewer-badge">
        <span class="viewer-icon">${iconSvg.users}</span>
        ${viewers}人
      </span>
    </div>
    <div class="stream-meta">
      ${platformIcon(stream.platform)}
      <b>${name}</b>
    </div>
    <p class="stream-title">${title}</p>
  `;

  if (url) {
    return `
      <a class="stream-card reveal-item" href="${url}" target="_blank" rel="noopener" style="transition-delay:${delay}ms">
        ${inner}
      </a>
    `;
  }

  return `
    <article class="stream-card reveal-item" style="transition-delay:${delay}ms">
      ${inner}
    </article>
  `;
}

function renderStreams(streams) {
  const liveGrid = document.getElementById("streamGrid");
  const listGrid = document.getElementById("streamListGrid");

  if (!liveGrid && !listGrid) return;

  const liveStreams = streams.filter((stream) => (stream.status || "OFFLINE").toUpperCase() === "LIVE");
  const liveTotal = document.getElementById("liveTotal");
  const totalViewers = document.getElementById("totalViewers");
  const checkedAt = document.getElementById("checkedAt");

  if (liveTotal) liveTotal.textContent = liveStreams.length;
  if (totalViewers) totalViewers.textContent = liveStreams.reduce((sum, s) => sum + Number(s.viewers || 0), 0).toLocaleString("ja-JP");
  if (checkedAt) checkedAt.textContent = window.__streamsUpdatedAt || "未更新";

  if (liveGrid) {
    liveGrid.innerHTML = liveStreams.length
      ? liveStreams.map(streamCard).join("")
      : '<p class="stream-empty">現在配信中のメンバーはいません。</p>';
  }

  if (listGrid) {
    listGrid.innerHTML = streams.map(streamCard).join("");
  }

  setupReveal();
}

async function loadStreams() {
  const liveGrid = document.getElementById("streamGrid");
  const listGrid = document.getElementById("streamListGrid");

  if (!liveGrid && !listGrid) return;

  renderStreams(fallbackStreams);

  try {
    const response = await fetch(`./data/streams.json?t=${Date.now()}`, { cache: "no-store" });

    if (!response.ok) {
      throw new Error("stream json not found");
    }

    const data = await response.json();
    const streams = data.streams || data;
    window.__streamsUpdatedAt = data.updatedAt ? new Date(data.updatedAt).toLocaleString("ja-JP") : "未更新";

    if (Array.isArray(streams) && streams.length) {
      renderStreams(streams);
    }
  } catch (error) {
    // data/streams.json がない場合でも最低限のカードを表示する
  }
}

function setupReveal() {
  const targets = [
    ...document.querySelectorAll(
      ".live-section, .feature-section, .text-grid article, .support-grid article, .timeline article, .apply-panel, .page-hero .container, .stream-card"
    ),
  ];

  if (!targets.length) return;

  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("is-visible"));
    return;
  }

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    {
      threshold: 0.16,
      rootMargin: "0px 0px -40px 0px",
    }
  );

  targets.forEach((el) => observer.observe(el));
}

injectIcons();
setActiveNav();
setupMenu();
setupReveal();
loadStreams();
