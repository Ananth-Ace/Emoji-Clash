// ════════════════════════════════════════════════════════════════════════
//  EMOJI UNITS  (unlock = level required to unlock)
// ════════════════════════════════════════════════════════════════════════
const EMOJI_DATA = {
  warrior: { emoji: '⚔️',  name: 'Warrior', hp: 500,  dmg: 80,  spd: 55,  range: 38,  rate: 1200, cost: 3, splash: false, unlock: 1  },
  archer:  { emoji: '🏹',  name: 'Archer',  hp: 200,  dmg: 105, spd: 78,  range: 135, rate: 950,  cost: 3, splash: false, unlock: 1  },
  speeder: { emoji: '⚡',  name: 'Speed',   hp: 150,  dmg: 50,  spd: 165, range: 28,  rate: 750,  cost: 2, splash: false, unlock: 1  },
  fire:    { emoji: '🔥',  name: 'Fire',    hp: 350,  dmg: 170, spd: 48,  range: 62,  rate: 1400, cost: 4, splash: true,  unlock: 3  },
  shield:  { emoji: '🛡️', name: 'Shield',  hp: 1100, dmg: 38,  spd: 40,  range: 32,  rate: 1400, cost: 4, splash: false, unlock: 4  },
  bomber:  { emoji: '💣',  name: 'Bomber',  hp: 280,  dmg: 300, spd: 65,  range: 80,  rate: 1900, cost: 4, splash: true,  unlock: 5  },
  wizard:  { emoji: '🧙',  name: 'Wizard',  hp: 260,  dmg: 145, spd: 52,  range: 165, rate: 1100, cost: 4, splash: false, unlock: 6  },
  ghost:   { emoji: '👻',  name: 'Ghost',   hp: 180,  dmg: 75,  spd: 135, range: 30,  rate: 800,  cost: 3, splash: false, unlock: 7, dodge: true },
  dragon:  { emoji: '🐉',  name: 'Dragon',  hp: 800,  dmg: 250, spd: 62,  range: 92,  rate: 1600, cost: 5, splash: true,  unlock: 9  },
  robot:   { emoji: '🤖',  name: 'Robot',   hp: 1500, dmg: 62,  spd: 36,  range: 35,  rate: 1200, cost: 5, splash: false, unlock: 11 },
  lion:    { emoji: '🦁',  name: 'Lion',    hp: 420,  dmg: 165, spd: 115, range: 36,  rate: 950,  cost: 4, splash: false, unlock: 13 },
  blast:   { emoji: '💥',  name: 'Blast',   hp: 100,  dmg: 550, spd: 82,  range: 105, rate: 99999,cost: 5, splash: true,  unlock: 15, oneShot: true }
};

// ════════════════════════════════════════════════════════════════════════
//  LEVELS  (20 total, 4 worlds of 5 levels each)
// ════════════════════════════════════════════════════════════════════════
const WORLD_THEMES = [
  { name: '🌿 Forest',  bgTop: 0x1a2e1a, bgBot: 0x0d2010, lane: 0x1b3d1b, borderColor: 0x44aa44 },
  { name: '🏜️ Desert', bgTop: 0x2e2010, bgBot: 0x1a1005, lane: 0x4a3010, borderColor: 0xddaa33 },
  { name: '🌊 Ocean',   bgTop: 0x0a1a3a, bgBot: 0x050d20, lane: 0x0a2040, borderColor: 0x33aadd },
  { name: '🌋 Volcano', bgTop: 0x2e0a0a, bgBot: 0x1a0505, lane: 0x3a1010, borderColor: 0xdd3333 }
];

const LEVEL_NAMES = [
  'Mossy Meadow','Fern Forest','Mushroom Grove','Crystal Creek','Ancient Oak',
  'Sandy Dunes','Cactus Canyon','Dust Storm','Scorpion Ridge','Mirage Oasis',
  'Coral Reef','Tsunami Bay','Kraken Deep','Shipwreck Cove','Atlantis Gate',
  'Lava Plains','Ember Ridge','Inferno Peak',"Dragon's Lair",'Final Clash'
];

function getAIUnits(lvl) {
  const pool = [];
  const all  = Object.keys(EMOJI_DATA);
  all.forEach(k => { if (EMOJI_DATA[k].unlock <= lvl + 2) pool.push(k); });
  return pool.length ? pool : ['warrior', 'speeder'];
}

const LEVELS = Array.from({ length: 20 }, (_, i) => {
  const lvl    = i + 1;
  const world  = Math.floor(i / 5);
  const theme  = WORLD_THEMES[world];
  return {
    id:           lvl,
    name:         LEVEL_NAMES[i],
    world,
    theme,
    aiInterval:   Math.max(1500, 4500 - i * 160),   // ms between AI deploys
    aiRegen:      +(0.70 + i * 0.047).toFixed(2),   // enemy energy/sec
    enemyBaseHP:  1500 + i * 105,
    playerBaseHP: 3000,
    coinsReward:  60 + lvl * 25,
    aiUnits:      getAIUnits(lvl)
  };
});

// ════════════════════════════════════════════════════════════════════════
//  UPGRADE SYSTEM
// ════════════════════════════════════════════════════════════════════════
const MAX_UPGRADE = 3;
const UPGRADE_MULT  = [1, 1.18, 1.40, 1.65];   // index = upgrade level
const UPGRADE_COSTS = [0, 100, 280, 600];        // cost to reach that level

// ════════════════════════════════════════════════════════════════════════
//  SAVE / LOAD  (localStorage)
// ════════════════════════════════════════════════════════════════════════
const SaveSystem = {
  KEY: 'emojiclash_v1',

  defaultSave() {
    const upgrades = {};
    Object.keys(EMOJI_DATA).forEach(k => {
      upgrades[k] = { hp: 0, dmg: 0, spd: 0 };
    });
    return {
      coins:          0,
      highestLevel:   1,
      upgrades,
      unlockedEmojis: ['warrior', 'archer', 'speeder']
    };
  },

  get() {
    try {
      const raw = localStorage.getItem(this.KEY);
      if (!raw) return this.defaultSave();
      const saved = JSON.parse(raw);
      // Back-fill any new emojis added after save was created
      const def = this.defaultSave();
      Object.keys(def.upgrades).forEach(k => {
        if (!saved.upgrades[k]) saved.upgrades[k] = { hp: 0, dmg: 0, spd: 0 };
      });
      return saved;
    } catch (e) { return this.defaultSave(); }
  },

  set(data) {
    try { localStorage.setItem(this.KEY, JSON.stringify(data)); } catch (e) {}
  },

  addCoins(amount) {
    const s = this.get();
    s.coins += amount;
    this.set(s);
    return s.coins;
  },

  unlockEmoji(type) {
    const s = this.get();
    if (!s.unlockedEmojis.includes(type)) {
      s.unlockedEmojis.push(type);
      this.set(s);
    }
  },

  unlockLevel(lvl) {
    const s = this.get();
    if (lvl > s.highestLevel) { s.highestLevel = lvl; this.set(s); }
  },

  // Returns effective stats after upgrades applied
  effectiveStats(type) {
    const base = EMOJI_DATA[type];
    const s    = this.get();
    const upg  = s.upgrades[type] || { hp: 0, dmg: 0, spd: 0 };
    return {
      ...base,
      hp:  Math.round(base.hp  * UPGRADE_MULT[upg.hp]),
      dmg: Math.round(base.dmg * UPGRADE_MULT[upg.dmg]),
      spd: Math.round(base.spd * UPGRADE_MULT[upg.spd])
    };
  },

  upgradeStats(type, stat) {
    const s   = this.get();
    const upg = s.upgrades[type];
    const cur = upg[stat];
    if (cur >= MAX_UPGRADE) return { ok: false, reason: 'Max level reached' };
    const cost = UPGRADE_COSTS[cur + 1];
    if (s.coins < cost) return { ok: false, reason: `Need ${cost} coins` };
    s.coins -= cost;
    upg[stat] = cur + 1;
    this.set(s);
    return { ok: true, newLevel: cur + 1, coinsLeft: s.coins };
  }
};
