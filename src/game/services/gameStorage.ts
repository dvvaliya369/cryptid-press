const STORAGE_KEY = 'cryptid-press-save-v1';

export type GameSave = {
  highScore: number;
  bestAssignments: number;
  runsPlayed: number;
};

const createDefaultSave = (): GameSave => ({
  highScore: 0,
  bestAssignments: 0,
  runsPlayed: 0,
});

export const loadGameSave = (): GameSave => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return createDefaultSave();
    }

    const parsed = JSON.parse(stored) as Partial<GameSave>;
    return {
      highScore: toSafeNumber(parsed.highScore),
      bestAssignments: toSafeNumber(parsed.bestAssignments),
      runsPlayed: toSafeNumber(parsed.runsPlayed),
    };
  } catch {
    return createDefaultSave();
  }
};

export const saveRunResult = (
  current: GameSave,
  score: number,
  completedAssignments: number,
): GameSave => {
  const updated: GameSave = {
    highScore: Math.max(current.highScore, score),
    bestAssignments: Math.max(current.bestAssignments, completedAssignments),
    runsPlayed: current.runsPlayed + 1,
  };

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // The game remains playable when storage is blocked or full.
  }

  return updated;
};

const toSafeNumber = (value: unknown): number => (
  typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : 0
);
