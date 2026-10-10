import Phaser from 'phaser';
import { WORLD_HEIGHT, WORLD_WIDTH } from '../constants';

export type JungleZone = {
  id: string;
  label: string;
  area: Phaser.Geom.Circle;
};

export type JungleMap = {
  obstacles: Phaser.GameObjects.Zone[];
  creatureZones: JungleZone[];
  playerStart: Phaser.Math.Vector2;
};

const COLORS = {
  ground: 0x183d2c,
  groundLight: 0x24533b,
  path: 0x94724b,
  pathEdge: 0x604c35,
  water: 0x235b68,
  waterLight: 0x4d8b8d,
  treeDark: 0x0c271c,
  tree: 0x1d5637,
  treeLight: 0x3b7547,
  stone: 0x718077,
  camp: 0xd79a4a,
};

export const createJungleMap = (scene: Phaser.Scene): JungleMap => {
  const obstacles: Phaser.GameObjects.Zone[] = [];
  const random = new Phaser.Math.RandomDataGenerator(['cryptid-press-jungle']);

  scene.physics.world.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
  scene.cameras.main.setBounds(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  drawGround(scene, random);
  drawWater(scene, obstacles);
  drawPaths(scene);
  drawLandmarks(scene, obstacles);
  drawJungleBorder(scene, random, obstacles);

  const creatureZones = createCreatureZones(scene);

  return {
    obstacles,
    creatureZones,
    playerStart: new Phaser.Math.Vector2(1200, 1420),
  };
};

const drawGround = (scene: Phaser.Scene, random: Phaser.Math.RandomDataGenerator): void => {
  const ground = scene.add.graphics().setDepth(0);
  ground.fillStyle(COLORS.ground);
  ground.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

  ground.fillStyle(COLORS.groundLight, 0.32);
  for (let index = 0; index < 280; index += 1) {
    const x = random.between(20, WORLD_WIDTH - 20);
    const y = random.between(20, WORLD_HEIGHT - 20);
    const radius = random.between(2, 7);
    ground.fillCircle(x, y, radius);
  }
};

const drawWater = (scene: Phaser.Scene, obstacles: Phaser.GameObjects.Zone[]): void => {
  const water = scene.add.graphics().setDepth(1);
  water.fillStyle(COLORS.water);
  water.fillRoundedRect(320, -40, 220, 710, 90);
  water.fillRoundedRect(360, 600, 185, 1040, 80);
  water.fillEllipse(1940, 430, 560, 380);

  water.lineStyle(5, COLORS.waterLight, 0.45);
  for (let y = 70; y < WORLD_HEIGHT; y += 90) {
    water.beginPath();
    water.moveTo(370, y);
    water.lineTo(490, y + 18);
    water.strokePath();
  }

  for (let y = 340; y <= 520; y += 48) {
    water.beginPath();
    water.moveTo(1770, y);
    water.lineTo(2110, y);
    water.strokePath();
  }

  // Leave a gap in the river collision where the bridge crosses it.
  addObstacle(scene, obstacles, 430, 335, 220, 670);
  addObstacle(scene, obstacles, 452, 728, 185, 114);
  addObstacle(scene, obstacles, 452, 1230, 185, 740);
  addObstacle(scene, obstacles, 1940, 430, 430, 270);
};

const drawPaths = (scene: Phaser.Scene): void => {
  const paths = scene.add.graphics().setDepth(2);
  paths.lineStyle(105, COLORS.pathEdge, 0.82);
  paths.beginPath();
  paths.moveTo(1200, 1600);
  paths.lineTo(1200, 1260);
  paths.lineTo(1320, 1030);
  paths.lineTo(1230, 815);
  paths.lineTo(1040, 650);
  paths.lineTo(850, 490);
  paths.lineTo(650, 350);
  paths.strokePath();

  paths.lineStyle(76, COLORS.path, 1);
  paths.beginPath();
  paths.moveTo(1200, 1600);
  paths.lineTo(1200, 1260);
  paths.lineTo(1320, 1030);
  paths.lineTo(1230, 815);
  paths.lineTo(1040, 650);
  paths.lineTo(850, 490);
  paths.lineTo(650, 350);
  paths.strokePath();

  paths.lineStyle(62, COLORS.path, 1);
  paths.beginPath();
  paths.moveTo(1270, 840);
  paths.lineTo(1600, 720);
  paths.lineTo(1770, 570);
  paths.strokePath();

  paths.fillStyle(COLORS.path, 0.72);
  paths.fillCircle(1260, 850, 285);

  paths.fillStyle(0x8a6641);
  paths.fillRect(325, 785, 235, 74);
  paths.lineStyle(8, 0x4e3928);
  paths.strokeRect(325, 785, 235, 74);
};

const drawLandmarks = (scene: Phaser.Scene, obstacles: Phaser.GameObjects.Zone[]): void => {
  const landmarks = scene.add.graphics().setDepth(4);

  // Base camp
  landmarks.fillStyle(COLORS.camp);
  landmarks.fillTriangle(1090, 1470, 1160, 1350, 1230, 1470);
  landmarks.fillStyle(0xb86738);
  landmarks.fillTriangle(1250, 1475, 1315, 1375, 1380, 1475);
  landmarks.fillStyle(0xf3bd55);
  landmarks.fillCircle(1200, 1505, 18);

  // Ancient ruins
  landmarks.fillStyle(COLORS.stone);
  landmarks.fillRect(565, 245, 42, 150);
  landmarks.fillRect(705, 220, 46, 175);
  landmarks.fillRect(565, 245, 186, 34);
  landmarks.fillStyle(0x394b42);
  landmarks.fillRect(630, 315, 54, 80);

  addObstacle(scene, obstacles, 586, 320, 42, 150);
  addObstacle(scene, obstacles, 728, 307, 46, 175);

  // Observation platform near the lake
  landmarks.fillStyle(0x765236);
  landmarks.fillRect(1670, 520, 180, 30);
  landmarks.fillRect(1690, 545, 20, 75);
  landmarks.fillRect(1810, 545, 20, 75);
};

const drawJungleBorder = (
  scene: Phaser.Scene,
  random: Phaser.Math.RandomDataGenerator,
  obstacles: Phaser.GameObjects.Zone[],
): void => {
  const trees = scene.add.graphics().setDepth(5);
  const treePositions: Phaser.Math.Vector2[] = [];

  for (let index = 0; index < 150; index += 1) {
    const edge = index % 4;
    let x: number;
    let y: number;

    if (edge === 0) {
      x = random.between(25, WORLD_WIDTH - 25);
      y = random.between(20, 155);
    } else if (edge === 1) {
      x = random.between(WORLD_WIDTH - 170, WORLD_WIDTH - 20);
      y = random.between(25, WORLD_HEIGHT - 25);
    } else if (edge === 2) {
      x = random.between(25, WORLD_WIDTH - 25);
      y = random.between(WORLD_HEIGHT - 170, WORLD_HEIGHT - 20);
    } else {
      x = random.between(20, 170);
      y = random.between(25, WORLD_HEIGHT - 25);
    }

    if (edge !== 2 || Math.abs(x - 1200) > 155) {
      treePositions.push(new Phaser.Math.Vector2(x, y));
    }
  }

  const groveCenters = [
    new Phaser.Math.Vector2(800, 1050),
    new Phaser.Math.Vector2(1750, 1120),
    new Phaser.Math.Vector2(2150, 880),
    new Phaser.Math.Vector2(980, 190),
  ];

  for (const center of groveCenters) {
    for (let index = 0; index < 16; index += 1) {
      const angle = random.frac() * Math.PI * 2;
      const distance = random.between(30, 210);
      treePositions.push(
        new Phaser.Math.Vector2(
          center.x + Math.cos(angle) * distance,
          center.y + Math.sin(angle) * distance,
        ),
      );
    }
  }

  for (const position of treePositions) {
    const size = random.between(32, 55);
    trees.fillStyle(COLORS.treeDark, 0.95);
    trees.fillCircle(position.x + 5, position.y + 8, size);
    trees.fillStyle(COLORS.tree, 1);
    trees.fillCircle(position.x, position.y, size);
    trees.fillStyle(COLORS.treeLight, 0.5);
    trees.fillCircle(position.x - size * 0.28, position.y - size * 0.3, size * 0.44);
    addObstacle(scene, obstacles, position.x, position.y + size * 0.45, size, size * 0.55);
  }
};

const createCreatureZones = (scene: Phaser.Scene): JungleZone[] => {
  const zones: JungleZone[] = [
    { id: 'clearing', label: 'Sunken Clearing', area: new Phaser.Geom.Circle(1260, 850, 245) },
    { id: 'ruins', label: 'Whispering Ruins', area: new Phaser.Geom.Circle(660, 380, 190) },
    { id: 'lake', label: 'Mirror Lake', area: new Phaser.Geom.Circle(1940, 450, 225) },
    { id: 'grove', label: 'Glowcap Grove', area: new Phaser.Geom.Circle(1760, 1120, 210) },
  ];

  const debug = scene.add.graphics().setDepth(3);
  debug.lineStyle(3, 0xe0bd63, 0.28);

  for (const zone of zones) {
    debug.strokeCircle(zone.area.x, zone.area.y, zone.area.radius);
  }

  debug.setVisible(
    import.meta.env.DEV && new URLSearchParams(window.location.search).has('debug'),
  );
  return zones;
};

const addObstacle = (
  scene: Phaser.Scene,
  obstacles: Phaser.GameObjects.Zone[],
  x: number,
  y: number,
  width: number,
  height: number,
): void => {
  const obstacle = scene.add.zone(x, y, width, height);
  scene.physics.add.existing(obstacle, true);
  obstacles.push(obstacle);
};
