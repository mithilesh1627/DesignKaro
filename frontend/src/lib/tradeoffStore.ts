import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { CachingLabProgressState, ExperimentRunResult } from "@/types/tradeoffs";

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

interface TradeoffStoreState extends CachingLabProgressState {
  setPrediction: (questionId: string, optionId: string) => void;
  submitPredictions: () => void;
  recordBaselineRun: (run: ExperimentRunResult) => void;
  recordCacheRun: (run: ExperimentRunResult) => void;
  setExplanationReviewed: () => void;
  setTransferOption: (optionId: string) => void;
  submitTransferChallenge: () => void;
  resetLabState: () => void;
}

const DEFAULT_LAB_STATE: CachingLabProgressState = {
  predictions: {},
  isPredictionSubmitted: false,
  baselineRun: null,
  cacheRun: null,
  isExplanationReviewed: false,
  transferSelectedOptionId: null,
  isTransferSubmitted: false,
  lastExperimentAt: null,
};

export const useTradeoffStore = create<TradeoffStoreState>()(
  persist(
    (set) => ({
      ...DEFAULT_LAB_STATE,

      setPrediction: (questionId: string, optionId: string) => {
        set((state) => ({
          predictions: {
            ...state.predictions,
            [questionId]: optionId,
          },
        }));
      },

      submitPredictions: () => {
        set(() => ({
          isPredictionSubmitted: true,
        }));
      },

      recordBaselineRun: (run: ExperimentRunResult) => {
        set(() => ({
          baselineRun: run,
          lastExperimentAt: new Date().toISOString(),
        }));
      },

      recordCacheRun: (run: ExperimentRunResult) => {
        set(() => ({
          cacheRun: run,
          lastExperimentAt: new Date().toISOString(),
        }));
      },

      setExplanationReviewed: () => {
        set(() => ({
          isExplanationReviewed: true,
        }));
      },

      setTransferOption: (optionId: string) => {
        set(() => ({
          transferSelectedOptionId: optionId,
        }));
      },

      submitTransferChallenge: () => {
        set(() => ({
          isTransferSubmitted: true,
        }));
      },

      resetLabState: () => {
        set(() => ({
          ...DEFAULT_LAB_STATE,
        }));
      },
    }),
    {
      name: "designkaro_caching_tradeoff_lab_v1",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" && window.localStorage ? window.localStorage : memoryStorage
      ),
      migrate: (persistedState: unknown) => {
        if (!persistedState || typeof persistedState !== "object") {
          return { ...DEFAULT_LAB_STATE };
        }
        const stateObj = persistedState as Partial<CachingLabProgressState>;
        return {
          predictions:
            typeof stateObj.predictions === "object" && stateObj.predictions !== null
              ? stateObj.predictions
              : {},
          isPredictionSubmitted: Boolean(stateObj.isPredictionSubmitted),
          baselineRun:
            stateObj.baselineRun && typeof stateObj.baselineRun === "object"
              ? stateObj.baselineRun
              : null,
          cacheRun:
            stateObj.cacheRun && typeof stateObj.cacheRun === "object"
              ? stateObj.cacheRun
              : null,
          isExplanationReviewed: Boolean(stateObj.isExplanationReviewed),
          transferSelectedOptionId:
            typeof stateObj.transferSelectedOptionId === "string"
              ? stateObj.transferSelectedOptionId
              : null,
          isTransferSubmitted: Boolean(stateObj.isTransferSubmitted),
          lastExperimentAt:
            typeof stateObj.lastExperimentAt === "string" ? stateObj.lastExperimentAt : null,
        };
      },
    }
  )
);
