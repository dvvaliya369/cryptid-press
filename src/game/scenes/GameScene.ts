import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';
import { CameraReticle } from '../entities/CameraReticle';
import { PHOTO_FRAME_HEIGHT, PHOTO_FRAME_WIDTH, PhotoCamera } from '../entities/PhotoCamera';
import { Player } from '../entities/Player';
import { createJungleMap } from '../world/createJungleMap';

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: CameraReticle;
  private photoCamera?: PhotoCamera;
  private hud?: Phaser.GameObjects.Container;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    const map = createJungleMap(this);

    this.player = new Player(this, map.playerStart.x, map.playerStart.y);
    this.reticle = new CameraReticle(this, map.playerStart.x, map.playerStart.y - 120);
    this.photoCamera = new PhotoCamera(this, this.reticle.x, this.reticle.y);
    this.physics.add.collider(this.player, map.obstacles);

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setFollowOffset(0, 40);

    const title = this.add
      .text(24, 22, 'CRYPTID PRESS  /  JUNGLE BLOCKOUT', {
        backgroundColor: '#081712cc',
        color: '#f4eed9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        padding: { x: 14, y: 10 },
      })
      .setScrollFactor(0);

    const controls = this.add
      .text(24, 72, 'Move: WASD or arrow keys  |  Aim: mouse  |  Photo: left click', {
        backgroundColor: '#081712b8',
        color: '#b8cbbf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0);

    this.hud = this.add.container(0, 0, [title, controls]).setDepth(100);

    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
      if (
        !pointer.leftButtonDown()
        || !this.photoCamera
        || !this.reticle
        || !this.player
        || !this.hud
      ) {
        return;
      }

      this.photoCamera.capture(this.cameras.main, [this.reticle, this.player, this.hud]);
    });
  }

  update(time: number): void {
    if (!this.player || !this.reticle || !this.photoCamera) {
      return;
    }

    this.reticle.update(
      this.input.activePointer,
      this.cameras.main,
      PHOTO_FRAME_WIDTH / 2 + 12,
      PHOTO_FRAME_HEIGHT / 2 + 12,
    );
    this.photoCamera.update(time, this.reticle.x, this.reticle.y);
    this.player.update(time, this.reticle.x, this.reticle.y);
  }
}
