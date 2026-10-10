import Phaser from 'phaser';
import { Creature, type CreatureBehavior } from '../entities/Creature';

export type Assignment = {
  id: string;
  description: string;
  creatureId?: string;
  behavior?: CreatureBehavior;
  minimumSubjects?: number;
  completed: boolean;
};

export type PhotoScore = {
  score: number;
  caption: string;
  subjects: Creature[];
  completedAssignmentIds: string[];
};

const BEHAVIOR_POINTS: Record<CreatureBehavior, number> = {
  idle: 20,
  wandering: 40,
  sleeping: 80,
  eating: 140,
  fleeing: 120,
  attacking: 180,
  stunned: 100,
};

export const createAssignments = (): Assignment[] => [
  {
    id: 'feeding-time',
    description: 'Photograph any creature eating',
    behavior: 'eating',
    completed: false,
  },
  {
    id: 'danger-close',
    description: 'Capture a Mossback attacking',
    creatureId: 'mossback',
    behavior: 'attacking',
    completed: false,
  },
  {
    id: 'group-shot',
    description: 'Capture two creatures together',
    minimumSubjects: 2,
    completed: false,
  },
];

export const scorePhoto = (
  creatures: Creature[],
  frame: Phaser.Geom.Rectangle,
  photographer: Phaser.Math.Vector2,
  assignments: Assignment[],
): PhotoScore => {
  const subjects = creatures.filter((creature) => frame.contains(creature.x, creature.y));

  if (subjects.length === 0) {
    return {
      score: 0,
      caption: 'Empty frame',
      subjects,
      completedAssignmentIds: [],
    };
  }

  const center = new Phaser.Math.Vector2(frame.centerX, frame.centerY);
  const maxCenterDistance = Math.hypot(frame.width / 2, frame.height / 2);
  let score = 0;

  subjects.forEach((creature) => {
    const centerDistance = Phaser.Math.Distance.Between(center.x, center.y, creature.x, creature.y);
    const framingPoints = Math.round(100 * Math.max(0, 1 - centerDistance / maxCenterDistance));
    const dangerDistance = Phaser.Math.Distance.Between(
      photographer.x,
      photographer.y,
      creature.x,
      creature.y,
    );
    const dangerPoints = dangerDistance < 180 ? 75 : 0;

    score += 100 + framingPoints + BEHAVIOR_POINTS[creature.getBehavior()] + dangerPoints;
  });

  if (subjects.length > 1) {
    score += (subjects.length - 1) * 100;
  }

  const completedAssignmentIds = assignments
    .filter((assignment) => !assignment.completed && matchesAssignment(assignment, subjects))
    .map((assignment) => assignment.id);

  score += completedAssignmentIds.length * 300;

  const names = [...new Set(subjects.map((creature) => creature.getCreatureName()))];
  const caption = names.length === 1
    ? `${names[0]} · ${subjects[0]?.getBehavior() ?? 'unknown'}`
    : `${subjects.length} creatures in frame`;

  return { score, caption, subjects, completedAssignmentIds };
};

const matchesAssignment = (assignment: Assignment, subjects: Creature[]): boolean => {
  if (assignment.minimumSubjects && subjects.length < assignment.minimumSubjects) {
    return false;
  }

  if (!assignment.creatureId && !assignment.behavior) {
    return true;
  }

  return subjects.some((creature) => {
    const creatureMatches = !assignment.creatureId
      || creature.getCreatureId() === assignment.creatureId;
    const behaviorMatches = !assignment.behavior
      || creature.getBehavior() === assignment.behavior;

    return creatureMatches && behaviorMatches;
  });
};
