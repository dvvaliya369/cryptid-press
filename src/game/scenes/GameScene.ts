import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';
import { CameraReticle } from '../entities/CameraReticle';
import { Player } from '../entities/Player';
import { createJungleMap } from '../world/createJungleMap';

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: CameraReticle;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    const map = createJungleMap(this);

    this.player = new Player(this, map.playerStart.x, map.playerStart.y);
    this.reticle = new CameraReticle(this, map.playerStart.x, map.playerStart.y - 120);
    this.physics.add.collider(this.player, map.obstacles);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setFollowOffset(0, 40);

    this.add
      .text(24, 22, 'CRYPTID PRESS  /  JUNGLE BLOCKOUT', {
        backgroundColor: '#081712cc',
        color: '#f4eed9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        padding: { x: 14, y: 10 },
      })
      .setScrollFactor(0)
      .setDepth(100);

    this.add
      .text(24, 72, 'Move: WASD or arrow keys  |  Aim: mouse', {
        backgroundColor: '#081712b8',
        color: '#b8cbbf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0)
      .setDepth(100);
  }

  update(time: number): void {
    if (!this.player || !this.reticle) {
      return;
    }

    this.reticle.update(this.input.activePointer, this.cameras.main);
    this.player.update(time, this.reticle.x, this.reticle.y);
  }
}
