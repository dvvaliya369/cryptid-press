import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS } from '../constants';

export class GameScene extends Phaser.Scene {
  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    const centerX = GAME_WIDTH / 2;
    const centerY = GAME_HEIGHT / 2;

    this.add.circle(centerX, centerY - 42, 118, 0xd8ad58, 0.08);
    this.add.circle(centerX, centerY - 42, 82, 0xd8ad58, 0.1);

    this.add
      .text(centerX, centerY - 52, 'CRYPTID PRESS', {
        color: '#f4eed9',
        fontFamily: 'Georgia, serif',
        fontSize: '56px',
        fontStyle: 'bold',
        letterSpacing: 6,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, centerY + 24, 'PHASER PROJECT READY', {
        color: '#d8ad58',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    this.add
      .text(centerX, GAME_HEIGHT - 58, 'The jungle is waiting.', {
        color: '#8dbba1',
        fontFamily: 'Arial, sans-serif',
        fontSize: '16px',
      })
      .setOrigin(0.5);
  }
}
