import Phaser from 'phaser';
import { SCENE_KEYS } from '../constants';

export class BootScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.boot);
  }

  preload(): void {
    this.load.image('moon-stag-idle', 'assets/images/creatures/moon-stag-idle.png');
    this.load.image('moon-stag-eating', 'assets/images/creatures/moon-stag-eating.png');
    this.load.image('moon-stag-fleeing', 'assets/images/creatures/moon-stag-fleeing.png');
  }

  create(): void {
    this.scene.start(SCENE_KEYS.game);
  }
}
