import type { ArchitectureGraph, ConnectionType } from "./simulator";

export type HintLevel = 0 | 1 | 2 | 3;

export interface EdgeRequirement {
  sourceType: string;
  targetType: string;
  connectionType?: ConnectionType;
  minCount?: number;
  description?: string;
}

export interface NodeRequirement {
  type: string;
  minCount?: number;
  minReplicas?: number;
  description?: string;
}

export interface SimulationTarget {
  metric: "database_utilization" | "error_rate" | "p95_latency" | "throughput";
  operator: "<=" | ">=" | "<" | ">";
  threshold: number;
  unit: string;
  description: string;
}

export interface GuidedTask {
  id: string;
  title: string;
  description: string;
  instructions: string;
  requiredNodes?: NodeRequirement[];
  requiredEdges?: EdgeRequirement[];
  simulationTarget?: SimulationTarget;
  /** Progressive hints: [0]=conceptual nudge, [1]=architectural hint, [2]=explicit direction */
  hints: [string, string, string];
}

export interface GuidedExercise {
  id: string;
  slug: string; // lesson slug, e.g. "distributed-cache-redis"
  topicSlug: string; // topic slug, e.g. "distributed-caching"
  title: string;
  subtitle: string;
  problemStatement: string;
  learningObjectives: string[];
  initialGraph: ArchitectureGraph;
  targetGraph?: ArchitectureGraph;
  tasks: GuidedTask[];
  completionMessage: string;
  commonMistakes: Array<{
    mistake: string;
    remedy: string;
  }>;
}

export interface TaskValidationResult {
  taskId: string;
  taskTitle: string;
  isCompleted: boolean;
  feedback: string;
  missingRequirements: string[];
}

export interface ExerciseValidationResult {
  exerciseId: string;
  isCompleted: boolean;
  completedTaskCount: number;
  totalTaskCount: number;
  score: number;
  taskResults: TaskValidationResult[];
  overallFeedback: string;
}

export type ExerciseStatus = "not_started" | "in_progress" | "completed";

export interface ExerciseProgressState {
  status: ExerciseStatus;
  completedTaskIds: string[];
  revealedHintLevels: Record<string, HintLevel>; // taskId -> hint level 0..3
  lastAttemptedAt: string | null;
  completedAt: string | null;
}
