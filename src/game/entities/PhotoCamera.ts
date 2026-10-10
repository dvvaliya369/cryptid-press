import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH } from '../constants';

export const PHOTO_FRAME_WIDTH = 420;
export const PHOTO_FRAME_HEIGHT = 260;

const PHOTO_COOLDOWN = 900;
const PREVIEW_TEXTURE = 'latest-photo';

type HideableObject = Phaser.GameObjects.GameObject & Phaser.GameObjects.Components.Visible;

export type CapturedPhoto = {
  capturedAt: number;
  dataUrl: string;
  worldFrame: Phaser.Geom.Rectangle;
};

export class PhotoCamera extends Phaser.GameObjects.Container {
  private readonly frame: Phaser.GameObjects.Graphics;
  private readonly status: Phaser.GameObjects.Text;
  private nextCaptureAt = 0;
  private preview?: Phaser.GameObjects.Image;
  private previewBorder?: Phaser.GameObjects.Rectangle;
  private previewLabel?: Phaser.GameObjects.Text;
  private latestPhoto?: CapturedPhoto;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y);
    scene.add.existing(this);

    this.frame = scene.add.graphics();
    this.drawFrame(0xf4eed9);

    this.status = scene.add
      .text(0, PHOTO_FRAME_HEIGHT / 2 + 18, 'READY', {
        color: '#f4eed9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
      })
      .setOrigin(0.5, 0);

    this.add([this.frame, this.status]);
    this.setDepth(190);
  }

  update(time: number, x: number, y: number): void {
    this.setPosition(x, y);

    const ready = time >= this.nextCaptureAt;
    this.status.setText(ready ? 'READY' : 'RELOADING');
    this.status.setColor(ready ? '#f4eed9' : '#8b9d91');
    this.drawFrame(ready ? 0xf4eed9 : 0x73867a);
  }

  capture(camera: Phaser.Cameras.Scene2D.Camera, hiddenObjects: HideableObject[]): boolean {
    if (this.scene.time.now < this.nextCaptureAt) {
      return false;
    }

    this.nextCaptureAt = this.scene.time.now + PHOTO_COOLDOWN;

    const screenX = Math.round((this.x - camera.worldView.left) * camera.zoom - PHOTO_FRAME_WIDTH / 2);
    const screenY = Math.round((this.y - camera.worldView.top) * camera.zoom - PHOTO_FRAME_HEIGHT / 2);
    const width = Math.round(PHOTO_FRAME_WIDTH * camera.zoom);
    const height = Math.round(PHOTO_FRAME_HEIGHT * camera.zoom);
    const visibility = hiddenObjects.map((object) => object.visible);

    this.setVisible(false);
    this.preview?.setVisible(false);
    this.previewBorder?.setVisible(false);
    this.previewLabel?.setVisible(false);
    hiddenObjects.forEach((object) => object.setVisible(false));

    this.scene.game.renderer.snapshotArea(
      screenX,
      screenY,
      width,
      height,
      (snapshot) => {
        this.setVisible(true);
        hiddenObjects.forEach((object, index) => object.setVisible(visibility[index] ?? true));

        if (snapshot instanceof HTMLImageElement) {
          this.storePhoto(snapshot);
          this.showPreview(snapshot);
        }

        this.playFlash();
      },
      'image/jpeg',
      0.9,
    );

    return true;
  }

  getLatestPhoto(): CapturedPhoto | undefined {
    return this.latestPhoto;
  }

  getWorldFrame(): Phaser.Geom.Rectangle {
    return new Phaser.Geom.Rectangle(
      this.x - PHOTO_FRAME_WIDTH / 2,
      this.y - PHOTO_FRAME_HEIGHT / 2,
      PHOTO_FRAME_WIDTH,
      PHOTO_FRAME_HEIGHT,
    );
  }

  private drawFrame(color: number): void {
    const halfWidth = PHOTO_FRAME_WIDTH / 2;
    const halfHeight = PHOTO_FRAME_HEIGHT / 2;
    const corner = 38;

    this.frame.clear();
    this.frame.lineStyle(3, color, 0.9);

    for (const scaleX of [-1, 1]) {
      for (const scaleY of [-1, 1]) {
        const x = halfWidth * scaleX;
        const y = halfHeight * scaleY;
        this.frame.beginPath();
        this.frame.moveTo(x - corner * scaleX, y);
        this.frame.lineTo(x, y);
        this.frame.lineTo(x, y - corner * scaleY);
        this.frame.strokePath();
      }
    }

    this.frame.lineStyle(1, color, 0.22);
    this.frame.strokeRect(-halfWidth, -halfHeight, PHOTO_FRAME_WIDTH, PHOTO_FRAME_HEIGHT);
  }

  private storePhoto(image: HTMLImageElement): void {
    this.latestPhoto = {
      capturedAt: Date.now(),
      dataUrl: image.src,
      worldFrame: this.getWorldFrame(),
    };
  }

  private showPreview(image: HTMLImageElement): void {
    this.preview?.destroy();
    this.previewBorder?.destroy();
    this.previewLabel?.destroy();

    if (this.scene.textures.exists(PREVIEW_TEXTURE)) {
      this.scene.textures.remove(PREVIEW_TEXTURE);
    }

    this.scene.textures.addImage(PREVIEW_TEXTURE, image);

    this.previewBorder = this.scene.add
      .rectangle(GAME_WIDTH - 154, 114, 268, 190, 0x07130f, 0.9)
      .setStrokeStyle(3, 0xd8ad58)
      .setScrollFactor(0)
      .setDepth(300);
    this.preview = this.scene.add
      .image(GAME_WIDTH - 154, 120, PREVIEW_TEXTURE)
      .setDisplaySize(244, 151)
      .setScrollFactor(0)
      .setDepth(301);
    this.previewLabel = this.scene.add
      .text(GAME_WIDTH - 274, 28, 'LATEST PHOTO', {
        color: '#f4eed9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '12px',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(302);
  }

  private playFlash(): void {
    const flash = this.scene.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff, 0.72)
      .setScrollFactor(0)
      .setDepth(500);

    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      ease: 'Quad.easeOut',
      onComplete: () => flash.destroy(),
    });
  }
}
