import Phaser from 'phaser';
import { SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { Bait } from '../entities/Bait';
import { CameraReticle } from '../entities/CameraReticle';
import { PHOTO_FRAME_HEIGHT, PHOTO_FRAME_WIDTH, PhotoCamera } from '../entities/PhotoCamera';
import { Player } from '../entities/Player';
import { createJungleMap } from '../world/createJungleMap';

const FLASH_RADIUS = 250;
const FLASH_COOLDOWN = 3000;
const MAX_BAIT = 3;
const BAIT_THROW_DISTANCE = 420;

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: CameraReticle;
  private photoCamera?: PhotoCamera;
  private hud?: Phaser.GameObjects.Container;
  private flashKey?: Phaser.Input.Keyboard.Key;
  private flashStatus?: Phaser.GameObjects.Text;
  private baitKey?: Phaser.Input.Keyboard.Key;
  private baitStatus?: Phaser.GameObjects.Text;
  private nextFlashAt = 0;
  private baitRemaining = MAX_BAIT;

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

    this.flashKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.baitKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);

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
      .text(24, 72, 'Move: WASD/arrows  |  Dodge: Space  |  Flash: F  |  Bait: Q  |  Photo: click', {
        backgroundColor: '#081712b8',
        color: '#b8cbbf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0);

    this.flashStatus = this.add
      .text(24, 126, 'FLASH [F]  READY', {
        backgroundColor: '#081712b8',
        color: '#f0d28d',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0);

    this.baitStatus = this.add
      .text(184, 126, `BAIT [Q]  ${this.baitRemaining}`, {
        backgroundColor: '#081712b8',
        color: '#d99a59',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        fontStyle: 'bold',
        padding: { x: 12, y: 8 },
      })
      .setScrollFactor(0);

    this.hud = this.add.container(0, 0, [title, controls, this.flashStatus]).setDepth(100);
    this.hud.add(this.baitStatus);

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

    if (this.flashKey && Phaser.Input.Keyboard.JustDown(this.flashKey)) {
      this.activateFlash();
    }

    if (this.baitKey && Phaser.Input.Keyboard.JustDown(this.baitKey)) {
      this.throwBait();
    }

    this.updateFlashStatus(time);
  }

  private readonly activateFlash = (): void => {
    if (!this.player || this.time.now < this.nextFlashAt) {
      return;
    }

    this.nextFlashAt = this.time.now + FLASH_COOLDOWN;
    const effectArea = new Phaser.Geom.Circle(this.player.x, this.player.y, FLASH_RADIUS);
    const pulse = this.add
      .circle(this.player.x, this.player.y, 28, 0xf7f0c5, 0.75)
      .setStrokeStyle(8, 0xffffff, 0.9)
      .setDepth(180);

    this.tweens.add({
      targets: pulse,
      radius: FLASH_RADIUS,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => pulse.destroy(),
    });

    this.cameras.main.flash(90, 255, 248, 210, false);
    this.events.emit('player-flash', effectArea);
  };

  private readonly updateFlashStatus = (time: number): void => {
    if (!this.flashStatus) {
      return;
    }

    const remaining = Math.max(0, this.nextFlashAt - time);
    this.flashStatus.setText(
      remaining === 0 ? 'FLASH [F]  READY' : `FLASH [F]  ${(remaining / 1000).toFixed(1)}s`,
    );
    this.flashStatus.setColor(remaining === 0 ? '#f0d28d' : '#7f9688');
  };

  private readonly throwBait = (): void => {
    if (!this.player || !this.reticle || !this.baitStatus || this.baitRemaining === 0) {
      return;
    }

    const direction = new Phaser.Math.Vector2(
      this.reticle.x - this.player.x,
      this.reticle.y - this.player.y,
    );
    const distance = Math.min(direction.length(), BAIT_THROW_DISTANCE);

    if (distance < 20) {
      return;
    }

    direction.normalize().scale(distance);
    const targetX = Phaser.Math.Clamp(this.player.x + direction.x, 30, WORLD_WIDTH - 30);
    const targetY = Phaser.Math.Clamp(this.player.y + direction.y, 30, WORLD_HEIGHT - 30);

    new Bait(this, this.player.x, this.player.y, targetX, targetY);
    this.baitRemaining -= 1;
    this.baitStatus.setText(`BAIT [Q]  ${this.baitRemaining}`);
    this.baitStatus.setColor(this.baitRemaining > 0 ? '#d99a59' : '#7f7064');
  };
}
