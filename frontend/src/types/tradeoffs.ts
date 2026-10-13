export interface TradeoffOption {
  id: string;
  label: string;
  description: string;
  isCorrect: boolean;
  explanation: string;
}

export interface TradeoffQuestion {
  id: string;
  title: string;
  prompt: string;
  options: TradeoffOption[];
  conceptKey: "db_read_offload" | "cache_failure_stampede" | "stale_data_invalidation" | "key_metric";
}

export interface ExperimentMetrics {
  throughputQps: number;
  p99LatencyMs: number;
  p50LatencyMs: number;
  errorRate: number;
  databaseUtilizationPercent: number;
  bottleneckNodeName: string;
  bottleneckUtilizationPercent: number;
  // Explicitly labeled model assumptions / inputs
  assumedCacheHitRatio: number;
  assumedReadRatio: number;
  totalRequestsSimulated: number;
  droppedRequests: number;
}

export interface ExperimentRunResult {
  timestamp: string;
  scenarioName: "baseline_direct_db" | "cache_aside_active";
  trafficPresetId: string;
  metrics: ExperimentMetrics;
  // Graph topology diagnostics at run time
  hasCacheNode: boolean;
  hasCacheReadEdge: boolean;
  hasDbWriteFallbackEdge: boolean;
  hasMultipleReplicas: boolean;
  graphSignature?: string;
  dbCapacityQps?: number;
  dbReplicas?: number;
  chaosFailure?: string;
}

export interface TransferChallengeOption {
  id: string;
  title: string;
  tradeoffSummary: string;
  isOptimal: boolean;
  misconception?: string;
}

export interface TransferChallenge {
  id: string;
  scenario: string;
  question: string;
  options: TransferChallengeOption[];
  referenceExplanation: string;
  keyArchitecturalPrinciple: string;
}

export interface EvidenceFeedback {
  category: "success" | "warning" | "missing_topology";
  headline: string;
  findings: string[];
  predictionComparison: Array<{
    questionId: string;
    questionTitle: string;
    predictedOptionLabel: string;
    wasAccurate: boolean;
    observedEvidence: string;
  }>;
  architecturalInsight: string;
}

export interface CachingLabProgressState {
  predictions: Record<string, string>; // questionId -> optionId
  isPredictionSubmitted: boolean;
  baselineRun: ExperimentRunResult | null;
  cacheRun: ExperimentRunResult | null;
  isExplanationReviewed: boolean;
  transferSelectedOptionId: string | null;
  isTransferSubmitted: boolean;
  lastExperimentAt: string | null;
}
