const CACHE = 'emoji-clash-v1';
const FILES = [
  '/Emoji-Clash/',
  '/Emoji-Clash/index.html',
  '/Emoji-Clash/constants.js',
  '/Emoji-Clash/audio.js',
  '/Emoji-Clash/game.js',
  '/Emoji-Clash/MenuScene.js',
  '/Emoji-Clash/LevelSelectScene.js',
  '/Emoji-Clash/UpgradeScene.js',
  '/Emoji-Clash/GameScene.js',
  '/Emoji-Clash/GameOverScene.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(r => r || fetch(e.request))
  );
});
