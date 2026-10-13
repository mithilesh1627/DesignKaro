import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { ExerciseProgressState, HintLevel } from "@/types/exercise";

const memoryStorage = (() => {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
})();

interface ExerciseStoreState {
  progressByExerciseId: Record<string, ExerciseProgressState>;
  getProgress: (exerciseId: string) => ExerciseProgressState;
  startExercise: (exerciseId: string) => void;
  recordValidation: (
    exerciseId: string,
    completedTaskIds: string[],
    isAllCompleted: boolean
  ) => void;
  revealNextHint: (exerciseId: string, taskId: string) => HintLevel;
  resetProgress: (exerciseId: string) => void;
}

const DEFAULT_PROGRESS: ExerciseProgressState = {
  status: "not_started",
  completedTaskIds: [],
  revealedHintLevels: {},
  lastAttemptedAt: null,
  completedAt: null,
};

export const useExerciseStore = create<ExerciseStoreState>()(
  persist(
    (set, get) => ({
      progressByExerciseId: {},

      getProgress: (exerciseId: string): ExerciseProgressState => {
        const stored = get().progressByExerciseId?.[exerciseId];
        if (!stored || typeof stored !== "object") {
          return { ...DEFAULT_PROGRESS };
        }
        return {
          status: ["not_started", "in_progress", "completed"].includes(stored.status)
            ? stored.status
            : "not_started",
          completedTaskIds: Array.isArray(stored.completedTaskIds)
            ? stored.completedTaskIds
            : [],
          revealedHintLevels:
            stored.revealedHintLevels && typeof stored.revealedHintLevels === "object"
              ? stored.revealedHintLevels
              : {},
          lastAttemptedAt:
            typeof stored.lastAttemptedAt === "string" ? stored.lastAttemptedAt : null,
          completedAt:
            typeof stored.completedAt === "string" ? stored.completedAt : null,
        };
      },

      startExercise: (exerciseId: string) => {
        set((state) => {
          const current = state.progressByExerciseId[exerciseId] || { ...DEFAULT_PROGRESS };
          if (current.status === "completed") {
            return state; // Maintain completed state
          }
          return {
            progressByExerciseId: {
              ...state.progressByExerciseId,
              [exerciseId]: {
                ...current,
                status: "in_progress",
                lastAttemptedAt: current.lastAttemptedAt || new Date().toISOString(),
              },
            },
          };
        });
      },

      recordValidation: (
        exerciseId: string,
        completedTaskIds: string[],
        isAllCompleted: boolean
      ) => {
        set((state) => {
          const current = state.progressByExerciseId[exerciseId] || { ...DEFAULT_PROGRESS };
          const now = new Date().toISOString();
          const newStatus = isAllCompleted ? "completed" : "in_progress";
          const completedAt = isAllCompleted ? (current.completedAt || now) : null;

          return {
            progressByExerciseId: {
              ...state.progressByExerciseId,
              [exerciseId]: {
                ...current,
                status: newStatus,
                completedTaskIds: [...completedTaskIds],
                lastAttemptedAt: now,
                completedAt,
              },
            },
          };
        });
      },

      revealNextHint: (exerciseId: string, taskId: string): HintLevel => {
        let nextLevel: HintLevel = 1;
        set((state) => {
          const current = state.progressByExerciseId[exerciseId] || { ...DEFAULT_PROGRESS };
          const currentHint = (current.revealedHintLevels[taskId] || 0) as HintLevel;
          nextLevel = Math.min(3, currentHint + 1) as HintLevel;

          return {
            progressByExerciseId: {
              ...state.progressByExerciseId,
              [exerciseId]: {
                ...current,
                revealedHintLevels: {
                  ...current.revealedHintLevels,
                  [taskId]: nextLevel,
                },
              },
            },
          };
        });
        return nextLevel;
      },

      resetProgress: (exerciseId: string) => {
        set((state) => {
          const updated = { ...state.progressByExerciseId };
          delete updated[exerciseId];
          return { progressByExerciseId: updated };
        });
      },
    }),
    {
      name: "designkaro_exercise_storage",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage
      ),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return { progressByExerciseId: {} };
        }
        const stateObj = persistedState as { progressByExerciseId?: Record<string, unknown> };
        if (!stateObj.progressByExerciseId || typeof stateObj.progressByExerciseId !== "object") {
          return { ...stateObj, progressByExerciseId: {} };
        }
        return stateObj;
      },
    }
  )
);
