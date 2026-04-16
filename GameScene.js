class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }

  init(data) {
    this.levelId  = data.levelId || 1;
    this.levelCfg = LEVELS[this.levelId - 1];
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  CREATE
  // ═══════════════════════════════════════════════════════════════════════
  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;

    const cfg = this.levelCfg;

    // Layout
    this.HEADER_H = 45;
    this.UI_H     = 90;
    this.GAME_H   = this.H - this.HEADER_H - this.UI_H;
    this.UI_Y     = this.H - this.UI_H;
    this.laneYs   = [
      Math.round(this.HEADER_H + this.GAME_H * 0.165),
      Math.round(this.HEADER_H + this.GAME_H * 0.500),
      Math.round(this.HEADER_H + this.GAME_H * 0.835)
    ];
    this.PLAYER_BASE_X  = 52;
    this.ENEMY_BASE_X   = this.W - 52;
    this.PLAYER_SPAWN_X = 118;
    this.ENEMY_SPAWN_X  = this.W - 118;

    // Game state
    this.playerUnits   = [];
    this.enemyUnits    = [];
    this.playerEnergy  = 5;
    this.enemyEnergy   = 5;
    this.MAX_ENERGY    = 10;
    this.PLAYER_REGEN  = 1;
    this.ENEMY_REGEN   = cfg.aiRegen;
    this.playerBaseHP  = cfg.playerBaseHP;
    this.enemyBaseHP   = cfg.enemyBaseHP;
    this.BASE_PLAYER_MAX = cfg.playerBaseHP;
    this.BASE_ENEMY_MAX  = cfg.enemyBaseHP;
    this.gameTimeLeft  = 180;
    this.gameOver      = false;
    this.lastAITime    = 0;
    this.coinsEarned   = 0;
    this.selectedCardIdx  = -1;
    this.selectedCardType = null;
    this.laneOverlays     = [];

    // Auto-unlock emojis for this level
    const save = SaveSystem.get();
    Object.keys(EMOJI_DATA).forEach(k => {
      if (EMOJI_DATA[k].unlock <= this.levelId && !save.unlockedEmojis.includes(k)) {
        SaveSystem.unlockEmoji(k);
      }
    });

    // Stop menu music, game has its own feel (or keep playing)
    // AudioManager.stopMusic(); // uncomment to stop music in-game

    // Build scene
    this.buildBackground();
    this.buildBases();
    this.buildHeader();
    this.buildUI();

    // Mute button in-game
    this.makeMuteBtn(this.W - 30, 22);

    this.input.on('pointerdown', this.onLaneTap, this);
    this.time.addEvent({ delay: 1000, callback: this.onTick, callbackScope: this, loop: true });
    this.cameras.main.fadeIn(400);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  SCENE BUILDING
  // ═══════════════════════════════════════════════════════════════════════
  buildBackground() {
    const theme = this.levelCfg.theme;
    const bg = this.add.graphics();
    bg.fillGradientStyle(theme.bgTop, theme.bgTop, theme.bgBot, theme.bgBot, 1);
    bg.fillRect(0, this.HEADER_H, this.W, this.GAME_H);

    const bandH     = this.GAME_H / 3;
    const bandColor = theme.lane;
    this.laneYs.forEach((cy, i) => {
      const topY = this.HEADER_H + i * bandH;
      const g = this.add.graphics();
      g.fillStyle(bandColor, 0.22);
      g.fillRect(95, topY, this.W - 190, bandH);
      for (let x = 130; x < this.W - 130; x += 32) {
        const d = this.add.graphics();
        d.fillStyle(0xffffff, 0.05);
        d.fillRect(x, cy - 1, 18, 2);
      }
      const sep = this.add.graphics();
      sep.fillStyle(0xffffff, 0.07);
      sep.fillRect(95, topY, this.W - 190, 1);
    });

    // Level name watermark
    this.add.text(this.W / 2, this.HEADER_H + this.GAME_H / 2,
      `${this.levelCfg.theme.name}  ·  ${this.levelCfg.name}`, {
        fontSize: '11px', color: 'rgba(255,255,255,0.08)'
      }
    ).setOrigin(0.5);
  }

  buildBases() {
    this.playerBaseGfx = this.add.graphics();
    this.enemyBaseGfx  = this.add.graphics();
    const mid = this.HEADER_H + this.GAME_H / 2;
    this.add.text(this.PLAYER_BASE_X, mid, '🏰', { fontSize: '42px' }).setOrigin(0.5);
    this.add.text(this.ENEMY_BASE_X,  mid, '🏯', { fontSize: '42px' }).setOrigin(0.5);
    this.refreshBases();
  }

  refreshBases() {
    const topY = this.HEADER_H + 4;
    const bH   = this.GAME_H - 8;
    const bW   = 46;
    const drawBase = (gfx, cx, hp, maxHP, fill, stroke) => {
      gfx.clear();
      const r = hp / maxHP;
      gfx.fillStyle(fill, 0.55);
      gfx.fillRoundedRect(cx - bW / 2, topY + bH * (1 - r), bW, bH * r, 4);
      gfx.lineStyle(2, stroke, 1);
      gfx.strokeRoundedRect(cx - bW / 2, topY, bW, bH, 4);
    };
    drawBase(this.playerBaseGfx, this.PLAYER_BASE_X, this.playerBaseHP, this.BASE_PLAYER_MAX, 0x1565c0, 0x4fc3f7);
    drawBase(this.enemyBaseGfx,  this.ENEMY_BASE_X,  this.enemyBaseHP,  this.BASE_ENEMY_MAX,  0xb71c1c, 0xef5350);
  }

  buildHeader() {
    const hBg = this.add.graphics();
    hBg.fillStyle(0x080814, 1);
    hBg.fillRect(0, 0, this.W, this.HEADER_H);
    hBg.lineStyle(1, 0x2244aa, 0.4);
    hBg.lineBetween(0, this.HEADER_H, this.W, this.HEADER_H);

    this.playerHPText = this.add.text(14, this.HEADER_H / 2,
      `🏰  ${this.playerBaseHP}`, { fontSize: '13px', color: '#4fc3f7', fontStyle: 'bold' }
    ).setOrigin(0, 0.5);

    this.add.text(this.W / 2, this.HEADER_H / 2 - 8,
      `Lv${this.levelId}  ${this.levelCfg.name}`, { fontSize: '11px', color: '#556677' }
    ).setOrigin(0.5);

    this.timerText = this.add.text(this.W / 2, this.HEADER_H / 2 + 8,
      '3:00', { fontSize: '18px', color: '#ffd700', fontStyle: 'bold' }
    ).setOrigin(0.5);

    this.enemyHPText = this.add.text(this.W - 14, this.HEADER_H / 2,
      `${this.enemyBaseHP}  🏯`, { fontSize: '13px', color: '#ef5350', fontStyle: 'bold' }
    ).setOrigin(1, 0.5);
  }

  buildUI() {
    const uY   = this.UI_Y;
    const save = SaveSystem.get();

    const uiBg = this.add.graphics();
    uiBg.fillStyle(0x07071a, 1);
    uiBg.fillRect(0, uY, this.W, this.UI_H);
    uiBg.lineStyle(1, 0x2255cc, 0.4);
    uiBg.lineBetween(0, uY, this.W, uY);

    this.add.text(10, uY + 8, '⭐', { fontSize: '15px' });
    this.energyNumText = this.add.text(30, uY + 8, '5',
      { fontSize: '15px', color: '#ffd700', fontStyle: 'bold' });

    const ebBg = this.add.graphics();
    ebBg.fillStyle(0x1a1a3a, 1);
    ebBg.fillRoundedRect(10, uY + 30, 135, 12, 6);
    this.energyBarGfx = this.add.graphics();
    this.redrawEnergyBar();

    this.energyPips = [];
    for (let i = 0; i < this.MAX_ENERGY; i++) {
      this.energyPips.push(this.add.circle(15 + i * 13, uY + 52, 4, 0x1a1a3a));
    }
    this.redrawEnergyPips();

    // Build hand from unlocked emojis (up to 4)
    const unlocked   = save.unlockedEmojis.filter(t => EMOJI_DATA[t]);
    this.playerHand  = Phaser.Utils.Array.Shuffle([...unlocked]).slice(0, 4);

    const CW = 155, CH = 76;
    const cardStartX = 160;
    const spacing    = (this.W - cardStartX - 10) / 4;
    this.cardObjs    = [];
    this.playerHand.forEach((type, i) => {
      const cx = Math.round(cardStartX + i * spacing + spacing / 2);
      this.createCard(cx, uY + CH / 2 + 6, type, i, CW, CH);
    });
  }

  createCard(cx, cy, type, index, cW, cH) {
    const data = SaveSystem.effectiveStats(type);
    const bg   = this.add.graphics();
    this.drawCardVisual(bg, cx, cy, cW, cH, false);
    const emojiT = this.add.text(cx - cW / 2 + 30, cy - 2, data.emoji, { fontSize: '32px' }).setOrigin(0.5);
    const nameT  = this.add.text(cx + 22, cy - 14, data.name,        { fontSize: '11px', color: '#ccddff' }).setOrigin(0.5);
    const costT  = this.add.text(cx + 22, cy + 8,  `⭐ ${data.cost}`, { fontSize: '13px', color: '#ffd700', fontStyle: 'bold' }).setOrigin(0.5);
    const hit    = this.add.rectangle(cx, cy, cW, cH).setInteractive({ useHandCursor: true });
    hit.on('pointerdown', (ptr, lx, ly, evt) => { evt.stopPropagation(); this.onCardClick(index, type); });
    this.cardObjs.push({ bg, emojiT, nameT, costT, hit, type, cx, cy, cW, cH });
  }

  drawCardVisual(gfx, cx, cy, cW, cH, selected) {
    gfx.clear();
    gfx.fillStyle(selected ? 0x1e3d6e : 0x111a30, 1);
    gfx.fillRoundedRect(cx - cW / 2, cy - cH / 2, cW, cH, 8);
    gfx.lineStyle(selected ? 3 : 1.5, selected ? 0xffd700 : 0x2244aa, 1);
    gfx.strokeRoundedRect(cx - cW / 2, cy - cH / 2, cW, cH, 8);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  INPUT
  // ═══════════════════════════════════════════════════════════════════════
  onCardClick(index, type) {
    if (this.gameOver) return;
    const cost = EMOJI_DATA[type].cost;
    if (this.playerEnergy < cost) {
      const c = this.cardObjs[index];
      this.tweens.add({ targets: [c.bg, c.emojiT, c.nameT, c.costT],
        x: '+=5', duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    if (this.selectedCardIdx >= 0 && this.selectedCardIdx !== index) {
      const prev = this.cardObjs[this.selectedCardIdx];
      this.drawCardVisual(prev.bg, prev.cx, prev.cy, prev.cW, prev.cH, false);
    }
    if (this.selectedCardIdx === index) {
      const c = this.cardObjs[index];
      this.drawCardVisual(c.bg, c.cx, c.cy, c.cW, c.cH, false);
      this.selectedCardIdx = -1; this.selectedCardType = null;
      this.clearLaneOverlays(); return;
    }
    this.selectedCardIdx  = index;
    this.selectedCardType = type;
    this.drawCardVisual(this.cardObjs[index].bg, this.cardObjs[index].cx,
      this.cardObjs[index].cy, this.cardObjs[index].cW, this.cardObjs[index].cH, true);
    this.showLaneOverlays();
  }

  onLaneTap(ptr) {
    if (this.gameOver || this.selectedCardIdx < 0) return;
    const x = ptr.x, y = ptr.y;
    if (x < 95 || x > this.W - 95 || y < this.HEADER_H || y >= this.UI_Y) return;
    const laneIdx = Math.floor((y - this.HEADER_H) / (this.GAME_H / 3));
    if (laneIdx < 0 || laneIdx > 2) return;
    this.deployUnit(this.selectedCardType, laneIdx, true);
    const c = this.cardObjs[this.selectedCardIdx];
    if (c) this.drawCardVisual(c.bg, c.cx, c.cy, c.cW, c.cH, false);
    this.selectedCardIdx = -1; this.selectedCardType = null;
    this.clearLaneOverlays();
  }

  showLaneOverlays() {
    this.clearLaneOverlays();
    const bandH = this.GAME_H / 3;
    this.laneYs.forEach((cy, i) => {
      const topY = this.HEADER_H + i * bandH;
      const g = this.add.graphics();
      g.fillStyle(0xffd700, 0.09);
      g.fillRect(95, topY + 1, this.W - 190, bandH - 2);
      g.lineStyle(2, 0xffd700, 0.5);
      g.strokeRect(95, topY + 1, this.W - 190, bandH - 2);
      const arrow = this.add.text(this.W / 2, cy, '👆 Deploy here', {
        fontSize: '13px', color: '#ffd700'
      }).setOrigin(0.5);
      this.laneOverlays.push(g, arrow);
    });
  }

  clearLaneOverlays() {
    this.laneOverlays.forEach(o => o.destroy());
    this.laneOverlays = [];
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UNIT DEPLOYMENT
  // ═══════════════════════════════════════════════════════════════════════
  deployUnit(type, laneIdx, isPlayer) {
    // Apply upgrade multipliers for player, raw stats for AI
    const data = isPlayer ? SaveSystem.effectiveStats(type) : EMOJI_DATA[type];
    const x    = isPlayer ? this.PLAYER_SPAWN_X : this.ENEMY_SPAWN_X;
    const y    = this.laneYs[laneIdx];

    if (isPlayer) {
      this.playerEnergy -= data.cost;
      this.redrawEnergyBar();
      this.redrawEnergyPips();
      this.energyNumText.setText(`${Math.floor(this.playerEnergy)}`);
      AudioManager.playDeploy();
    } else {
      this.enemyEnergy -= data.cost;
    }

    const container  = this.add.container(x, y);
    const emojiT     = this.add.text(0, 0, data.emoji, { fontSize: '30px' }).setOrigin(0.5);
    const hpBgGfx    = this.add.graphics();
    const hpFillGfx  = this.add.graphics();

    hpBgGfx.fillStyle(0x222222, 0.85);
    hpBgGfx.fillRoundedRect(-19, -30, 38, 6, 3);

    if (!isPlayer) emojiT.setScale(-1, 1);
    container.add([hpBgGfx, hpFillGfx, emojiT]);

    const unit = {
      type, data,
      hp: data.hp, maxHp: data.hp,
      lane: laneIdx, isPlayer,
      state: 'marching',
      target: null, lastAttack: 0,
      container, emojiT, hpBgGfx, hpFillGfx
    };
    this.updateUnitHPBar(unit);

    container.setScale(0);
    this.tweens.add({ targets: container, scale: 1, duration: 220, ease: 'Back.easeOut' });

    if (isPlayer) this.playerUnits.push(unit);
    else          this.enemyUnits.push(unit);
    return unit;
  }

  updateUnitHPBar(unit) {
    const r = unit.hp / unit.maxHp;
    const c = r > 0.6 ? 0x44dd44 : r > 0.3 ? 0xdddd22 : 0xdd3333;
    unit.hpFillGfx.clear();
    unit.hpFillGfx.fillStyle(c, 1);
    unit.hpFillGfx.fillRoundedRect(-19, -30, Math.max(2, 38 * r), 6, 3);
  }

  destroyUnit(unit) {
    unit.state = 'dead';
    this.tweens.add({
      targets: unit.container, scale: 0, alpha: 0, y: unit.container.y - 28,
      duration: 280, onComplete: () => unit.container.destroy()
    });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════════════════════════════════════
  update(time, delta) {
    if (this.gameOver) return;
    const dt = delta / 1000;

    this.playerEnergy = Math.min(this.MAX_ENERGY, this.playerEnergy + this.PLAYER_REGEN * dt);
    this.enemyEnergy  = Math.min(this.MAX_ENERGY, this.enemyEnergy  + this.ENEMY_REGEN * dt);
    this.energyNumText.setText(`${Math.floor(this.playerEnergy)}`);
    this.redrawEnergyBar();
    this.redrawEnergyPips();

    this.processUnits(this.playerUnits, this.enemyUnits, true,  time, delta);
    this.processUnits(this.enemyUnits,  this.playerUnits, false, time, delta);

    this.playerUnits = this.playerUnits.filter(u => u.state !== 'dead');
    this.enemyUnits  = this.enemyUnits.filter(u => u.state !== 'dead');

    this.runEnemyAI(time);
  }

  processUnits(myUnits, theirUnits, isPlayer, time, delta) {
    const dir   = isPlayer ? 1 : -1;
    const dt    = delta / 1000;
    const baseX = isPlayer ? this.ENEMY_BASE_X : this.PLAYER_BASE_X;

    myUnits.forEach(unit => {
      if (unit.state === 'dead') return;

      if (unit.state === 'marching') {
        let nearest = null, nearestDist = Infinity;
        theirUnits.forEach(en => {
          if (en.state === 'dead' || en.lane !== unit.lane) return;
          const d = Math.abs(en.container.x - unit.container.x);
          if (d < unit.data.range && d < nearestDist) { nearestDist = d; nearest = en; }
        });

        const baseDist = Math.abs(baseX - unit.container.x);
        if (nearest) {
          unit.state = 'attacking'; unit.target = nearest;
        } else if (baseDist <= unit.data.range) {
          unit.state = 'attacking';
          unit.target = { isBase: true, side: isPlayer ? 'enemy' : 'player' };
        } else {
          unit.container.x += dir * unit.data.spd * dt;
        }
      }

      if (unit.state === 'attacking') {
        const tgt = unit.target;
        if (tgt && !tgt.isBase) {
          if (tgt.state === 'dead') { unit.state = 'marching'; unit.target = null; return; }
          if (Math.abs(tgt.container.x - unit.container.x) > unit.data.range * 1.6) {
            unit.state = 'marching'; unit.target = null; return;
          }
        }
        if (time - unit.lastAttack < unit.data.rate) return;
        unit.lastAttack = time;

        if (tgt.isBase) {
          if (tgt.side === 'enemy') {
            this.enemyBaseHP = Math.max(0, this.enemyBaseHP - unit.data.dmg);
            this.enemyHPText.setText(`${this.enemyBaseHP}  🏯`);
          } else {
            this.playerBaseHP = Math.max(0, this.playerBaseHP - unit.data.dmg);
            this.playerHPText.setText(`🏰  ${this.playerBaseHP}`);
          }
          this.refreshBases();
          if (this.enemyBaseHP <= 0 || this.playerBaseHP <= 0) {
            this.endGame(this.enemyBaseHP <= 0);
          }
          // One-shot units die after hitting base
          if (unit.data.oneShot) this.destroyUnit(unit);
        } else {
          if (unit.data.splash) {
            theirUnits.forEach(en => {
              if (en.state === 'dead' || en.lane !== unit.lane) return;
              if (Math.abs(en.container.x - unit.container.x) <= unit.data.range * 1.1) {
                this.applyDamage(en, unit.data.dmg * (en === tgt ? 1 : 0.55));
              }
            });
          } else {
            this.applyDamage(tgt, unit.data.dmg);
          }
          // Ghost dodge: 40% chance to negate damage on ghost units
          if (unit.data.oneShot) {
            this.createExplosionEffect(unit.container.x, unit.container.y);
            this.destroyUnit(unit);
          }
        }
      }
    });
  }

  applyDamage(unit, dmg) {
    if (unit.state === 'dead') return;
    // Ghost: 40% dodge
    if (unit.data.dodge && Math.random() < 0.4) {
      const miss = this.add.text(unit.container.x, unit.container.y - 20, 'MISS!',
        { fontSize: '12px', color: '#aaaaaa' }).setOrigin(0.5);
      this.tweens.add({ targets: miss, y: miss.y - 25, alpha: 0, duration: 600, onComplete: () => miss.destroy() });
      return;
    }
    unit.hp -= dmg;
    this.updateUnitHPBar(unit);
    AudioManager.playHit();
    this.tweens.add({ targets: unit.container, alpha: { from: 1, to: 0.2 }, duration: 70, yoyo: true });
    if (unit.hp <= 0) this.destroyUnit(unit);
  }

  createExplosionEffect(x, y) {
    AudioManager.playExplosion();
    const exp = this.add.text(x, y, '💥', { fontSize: '40px' }).setOrigin(0.5);
    this.tweens.add({ targets: exp, scale: { from: 0.5, to: 1.8 }, alpha: { from: 1, to: 0 },
      duration: 500, onComplete: () => exp.destroy() });
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  ENEMY AI
  // ═══════════════════════════════════════════════════════════════════════
  runEnemyAI(time) {
    if (time - this.lastAITime < this.levelCfg.aiInterval) return;
    this.lastAITime = time;

    const pool      = this.levelCfg.aiUnits;
    const affordable = pool.filter(t => EMOJI_DATA[t].cost <= this.enemyEnergy);
    if (!affordable.length) return;

    const type   = affordable[Phaser.Math.Between(0, affordable.length - 1)];
    const counts = [0, 0, 0];
    this.enemyUnits.forEach(u => { if (u.state !== 'dead') counts[u.lane]++; });
    const minVal = Math.min(...counts);
    const opts   = counts.reduce((a, c, i) => (c === minVal ? [...a, i] : a), []);
    const lane   = opts[Phaser.Math.Between(0, opts.length - 1)];

    this.deployUnit(type, lane, false);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  TIMER
  // ═══════════════════════════════════════════════════════════════════════
  onTick() {
    if (this.gameOver) return;
    this.gameTimeLeft--;
    const m = Math.floor(this.gameTimeLeft / 60);
    const s = this.gameTimeLeft % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);
    if (this.gameTimeLeft <= 30) this.timerText.setColor('#ff4444');
    if (this.gameTimeLeft <= 0) this.endGame(this.playerBaseHP >= this.enemyBaseHP);
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  UI HELPERS
  // ═══════════════════════════════════════════════════════════════════════
  makeMuteBtn(x, y) {
    const g = this.add.graphics();
    g.fillStyle(0x0a0a1a, 0.7);
    g.fillCircle(x, y, 16);
    const t = this.add.text(x, y, AudioManager.isMuted() ? '🔇' : '🔊', { fontSize: '16px' }).setOrigin(0.5);
    g.setInteractive(new Phaser.Geom.Circle(x, y, 16), Phaser.Geom.Circle.Contains);
    g.on('pointerdown', () => { const m = AudioManager.toggleMute(); t.setText(m ? '🔇' : '🔊'); });
  }

  redrawEnergyBar() {
    const r = this.playerEnergy / this.MAX_ENERGY;
    this.energyBarGfx.clear();
    this.energyBarGfx.fillStyle(0xffd700, 1);
    this.energyBarGfx.fillRoundedRect(10, this.UI_Y + 30, Math.max(4, 135 * r), 12, 6);
  }

  redrawEnergyPips() {
    const full = Math.floor(this.playerEnergy);
    this.energyPips.forEach((p, i) => p.setFillStyle(i < full ? 0xffd700 : 0x1a1a3a));
  }

  // ═══════════════════════════════════════════════════════════════════════
  //  GAME OVER
  // ═══════════════════════════════════════════════════════════════════════
  endGame(playerWon) {
    if (this.gameOver) return;
    this.gameOver = true;

    if (playerWon) {
      const coins = this.levelCfg.coinsReward;
      SaveSystem.addCoins(coins);
      SaveSystem.unlockLevel(Math.min(20, this.levelId + 1));
      this.coinsEarned = coins;
      AudioManager.playVictory();
    } else {
      AudioManager.playDefeat();
    }

    const label = this.add.text(this.W / 2, this.H / 2,
      playerWon ? '🏆  VICTORY!' : '💀  DEFEAT',
      { fontSize: '56px', fontStyle: 'bold',
        color: playerWon ? '#ffd700' : '#ff3333',
        stroke: '#000', strokeThickness: 6 }
    ).setOrigin(0.5).setAlpha(0);
    this.tweens.add({ targets: label, alpha: 1, scale: { from: 0.3, to: 1.1 }, duration: 480, ease: 'Back.easeOut' });

    this.cameras.main.fadeOut(900, 0, 0, 0);
    this.time.delayedCall(950, () => {
      this.scene.start('GameOverScene', {
        won:         playerWon,
        playerHP:    this.playerBaseHP,
        enemyHP:     this.enemyBaseHP,
        coinsEarned: this.coinsEarned,
        levelId:     this.levelId
      });
    });
  }
}
