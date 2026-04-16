class LevelSelectScene extends Phaser.Scene {
  constructor() { super({ key: 'LevelSelectScene' }); }

  create() {
    const W    = this.scale.width;
    const H    = this.scale.height;
    const save = SaveSystem.get();

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0d1e, 0x0d0d1e, 0x050510, 0x050510, 1);
    bg.fillRect(0, 0, W, H);

    // Header
    const hdr = this.add.graphics();
    hdr.fillStyle(0x08081a, 1);
    hdr.fillRect(0, 0, W, 50);
    hdr.lineStyle(1, 0x2244aa, 0.5);
    hdr.lineBetween(0, 50, W, 50);

    this.add.text(W / 2, 25, '⚔️  Select Level', {
      fontSize: '22px', fontStyle: 'bold', color: '#ffd700'
    }).setOrigin(0.5);

    this.add.text(30, 25, `💰 ${save.coins}`, {
      fontSize: '16px', color: '#ffd700'
    }).setOrigin(0, 0.5);

    // Back button
    this.makeBackBtn(W - 40, 25, () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(260, () => this.scene.start('MenuScene'));
    });

    // World tabs (4 worlds)
    this.currentWorld = 0;
    this.worldBtns    = [];
    WORLD_THEMES.forEach((wt, wi) => {
      const bx = 100 + wi * 170;
      const g  = this.add.graphics();
      this.drawWorldTab(g, bx, 75, wt, wi === 0);
      const hit = this.add.rectangle(bx, 75, 155, 34).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.switchWorld(wi));
      this.worldBtns.push({ g, hit, wt, wi });
    });

    // Level grid container
    this.levelContainer = this.add.container(0, 0);
    this.buildGrid(save);

    this.cameras.main.fadeIn(350);
  }

  drawWorldTab(g, cx, cy, wt, active) {
    g.clear();
    g.fillStyle(active ? 0x1e3d6e : 0x0a0a1e, 1);
    g.fillRoundedRect(cx - 77, cy - 17, 154, 34, 8);
    g.lineStyle(active ? 2.5 : 1, active ? 0xffd700 : 0x334466, 1);
    g.strokeRoundedRect(cx - 77, cy - 17, 154, 34, 8);
    // text is separate — handled in create via static text
    if (!g._label) {
      g._label = this.add.text(cx, cy, wt.name, {
        fontSize: '13px', color: active ? '#ffd700' : '#667788'
      }).setOrigin(0.5);
    } else {
      g._label.setColor(active ? '#ffd700' : '#667788');
    }
  }

  switchWorld(wi) {
    this.currentWorld = wi;
    this.worldBtns.forEach(btn => this.drawWorldTab(btn.g, btn.g._label.x, 75, btn.wt, btn.wi === wi));
    this.levelContainer.removeAll(true);
    this.buildGrid(SaveSystem.get());
  }

  buildGrid(save) {
    const startLvl = this.currentWorld * 5 + 1;
    const cols     = 5;
    const bW = 138, bH = 70;
    const gapX = 18, gapY = 14;
    const totalW = cols * bW + (cols - 1) * gapX;
    const startX = (this.scale.width - totalW) / 2 + bW / 2;
    const startY = 130;

    for (let i = 0; i < 5; i++) {
      const lvl    = startLvl + i;
      const levelCfg = LEVELS[lvl - 1];
      const col    = i % cols;
      const row    = Math.floor(i / cols);
      const x      = startX + col * (bW + gapX);
      const y      = startY + row * (bH + gapY);

      const locked = lvl > save.highestLevel;

      // Card background
      const card = this.add.graphics();
      card.fillStyle(locked ? 0x0a0a18 : 0x111a30, 1);
      card.fillRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 10);
      card.lineStyle(locked ? 1 : 2, locked ? 0x222233 : levelCfg.theme.borderColor, 1);
      card.strokeRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 10);

      const numT  = this.add.text(x - bW / 2 + 14, y - 10, `${lvl}`, {
        fontSize: '22px', fontStyle: 'bold',
        color: locked ? '#334455' : '#ffffff'
      });
      const nameT = this.add.text(x - bW / 2 + 14, y + 12, levelCfg.name, {
        fontSize: '11px', color: locked ? '#334455' : '#aabbcc'
      });
      const coinT = this.add.text(x + bW / 2 - 10, y + 14, locked ? '🔒' : `💰${levelCfg.coinsReward}`, {
        fontSize: '12px', color: locked ? '#334455' : '#ffd700'
      }).setOrigin(1, 0.5);

      this.levelContainer.add([card, numT, nameT, coinT]);

      if (!locked) {
        const hit = this.add.rectangle(x, y, bW, bH).setInteractive({ useHandCursor: true });
        hit.on('pointerover',  () => { card.clear(); card.fillStyle(0x1e3060, 1); card.fillRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 10); card.lineStyle(2, 0xffd700, 1); card.strokeRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 10); });
        hit.on('pointerout',   () => { card.clear(); card.fillStyle(0x111a30, 1); card.fillRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 10); card.lineStyle(2, levelCfg.theme.borderColor, 1); card.strokeRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 10); });
        hit.on('pointerdown',  () => {
          this.cameras.main.fadeOut(260, 0, 0, 0);
          this.time.delayedCall(270, () => this.scene.start('GameScene', { levelId: lvl }));
        });
        this.levelContainer.add(hit);
      }
    }
  }

  makeBackBtn(x, y, cb) {
    const g = this.add.graphics();
    g.fillStyle(0x1e2a44, 1);
    g.fillRoundedRect(x - 28, y - 14, 56, 28, 14);
    g.setInteractive(new Phaser.Geom.Rectangle(x - 28, y - 14, 56, 28), Phaser.Geom.Rectangle.Contains);
    this.add.text(x, y, '← Back', { fontSize: '12px', color: '#aabbcc' }).setOrigin(0.5);
    g.on('pointerdown', cb);
  }
}
