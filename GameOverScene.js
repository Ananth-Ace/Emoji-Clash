class GameOverScene extends Phaser.Scene {
  constructor() { super({ key: 'GameOverScene' }); }

  init(data) { this.result = data; }

  create() {
    const W   = this.scale.width;
    const H   = this.scale.height;
    const won = this.result.won;
    const lvl = this.result.levelId || 1;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0d1b3e, 0x0d1b3e, 1);
    bg.fillRect(0, 0, W, H);

    // Floating particles
    for (let i = 0; i < 35; i++) {
      const e = won
        ? Phaser.Utils.Array.GetRandom(['⭐','✨','🎉','🏆','💫','🌟'])
        : Phaser.Utils.Array.GetRandom(['💀','😵','❌','🌑','💨']);
      const t = this.add.text(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H),
        e, { fontSize: `${Phaser.Math.Between(14, 26)}px` }
      ).setAlpha(Phaser.Math.FloatBetween(0.15, 0.55));
      this.tweens.add({
        targets: t, y: t.y - Phaser.Math.Between(40, 100), alpha: 0,
        duration: Phaser.Math.Between(2000, 5000),
        delay: Phaser.Math.Between(0, 2500), repeat: -1,
        onRepeat: () => { t.setX(Phaser.Math.Between(0, W)); t.setY(H + 20); t.setAlpha(Phaser.Math.FloatBetween(0.15, 0.55)); }
      });
    }

    // Result banner
    const bannerGfx = this.add.graphics();
    bannerGfx.fillStyle(won ? 0x1a5c1a : 0x5c1a1a, 0.85);
    bannerGfx.fillRoundedRect(W / 2 - 220, H * 0.10, 440, 90, 14);
    bannerGfx.lineStyle(2, won ? 0xffd700 : 0xff4444, 1);
    bannerGfx.strokeRoundedRect(W / 2 - 220, H * 0.10, 440, 90, 14);

    const resultT = this.add.text(W / 2, H * 0.10 + 45,
      won ? '🏆  VICTORY!  🏆' : '💀  DEFEAT  💀', {
        fontSize: '42px', fontStyle: 'bold',
        color: won ? '#ffd700' : '#ff4444',
        stroke: '#000', strokeThickness: 4
      }
    ).setOrigin(0.5);
    this.tweens.add({ targets: resultT, scale: { from: 0.5, to: 1 }, duration: 500, ease: 'Back.easeOut' });

    // Level info
    const levelCfg = LEVELS[lvl - 1];
    this.add.text(W / 2, H * 0.32, `Level ${lvl}  ·  ${levelCfg.name}`, {
      fontSize: '16px', color: '#8899aa'
    }).setOrigin(0.5);

    // Stats panel
    const sY = H * 0.38;
    const statsBg = this.add.graphics();
    statsBg.fillStyle(0x0d1220, 0.9);
    statsBg.fillRoundedRect(W / 2 - 200, sY - 14, 400, 115, 10);

    this.add.text(W / 2, sY + 10, won ? '🏰  Your base survived!' : '🏯  Enemy conquered your base!', {
      fontSize: '17px', color: '#ccddee'
    }).setOrigin(0.5);

    this.add.text(W / 2, sY + 40, `Your Base HP:      ${this.result.playerHP.toLocaleString()}`, {
      fontSize: '15px', color: '#4fc3f7'
    }).setOrigin(0.5);

    this.add.text(W / 2, sY + 64, `Enemy Base HP:  ${this.result.enemyHP.toLocaleString()}`, {
      fontSize: '15px', color: '#ef5350'
    }).setOrigin(0.5);

    if (won && this.result.coinsEarned > 0) {
      AudioManager.playCoin();
      this.add.text(W / 2, sY + 90, `💰  +${this.result.coinsEarned} coins earned!`, {
        fontSize: '15px', color: '#ffd700', fontStyle: 'bold'
      }).setOrigin(0.5);
    }

    // Total coins
    const save = SaveSystem.get();
    this.add.text(W / 2, H * 0.68, `💰  Total: ${save.coins} coins`, {
      fontSize: '14px', color: '#ffd700'
    }).setOrigin(0.5);

    // ── Buttons ───────────────────────────────────────────────────────────
    if (won && lvl < 20) {
      this.makeBtn(W / 2, H * 0.76, '▶️  Next Level', 0x1a5c1a, 0x22aa22, 240, 50, '#88ff88', () => {
        this.cameras.main.fadeOut(260, 0, 0, 0);
        this.time.delayedCall(270, () => this.scene.start('GameScene', { levelId: lvl + 1 }));
      });
    }

    this.makeBtn(W / 2, won && lvl < 20 ? H * 0.87 : H * 0.77, '⚔️  Play Again', 0xffd700, 0xffaa00, 220, 48, '#0d0d20', () => {
      this.cameras.main.fadeOut(260, 0, 0, 0);
      this.time.delayedCall(270, () => this.scene.start('GameScene', { levelId: lvl }));
    });

    this.makeBtn(W / 2, won && lvl < 20 ? H * 0.95 : H * 0.89, '🗺️  Level Select', 0x1e2d4a, 0x334d7a, 200, 38, '#99aabb', () => {
      this.cameras.main.fadeOut(260, 0, 0, 0);
      this.time.delayedCall(270, () => this.scene.start('LevelSelectScene'));
    });

    this.cameras.main.fadeIn(500);
  }

  makeBtn(x, y, label, fill, hover, w, h, textColor, cb) {
    const g = this.add.graphics();
    const draw = (col) => {
      g.clear();
      g.fillStyle(col, 1);
      g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2);
    };
    draw(fill);
    g.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.add.text(x, y, label, { fontSize: `${Math.round(h * 0.42)}px`, fontStyle: 'bold', color: textColor }).setOrigin(0.5);
    g.on('pointerover', () => draw(hover));
    g.on('pointerout',  () => draw(fill));
    g.on('pointerdown', cb);
  }
}
