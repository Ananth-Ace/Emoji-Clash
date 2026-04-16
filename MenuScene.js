class MenuScene extends Phaser.Scene {
  constructor() { super({ key: 'MenuScene' }); }

  create() {
    const W    = this.scale.width;
    const H    = this.scale.height;
    const save = SaveSystem.get();

    // Start music on first interaction
    this.input.once('pointerdown', () => AudioManager.startMusic());

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x0d1b3e, 0x0d1b3e, 1);
    bg.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 100; i++) {
      const s = this.add.circle(
        Phaser.Math.Between(0, W), Phaser.Math.Between(0, H * 0.75),
        Phaser.Math.FloatBetween(0.7, 2.2), 0xffffff,
        Phaser.Math.FloatBetween(0.2, 0.9)
      );
      this.tweens.add({
        targets: s, alpha: { from: s.alpha * 0.15, to: s.alpha },
        duration: Phaser.Math.Between(900, 3200), yoyo: true, repeat: -1
      });
    }

    // Title
    const title = this.add.text(W / 2, H * 0.13, 'EMOJI CLASH', {
      fontSize: '56px', fontStyle: 'bold',
      color: '#ffd700', stroke: '#cc5500', strokeThickness: 6
    }).setOrigin(0.5);
    this.tweens.add({ targets: title, y: title.y + 7, duration: 1800, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    this.add.text(W / 2, H * 0.26, '⚡  Arena Battle of the Emojis  ⚡', {
      fontSize: '17px', color: '#aabbee'
    }).setOrigin(0.5);

    // Emoji parade
    ['🏰','⚔️','🏹','🔥','🧙'].forEach((e, i) => {
      const t = this.add.text(50 + i * 80, H * 0.46, e, { fontSize: '34px' }).setOrigin(0.5);
      this.tweens.add({ targets: t, x: t.x + 14, duration: 650 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    ['🏯','⚡','🛡️','💣','🐉'].forEach((e, i) => {
      const t = this.add.text(W - 50 - i * 80, H * 0.46, e, { fontSize: '34px' }).setOrigin(0.5);
      this.tweens.add({ targets: t, x: t.x - 14, duration: 650 + i * 110, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    const vs = this.add.text(W / 2, H * 0.46, 'VS', {
      fontSize: '42px', fontStyle: 'bold', color: '#ff4444', stroke: '#fff', strokeThickness: 3
    }).setOrigin(0.5);
    this.tweens.add({ targets: vs, scale: { from: 1, to: 1.2 }, duration: 550, yoyo: true, repeat: -1 });

    // Coins + level progress
    const highLvl = save.highestLevel;
    this.add.text(W / 2, H * 0.60,
      `💰  ${save.coins} coins   |   📍 Level ${highLvl} reached`, {
        fontSize: '16px', color: '#ffd700'
      }
    ).setOrigin(0.5);

    // ── Buttons ──────────────────────────────────────────────────────────
    this.makeBtn(W / 2, H * 0.70, '⚔️   PLAY   ⚔️', 0xffd700, 0xffaa00, 260, 52, '#0d0d20', () => {
      AudioManager.playClick();
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.time.delayedCall(290, () => this.scene.start('LevelSelectScene'));
    });

    this.makeBtn(W / 2, H * 0.82, '⬆️   UPGRADES', 0x1e3d6e, 0x2a5598, 220, 42, '#aaddff', () => {
      AudioManager.playClick();
      this.cameras.main.fadeOut(280, 0, 0, 0);
      this.time.delayedCall(290, () => this.scene.start('UpgradeScene'));
    });

    // Mute button
    this.makeMuteBtn(W - 36, 24);

    this.add.text(W / 2, H * 0.93, '📖  Select card → Tap lane to deploy  |  💥 Destroy enemy base to win', {
      fontSize: '12px', color: '#556677'
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(450);
  }

  makeBtn(x, y, label, fill, hover, w, h, textColor, cb) {
    const g = this.add.graphics();
    const draw = col => { g.clear(); g.fillStyle(col, 1); g.fillRoundedRect(x - w / 2, y - h / 2, w, h, h / 2); };
    draw(fill);
    g.setInteractive(new Phaser.Geom.Rectangle(x - w / 2, y - h / 2, w, h), Phaser.Geom.Rectangle.Contains);
    this.add.text(x, y, label, { fontSize: `${Math.round(h * 0.42)}px`, fontStyle: 'bold', color: textColor }).setOrigin(0.5);
    g.on('pointerover', () => draw(hover));
    g.on('pointerout',  () => draw(fill));
    g.on('pointerdown', cb);
  }

  makeMuteBtn(x, y) {
    const g = this.add.graphics();
    const t = this.add.text(x, y, AudioManager.isMuted() ? '🔇' : '🔊', { fontSize: '20px' }).setOrigin(0.5);
    g.fillStyle(0x1e2a44, 0.8);
    g.fillCircle(x, y, 18);
    g.setInteractive(new Phaser.Geom.Circle(x, y, 18), Phaser.Geom.Circle.Contains);
    g.on('pointerdown', () => {
      const muted = AudioManager.toggleMute();
      t.setText(muted ? '🔇' : '🔊');
    });
  }
}
