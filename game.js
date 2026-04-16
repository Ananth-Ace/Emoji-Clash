const config = {
  type: Phaser.AUTO,
  width: 854,
  height: 480,
  backgroundColor: '#0a0a1a',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [MenuScene, LevelSelectScene, UpgradeScene, GameScene, GameOverScene]
};

window.onload = () => new Phaser.Game(config);
