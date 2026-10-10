import Phaser from 'phaser';

const PLAYER_TEXTURE = 'player-placeholder';
const MOVE_SPEED = 260;

type MovementKeys = {
  up: Phaser.Input.Keyboard.Key;
  down: Phaser.Input.Keyboard.Key;
  left: Phaser.Input.Keyboard.Key;
  right: Phaser.Input.Keyboard.Key;
};

export class Player extends Phaser.Physics.Arcade.Sprite {
  private readonly wasd: MovementKeys;
  private readonly cursors: Phaser.Types.Input.Keyboard.CursorKeys;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    createPlaceholderTexture(scene);
    super(scene, x, y, PLAYER_TEXTURE);

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    this.setDepth(20);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(18, 6, 10);

    const keyboard = scene.input.keyboard;
    if (!keyboard) {
      throw new Error('Keyboard input is unavailable');
    }

    this.wasd = keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as MovementKeys;
    this.cursors = keyboard.createCursorKeys();
  }

  update(time: number, aimX: number, aimY: number): void {
    const horizontal = Number(this.wasd.right.isDown || this.cursors.right.isDown)
      - Number(this.wasd.left.isDown || this.cursors.left.isDown);
    const vertical = Number(this.wasd.down.isDown || this.cursors.down.isDown)
      - Number(this.wasd.up.isDown || this.cursors.up.isDown);
    const direction = new Phaser.Math.Vector2(horizontal, vertical);

    this.setRotation(Phaser.Math.Angle.Between(this.x, this.y, aimX, aimY) + Math.PI / 2);

    if (direction.lengthSq() === 0) {
      this.setVelocity(0);
      this.setScale(1);
      return;
    }

    direction.normalize();
    this.setVelocity(direction.x * MOVE_SPEED, direction.y * MOVE_SPEED);
    this.setScale(1, 1 + Math.sin(time * 0.018) * 0.05);
  }
}

const createPlaceholderTexture = (scene: Phaser.Scene): void => {
  if (scene.textures.exists(PLAYER_TEXTURE)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x07130f, 0.35);
  graphics.fillEllipse(24, 48, 38, 14);
  graphics.fillStyle(0xf0d28d);
  graphics.fillCircle(24, 27, 20);
  graphics.lineStyle(5, 0x173c31);
  graphics.strokeCircle(24, 27, 17);
  graphics.fillStyle(0x55c6a2);
  graphics.fillTriangle(24, 0, 14, 19, 34, 19);
  graphics.generateTexture(PLAYER_TEXTURE, 48, 58);
  graphics.destroy();
};
