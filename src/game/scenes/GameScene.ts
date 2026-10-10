import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, SCENE_KEYS, WORLD_HEIGHT, WORLD_WIDTH } from '../constants';
import { Bait } from '../entities/Bait';
import { CameraReticle } from '../entities/CameraReticle';
import { Creature, type CreatureConfig } from '../entities/Creature';
import { PHOTO_FRAME_HEIGHT, PHOTO_FRAME_WIDTH, PhotoCamera } from '../entities/PhotoCamera';
import { Player } from '../entities/Player';
import { loadGameSave, saveRunResult, type GameSave } from '../services/gameStorage';
import {
  createAssignments,
  scorePhoto,
  type Assignment,
  type PhotoScore,
} from '../systems/photoScoring';
import { createJungleMap } from '../world/createJungleMap';

const FLASH_RADIUS = 250;
const FLASH_COOLDOWN = 3000;
const MAX_BAIT = 3;
const BAIT_THROW_DISTANCE = 420;
const RUN_DURATION = 180_000;

const CREATURE_CONFIGS: CreatureConfig[] = [
  { id: 'moon-stag', name: 'Moon Stag', color: 0xd9e6d1, temperament: 'timid', speed: 90 },
  { id: 'ember-moth', name: 'Ember Moth', color: 0xe8794a, temperament: 'curious', speed: 115 },
  { id: 'mossback', name: 'Mossback', color: 0x7b9b52, temperament: 'aggressive', speed: 78 },
  { id: 'glowhopper', name: 'Glowhopper', color: 0x6bc4b8, temperament: 'timid', speed: 125 },
];

export class GameScene extends Phaser.Scene {
  private player?: Player;
  private reticle?: CameraReticle;
  private photoCamera?: PhotoCamera;
  private hud?: Phaser.GameObjects.Container;
  private flashKey?: Phaser.Input.Keyboard.Key;
  private flashStatus?: Phaser.GameObjects.Text;
  private baitKey?: Phaser.Input.Keyboard.Key;
  private restartKey?: Phaser.Input.Keyboard.Key;
  private baitStatus?: Phaser.GameObjects.Text;
  private scoreText?: Phaser.GameObjects.Text;
  private timerText?: Phaser.GameObjects.Text;
  private highScoreText?: Phaser.GameObjects.Text;
  private assignmentsText?: Phaser.GameObjects.Text;
  private photoFeedback?: Phaser.GameObjects.Text;
  private creatures: Creature[] = [];
  private assignments: Assignment[] = [];
  private nextFlashAt = 0;
  private baitRemaining = MAX_BAIT;
  private totalScore = 0;
  private runEndsAt = 0;
  private runEnded = false;
  private saveData?: GameSave;

  constructor() {
    super(SCENE_KEYS.game);
  }

  create(): void {
    this.physics.resume();
    this.assignments = createAssignments();
    this.totalScore = 0;
    this.baitRemaining = MAX_BAIT;
    this.nextFlashAt = 0;
    this.runEnded = false;
    this.runEndsAt = this.time.now + RUN_DURATION;
    this.saveData = loadGameSave();

    const map = createJungleMap(this);

    this.player = new Player(this, map.playerStart.x, map.playerStart.y);
    this.reticle = new CameraReticle(this, map.playerStart.x, map.playerStart.y - 120);
    this.photoCamera = new PhotoCamera(this, this.reticle.x, this.reticle.y);
    this.physics.add.collider(this.player, map.obstacles);
    this.creatures = map.creatureZones.flatMap((zone, index) => {
      const config = CREATURE_CONFIGS[index % CREATURE_CONFIGS.length];
      if (!config) {
        return [];
      }

      const first = new Creature(
        this,
        zone.area.x - 45,
        zone.area.y + 15,
        zone.area,
        { ...config, initialBehavior: index === 1 ? 'sleeping' : 'idle' },
      );
      const second = new Creature(
        this,
        zone.area.x + 65,
        zone.area.y - 35,
        zone.area,
        config,
      );

      this.physics.add.collider(first, map.obstacles);
      this.physics.add.collider(second, map.obstacles);
      return [first, second];
    });
    this.physics.add.collider(this.creatures, this.creatures);

    this.events.on('player-flash', this.handlePlayerFlash);
    this.events.on('bait-landed', this.handleBaitLanded);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.events.off('player-flash', this.handlePlayerFlash);
      this.events.off('bait-landed', this.handleBaitLanded);
      this.input.off(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
    });

    this.cameras.main.startFollow(this.player, true, 0.1, 0.1);
    this.cameras.main.setDeadzone(180, 120);
    this.cameras.main.setFollowOffset(0, 40);

    this.flashKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.baitKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.Q);
    this.restartKey = this.input.keyboard?.addKey(Phaser.Input.Keyboard.KeyCodes.R);

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

    this.scoreText = this.add
      .text(GAME_WIDTH / 2, 26, 'SCORE  0', {
        backgroundColor: '#081712cc',
        color: '#f0d28d',
        fontFamily: 'Arial, sans-serif',
        fontSize: '18px',
        fontStyle: 'bold',
        padding: { x: 14, y: 9 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.timerText = this.add
      .text(GAME_WIDTH / 2, 74, 'TIME  3:00', {
        backgroundColor: '#081712b8',
        color: '#b8cbbf',
        fontFamily: 'Arial, sans-serif',
        fontSize: '15px',
        fontStyle: 'bold',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.highScoreText = this.add
      .text(GAME_WIDTH / 2, 113, `BEST  ${this.saveData.highScore}`, {
        backgroundColor: '#081712b8',
        color: '#8dbba1',
        fontFamily: 'Arial, sans-serif',
        fontSize: '13px',
        fontStyle: 'bold',
        padding: { x: 10, y: 6 },
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0);

    this.assignmentsText = this.add
      .text(24, GAME_HEIGHT - 112, '', {
        backgroundColor: '#081712d9',
        color: '#d9e4dc',
        fontFamily: 'Arial, sans-serif',
        fontSize: '14px',
        lineSpacing: 7,
        padding: { x: 12, y: 10 },
      })
      .setScrollFactor(0);

    this.photoFeedback = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT - 42, '', {
        backgroundColor: '#081712e8',
        color: '#f0d28d',
        fontFamily: 'Arial, sans-serif',
        fontSize: '20px',
        fontStyle: 'bold',
        padding: { x: 18, y: 10 },
      })
      .setOrigin(0.5, 1)
      .setScrollFactor(0)
      .setAlpha(0);

    this.hud = this.add.container(0, 0, [
      title,
      controls,
      this.flashStatus,
      this.baitStatus,
      this.scoreText,
      this.timerText,
      this.highScoreText,
      this.assignmentsText,
      this.photoFeedback,
    ]).setDepth(100);
    this.updateAssignmentsText();

    this.input.on(Phaser.Input.Events.POINTER_DOWN, this.handlePointerDown);
  }

  update(time: number): void {
    if (this.runEnded) {
      if (this.restartKey && Phaser.Input.Keyboard.JustDown(this.restartKey)) {
        this.scene.restart();
      }
      return;
    }

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
    this.creatures.forEach((creature) => creature.update(time, this.player!));

    if (this.flashKey && Phaser.Input.Keyboard.JustDown(this.flashKey)) {
      this.activateFlash();
    }

    if (this.baitKey && Phaser.Input.Keyboard.JustDown(this.baitKey)) {
      this.throwBait();
    }

    this.updateFlashStatus(time);
    this.updateTimer(time);
  }

  private readonly handlePointerDown = (pointer: Phaser.Input.Pointer): void => {
    if (
      this.runEnded
      || !pointer.leftButtonDown()
      || !this.photoCamera
      || !this.reticle
      || !this.player
      || !this.hud
    ) {
      return;
    }

    const result = scorePhoto(
      this.creatures,
      this.photoCamera.getWorldFrame(),
      new Phaser.Math.Vector2(this.player.x, this.player.y),
      this.assignments,
    );
    const captured = this.photoCamera.capture(
      this.cameras.main,
      [this.reticle, this.player, this.hud],
      { score: result.score, caption: result.caption },
    );

    if (captured) {
      this.applyPhotoScore(result);
    }
  };

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

  private readonly applyPhotoScore = (result: PhotoScore): void => {
    this.totalScore += result.score;
    result.completedAssignmentIds.forEach((id) => {
      const assignment = this.assignments.find((item) => item.id === id);
      if (assignment) assignment.completed = true;
    });

    this.scoreText?.setText(`SCORE  ${this.totalScore}`);
    this.updateAssignmentsText();
    this.showPhotoFeedback(result);
  };

  private readonly showPhotoFeedback = (result: PhotoScore): void => {
    if (!this.photoFeedback) {
      return;
    }

    const assignmentMessage = result.completedAssignmentIds.length > 0
      ? '  ·  ASSIGNMENT COMPLETE'
      : '';
    this.tweens.killTweensOf(this.photoFeedback);
    this.photoFeedback
      .setText(`${result.caption.toUpperCase()}  ·  ${result.score} PTS${assignmentMessage}`)
      .setAlpha(1);

    this.tweens.add({
      targets: this.photoFeedback,
      alpha: 0,
      delay: 1100,
      duration: 400,
    });
  };

  private readonly updateAssignmentsText = (): void => {
    const lines = this.assignments.map(
      (assignment) => `${assignment.completed ? '[x]' : '[ ]'} ${assignment.description}`,
    );
    this.assignmentsText?.setText(['ASSIGNMENTS', ...lines]);
  };

  private readonly updateTimer = (time: number): void => {
    const remaining = Math.max(0, this.runEndsAt - time);
    const totalSeconds = Math.ceil(remaining / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = String(totalSeconds % 60).padStart(2, '0');
    this.timerText?.setText(`TIME  ${minutes}:${seconds}`);

    if (remaining === 0) {
      this.endRun();
    }
  };

  private readonly endRun = (): void => {
    this.runEnded = true;
    this.physics.pause();
    this.reticle?.setVisible(false);
    this.photoCamera?.setVisible(false);

    const completed = this.assignments.filter((assignment) => assignment.completed).length;
    const previousHighScore = this.saveData?.highScore ?? 0;
    const isNewHighScore = this.totalScore > previousHighScore;
    this.saveData = saveRunResult(
      this.saveData ?? loadGameSave(),
      this.totalScore,
      completed,
    );
    this.highScoreText?.setText(`BEST  ${this.saveData.highScore}`);
    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 620, 340, 0x07130f, 0.96)
      .setStrokeStyle(4, 0xd8ad58)
      .setScrollFactor(0)
      .setDepth(900);
    const results = this.add
      .text(
        GAME_WIDTH / 2,
        GAME_HEIGHT / 2,
        [
          'FIELD ASSIGNMENT COMPLETE',
          '',
          `FINAL SCORE  ${this.totalScore}`,
          isNewHighScore ? 'NEW HIGH SCORE' : `BEST SCORE  ${this.saveData.highScore}`,
          `ASSIGNMENTS  ${completed}/${this.assignments.length}`,
          `RUNS PLAYED  ${this.saveData.runsPlayed}`,
          '',
          'Press R to start a new run',
        ],
        {
          align: 'center',
          color: '#f4eed9',
          fontFamily: 'Georgia, serif',
          fontSize: '24px',
          lineSpacing: 10,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(901);

    overlay.setInteractive();
    results.setInteractive();
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

  private readonly handlePlayerFlash = (effectArea: Phaser.Geom.Circle): void => {
    this.creatures.forEach((creature) => creature.reactToFlash(effectArea));
  };

  private readonly handleBaitLanded = (bait: Bait, attractionArea: Phaser.Geom.Circle): void => {
    this.creatures.forEach((creature) => creature.reactToBait(bait, attractionArea));
  };
}
