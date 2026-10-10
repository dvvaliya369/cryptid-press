import Phaser from 'phaser';

export class CameraReticle extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    const reticle = scene.add.graphics();
    reticle.lineStyle(3, 0xf4eed9, 0.95);
    reticle.strokeCircle(0, 0, 24);
    reticle.lineBetween(-38, 0, -15, 0);
    reticle.lineBetween(15, 0, 38, 0);
    reticle.lineBetween(0, -38, 0, -15);
    reticle.lineBetween(0, 15, 0, 38);
    reticle.fillStyle(0xd8ad58, 1);
    reticle.fillCircle(0, 0, 3);

    this.add(reticle);
    this.setDepth(200);
  }

  update(
    pointer: Phaser.Input.Pointer,
    camera: Phaser.Cameras.Scene2D.Camera,
    paddingX = 40,
    paddingY = 40,
  ): void {
    const worldPoint = camera.getWorldPoint(pointer.x, pointer.y);
    const view = camera.worldView;

    this.setPosition(
      Phaser.Math.Clamp(worldPoint.x, view.left + paddingX, view.right - paddingX),
      Phaser.Math.Clamp(worldPoint.y, view.top + paddingY, view.bottom - paddingY),
    );
  }
}
