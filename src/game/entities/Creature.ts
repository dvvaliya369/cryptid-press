import Phaser from 'phaser';
import { Bait } from './Bait';
import { Player } from './Player';

export type CreatureBehavior =
  | 'idle'
  | 'wandering'
  | 'sleeping'
  | 'eating'
  | 'fleeing'
  | 'attacking'
  | 'stunned';

export type CreatureTemperament = 'timid' | 'curious' | 'aggressive';

export type CreatureConfig = {
  id: string;
  name: string;
  color: number;
  temperament: CreatureTemperament;
  speed: number;
  initialBehavior?: CreatureBehavior;
};

const PLAYER_REACTION_DISTANCE = 220;
const REACTION_RELEASE_DISTANCE = 285;
const FLASH_STUN_DURATION = 1800;
const MOON_STAG_TEXTURES: Partial<Record<CreatureBehavior, string>> = {
  idle: 'moon-stag-idle',
  wandering: 'moon-stag-idle',
  sleeping: 'moon-stag-idle',
  eating: 'moon-stag-eating',
  fleeing: 'moon-stag-fleeing',
  stunned: 'moon-stag-idle',
};

export class Creature extends Phaser.Physics.Arcade.Sprite {
  private readonly config: CreatureConfig;
  private readonly home: Phaser.Geom.Circle;
  private readonly behaviorLabel: Phaser.GameObjects.Text;
  private behavior: CreatureBehavior;
  private stateEndsAt = 0;
  private nextWanderAt = 0;
  private hasWanderTarget = false;
  private wanderTarget = new Phaser.Math.Vector2();
  private baitTarget?: Bait;

  constructor(scene: Phaser.Scene, x: number, y: number, home: Phaser.Geom.Circle, config: CreatureConfig) {
    const placeholderTexture = `creature-${config.id}`;
    const dreamLayerTexture = config.id === 'moon-stag' ? MOON_STAG_TEXTURES.idle : undefined;
    const texture = dreamLayerTexture && scene.textures.exists(dreamLayerTexture)
      ? dreamLayerTexture
      : placeholderTexture;
    createCreatureTexture(scene, placeholderTexture, config.color, config.temperament);
    super(scene, x, y, texture);

    this.config = config;
    this.home = home;
    this.behavior = config.initialBehavior ?? 'idle';
    this.wanderTarget.set(x, y);

    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setCollideWorldBounds(true);
    this.setDepth(15);

    if (config.id === 'moon-stag' && texture !== placeholderTexture) {
      this.setDisplaySize(118, 118);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setCircle(23, 9, 11);

    this.behaviorLabel = scene.add
      .text(x, y - 52, '', {
        backgroundColor: '#07130fcf',
        color: '#f4eed9',
        fontFamily: 'Arial, sans-serif',
        fontSize: '11px',
        padding: { x: 5, y: 3 },
      })
      .setOrigin(0.5)
      .setDepth(30)
      .setVisible(
        import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug'),
      );

    if (this.behavior === 'sleeping') {
      this.stateEndsAt = scene.time.now + Phaser.Math.Between(3500, 6500);
    }
  }

  update(time: number, player: Player): void {
    this.behaviorLabel.setPosition(this.x, this.y - 52);
    this.behaviorLabel.setText(`${this.config.name} · ${this.behavior}`);

    if (this.behavior === 'stunned' || this.behavior === 'sleeping' || this.behavior === 'eating') {
      this.setVelocity(0);

      if (time < this.stateEndsAt) {
        return;
      }

      this.setBehavior('idle');
    }

    if (this.baitTarget?.active && this.baitTarget.isLanded()) {
      if (Phaser.Math.Distance.Between(this.x, this.y, this.baitTarget.x, this.baitTarget.y) < 36) {
        this.baitTarget = undefined;
        this.setBehavior('eating', 2200);
        this.setVelocity(0);
        return;
      }

      this.setBehavior('wandering');
      this.moveToward(this.baitTarget.x, this.baitTarget.y, this.config.speed * 1.15);
      return;
    }

    this.baitTarget = undefined;
    const playerDistance = Phaser.Math.Distance.Between(this.x, this.y, player.x, player.y);

    const continueAttacking = this.behavior === 'attacking'
      && playerDistance < REACTION_RELEASE_DISTANCE;
    if (
      this.config.temperament === 'aggressive'
      && (playerDistance < PLAYER_REACTION_DISTANCE || continueAttacking)
    ) {
      this.setBehavior('attacking');
      this.moveToward(player.x, player.y, this.config.speed * 1.35);
      return;
    }

    const continueFleeing = this.behavior === 'fleeing'
      && playerDistance < REACTION_RELEASE_DISTANCE;
    if (
      this.config.temperament === 'timid'
      && (playerDistance < PLAYER_REACTION_DISTANCE * 0.8 || continueFleeing)
    ) {
      this.setBehavior('fleeing');
      const fleeDirection = new Phaser.Math.Vector2(this.x - player.x, this.y - player.y).normalize();
      this.setVelocity(fleeDirection.x * this.config.speed * 1.45, fleeDirection.y * this.config.speed * 1.45);
      this.setRotation(fleeDirection.angle() + Math.PI / 2);
      return;
    }

    this.updateWandering(time);
  }

  reactToBait(bait: Bait, attractionArea: Phaser.Geom.Circle): void {
    if (this.behavior !== 'stunned' && attractionArea.contains(this.x, this.y)) {
      this.baitTarget = bait;
      this.stateEndsAt = 0;
    }
  }

  reactToFlash(effectArea: Phaser.Geom.Circle): void {
    if (!effectArea.contains(this.x, this.y)) {
      return;
    }

    this.baitTarget = undefined;
    this.setVelocity(0);
    this.setBehavior('stunned', FLASH_STUN_DURATION);
  }

  getBehavior(): CreatureBehavior {
    return this.behavior;
  }

  getCreatureId(): string {
    return this.config.id;
  }

  getCreatureName(): string {
    return this.config.name;
  }

  private updateWandering(time: number): void {
    if (!this.hasWanderTarget && time < this.nextWanderAt) {
      this.setBehavior('idle');
      this.setVelocity(0);
      return;
    }

    if (!this.hasWanderTarget) {
      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const distance = Phaser.Math.FloatBetween(20, this.home.radius * 0.8);
      this.wanderTarget.set(
        this.home.x + Math.cos(angle) * distance,
        this.home.y + Math.sin(angle) * distance,
      );
      this.hasWanderTarget = true;
    }

    const distanceToTarget = Phaser.Math.Distance.Between(
      this.x,
      this.y,
      this.wanderTarget.x,
      this.wanderTarget.y,
    );

    if (distanceToTarget < 24) {
      this.hasWanderTarget = false;
      this.nextWanderAt = time + Phaser.Math.Between(1200, 2800);
      this.setBehavior('idle');
      this.setVelocity(0);
      return;
    }

    this.setBehavior('wandering');
    this.moveToward(this.wanderTarget.x, this.wanderTarget.y, this.config.speed);
  }

  private moveToward(targetX: number, targetY: number, speed: number): void {
    const angle = Phaser.Math.Angle.Between(this.x, this.y, targetX, targetY);
    const body = this.body as Phaser.Physics.Arcade.Body;
    this.scene.physics.velocityFromRotation(angle, speed, body.velocity);
    this.setRotation(angle + Math.PI / 2);
  }

  private setBehavior(behavior: CreatureBehavior, duration = 0): void {
    if (this.behavior === behavior) {
      if (duration > 0) {
        this.stateEndsAt = this.scene.time.now + duration;
      }
      return;
    }

    this.behavior = behavior;
    this.stateEndsAt = duration > 0 ? this.scene.time.now + duration : 0;
    this.clearTint();

    if (this.config.id === 'moon-stag') {
      const texture = MOON_STAG_TEXTURES[behavior] ?? MOON_STAG_TEXTURES.idle;
      if (texture && this.scene.textures.exists(texture)) {
        this.setTexture(texture).setDisplaySize(118, 118);
      }
    }

    if (behavior === 'stunned') this.setTint(0xf8f1bf);
    if (behavior === 'eating') this.setTint(0xe7bc65);
    if (behavior === 'attacking') this.setTint(0xf07864);
    if (behavior === 'fleeing') this.setTint(0x83d5c0);
  }
}

const createCreatureTexture = (
  scene: Phaser.Scene,
  texture: string,
  color: number,
  temperament: CreatureTemperament,
): void => {
  if (scene.textures.exists(texture)) {
    return;
  }

  const graphics = scene.make.graphics({ x: 0, y: 0 });
  graphics.fillStyle(0x07130f, 0.3);
  graphics.fillEllipse(38, 62, 52, 15);

  if (temperament === 'curious') {
    graphics.fillStyle(color, 0.75);
    graphics.fillEllipse(19, 34, 32, 45);
    graphics.fillEllipse(57, 34, 32, 45);
  }

  graphics.fillStyle(color);
  graphics.fillEllipse(38, 40, 48, 42);
  graphics.fillCircle(38, 24, 20);

  if (temperament === 'timid') {
    graphics.lineStyle(5, 0xf0d28d);
    graphics.lineBetween(29, 12, 19, 0);
    graphics.lineBetween(47, 12, 57, 0);
  }

  if (temperament === 'aggressive') {
    graphics.fillStyle(0xf0d28d);
    graphics.fillTriangle(22, 15, 29, 3, 33, 18);
    graphics.fillTriangle(43, 18, 47, 3, 54, 15);
  }

  graphics.fillStyle(0x07130f);
  graphics.fillCircle(31, 23, 3);
  graphics.fillCircle(45, 23, 3);
  graphics.generateTexture(texture, 76, 76);
  graphics.destroy();
};
