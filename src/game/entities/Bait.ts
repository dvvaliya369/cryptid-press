import Phaser from 'phaser';

export const BAIT_ATTRACTION_RADIUS = 190;

const BAIT_LIFETIME = 9000;

export class Bait extends Phaser.GameObjects.Container {
  private landed = false;

  constructor(scene: Phaser.Scene, startX: number, startY: number, targetX: number, targetY: number) {
    super(scene, startX, startY);
    scene.add.existing(this);

    const shadow = scene.add.ellipse(0, 10, 30, 13, 0x07130f, 0.35);
    const pouch = scene.add.circle(0, 0, 13, 0xd88b4e);
    pouch.setStrokeStyle(3, 0x6f3e29);
    const tie = scene.add.rectangle(0, -13, 12, 6, 0xf0d28d);

    this.add([shadow, pouch, tie]);
    this.setDepth(12);
    this.setScale(0.65);

    const distance = Phaser.Math.Distance.Between(startX, startY, targetX, targetY);
    const duration = Phaser.Math.Clamp(distance * 0.85, 220, 420);

    scene.tweens.add({
      targets: this,
      x: targetX,
      y: targetY,
      angle: 360,
      scale: 1,
      duration,
      ease: 'Cubic.easeOut',
      onComplete: () => this.land(),
    });
  }

  isLanded(): boolean {
    return this.landed;
  }

  getAttractionArea(): Phaser.Geom.Circle {
    return new Phaser.Geom.Circle(this.x, this.y, BAIT_ATTRACTION_RADIUS);
  }

  private readonly land = (): void => {
    this.landed = true;
    this.setAngle(0);

    const pulse = this.scene.add
      .circle(this.x, this.y, 22, 0xd8ad58, 0.18)
      .setStrokeStyle(3, 0xf0d28d, 0.7)
      .setDepth(11);

    this.scene.tweens.add({
      targets: pulse,
      radius: BAIT_ATTRACTION_RADIUS,
      alpha: 0,
      duration: 600,
      ease: 'Quad.easeOut',
      onComplete: () => pulse.destroy(),
    });

    this.scene.events.emit('bait-landed', this, this.getAttractionArea());
    this.scene.time.delayedCall(BAIT_LIFETIME, () => this.expire());
  };

  private readonly expire = (): void => {
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      duration: 350,
      onComplete: () => this.destroy(),
    });
  };
}
