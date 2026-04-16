class UpgradeScene extends Phaser.Scene {
  constructor() { super({ key: 'UpgradeScene' }); }

  create() {
    this.W = this.scale.width;
    this.H = this.scale.height;
    this.selectedType = null;

    this.buildScene();
    this.cameras.main.fadeIn(350);
  }

  buildScene() {
    this.children.removeAll(true);

    const save = SaveSystem.get();
    const W = this.W, H = this.H;

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

    this.add.text(W / 2, 25, '⬆️  Upgrades', {
      fontSize: '22px', fontStyle: 'bold', color: '#ffd700'
    }).setOrigin(0.5);

    this.coinText = this.add.text(30, 25, `💰 ${save.coins}`, {
      fontSize: '16px', color: '#ffd700'
    }).setOrigin(0, 0.5);

    // Back
    const backG = this.add.graphics();
    backG.fillStyle(0x1e2a44, 1);
    backG.fillRoundedRect(W - 68, 11, 56, 28, 14);
    backG.setInteractive(new Phaser.Geom.Rectangle(W - 68, 11, 56, 28), Phaser.Geom.Rectangle.Contains);
    this.add.text(W - 40, 25, '← Back', { fontSize: '12px', color: '#aabbcc' }).setOrigin(0.5);
    backG.on('pointerdown', () => {
      this.cameras.main.fadeOut(250, 0, 0, 0);
      this.time.delayedCall(260, () => this.scene.start('MenuScene'));
    });

    // Emoji grid
    const allTypes = Object.keys(EMOJI_DATA);
    const cols = 6;
    const bW = 115, bH = 80;
    const gapX = 14, gapY = 10;
    const totalW = cols * bW + (cols - 1) * gapX;
    const startX = (W - totalW) / 2 + bW / 2;
    const startY = 90;

    allTypes.forEach((type, i) => {
      const data    = EMOJI_DATA[type];
      const locked  = !save.unlockedEmojis.includes(type);
      const upg     = save.upgrades[type] || { hp: 0, dmg: 0, spd: 0 };
      const col     = i % cols;
      const row     = Math.floor(i / cols);
      const x       = startX + col * (bW + gapX);
      const y       = startY + row * (bH + gapY);

      const selected = this.selectedType === type;
      const card = this.add.graphics();
      card.fillStyle(selected ? 0x1e3d6e : (locked ? 0x0a0a18 : 0x111a30), 1);
      card.fillRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 8);
      card.lineStyle(selected ? 3 : 1.5, selected ? 0xffd700 : (locked ? 0x222233 : 0x2244aa), 1);
      card.strokeRoundedRect(x - bW / 2, y - bH / 2, bW, bH, 8);

      this.add.text(x, y - 18, data.emoji, { fontSize: '30px' }).setOrigin(0.5);
      this.add.text(x, y + 8, data.name, {
        fontSize: '11px', color: locked ? '#334455' : '#ccddff'
      }).setOrigin(0.5);

      if (locked) {
        this.add.text(x, y + 25, `🔒 Lv${data.unlock}`, {
          fontSize: '10px', color: '#445566'
        }).setOrigin(0.5);
      } else {
        // Upgrade level dots
        ['hp','dmg','spd'].forEach((stat, si) => {
          const dotX = x - 16 + si * 16;
          for (let d = 0; d < MAX_UPGRADE; d++) {
            this.add.circle(dotX + d * 5, y + 26, 3, d < upg[stat] ? 0xffd700 : 0x333355);
          }
        });

        const hit = this.add.rectangle(x, y, bW, bH).setInteractive({ useHandCursor: true });
        hit.on('pointerdown', () => {
          this.selectedType = this.selectedType === type ? null : type;
          this.buildScene();
        });
      }
    });

    // Upgrade panel (bottom area)
    const panelY = startY + 2 * (bH + gapY) + 10;
    const panelH = H - panelY - 10;

    const panel = this.add.graphics();
    panel.fillStyle(0x07071a, 1);
    panel.fillRoundedRect(20, panelY, W - 40, panelH, 10);
    panel.lineStyle(1, 0x2244aa, 0.5);
    panel.strokeRoundedRect(20, panelY, W - 40, panelH, 10);

    if (this.selectedType) {
      const type = this.selectedType;
      const data = EMOJI_DATA[type];
      const upg  = save.upgrades[type] || { hp: 0, dmg: 0, spd: 0 };
      const eff  = SaveSystem.effectiveStats(type);

      this.add.text(W / 2, panelY + 20, `${data.emoji}  ${data.name}  —  Upgrades`, {
        fontSize: '16px', fontStyle: 'bold', color: '#ffd700'
      }).setOrigin(0.5);

      const statLabels = { hp: '❤️ HP', dmg: '⚔️ DMG', spd: '👟 SPD' };
      const statColors = { hp: '#ff6666', dmg: '#ffaa33', spd: '#66ddff' };
      const statVals   = { hp: eff.hp, dmg: eff.dmg, spd: eff.spd };
      let bx = W / 2 - 240;

      ['hp', 'dmg', 'spd'].forEach((stat, si) => {
        const cx   = bx + si * 165 + 80;
        const cy   = panelY + 55;
        const cur  = upg[stat];
        const maxed = cur >= MAX_UPGRADE;
        const cost = maxed ? 0 : UPGRADE_COSTS[cur + 1];
        const canAfford = !maxed && save.coins >= cost;

        // Stat box
        const sBox = this.add.graphics();
        sBox.fillStyle(0x0d1428, 1);
        sBox.fillRoundedRect(cx - 75, cy - 30, 150, 90, 8);
        sBox.lineStyle(1.5, 0x2244aa, 0.7);
        sBox.strokeRoundedRect(cx - 75, cy - 30, 150, 90, 8);

        this.add.text(cx, cy - 14, statLabels[stat], {
          fontSize: '13px', color: statColors[stat], fontStyle: 'bold'
        }).setOrigin(0.5);

        this.add.text(cx, cy + 4, `${statVals[stat]}`, {
          fontSize: '14px', color: '#ffffff', fontStyle: 'bold'
        }).setOrigin(0.5);

        // Level dots
        for (let d = 0; d < MAX_UPGRADE; d++) {
          this.add.circle(cx - 15 + d * 15, cy + 24, 6, d < cur ? 0xffd700 : 0x222244);
        }

        // Upgrade button
        if (maxed) {
          this.add.text(cx, cy + 48, '✅ MAX', { fontSize: '12px', color: '#44dd44' }).setOrigin(0.5);
        } else {
          const btnG = this.add.graphics();
          btnG.fillStyle(canAfford ? 0x1e5520 : 0x331a1a, 1);
          btnG.fillRoundedRect(cx - 55, cy + 38, 110, 26, 13);
          btnG.lineStyle(1, canAfford ? 0x44dd44 : 0x552222, 1);
          btnG.strokeRoundedRect(cx - 55, cy + 38, 110, 26, 13);
          this.add.text(cx, cy + 51, canAfford ? `⬆️ ${cost} coins` : `🔒 ${cost}`, {
            fontSize: '12px', color: canAfford ? '#88ff88' : '#aa4444'
          }).setOrigin(0.5);

          if (canAfford) {
            const btnHit = this.add.rectangle(cx, cy + 51, 110, 26).setInteractive({ useHandCursor: true });
            btnHit.on('pointerdown', () => {
              const result = SaveSystem.upgradeStats(type, stat);
              if (result.ok) {
                // Unlock next emoji if applicable
                const newSave = SaveSystem.get();
                Object.keys(EMOJI_DATA).forEach(k => {
                  if (!newSave.unlockedEmojis.includes(k) && newSave.highestLevel >= EMOJI_DATA[k].unlock) {
                    SaveSystem.unlockEmoji(k);
                  }
                });
                this.buildScene();
              }
            });
          }
        }
      });
    } else {
      this.add.text(W / 2, panelY + panelH / 2, '👆  Tap an emoji above to upgrade it', {
        fontSize: '16px', color: '#445566'
      }).setOrigin(0.5);
    }
  }
}
