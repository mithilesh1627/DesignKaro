import {
  ArchitectureGraph,
  InterviewMessage,
  InterviewRubricScores,
  InterviewStageInfo,
} from "@/types/simulator";

// ============================================================================
// CANONICAL 9-STAGE SYSTEM DESIGN INTERVIEW BLUEPRINT
// ============================================================================

export const INTERVIEW_STAGES: InterviewStageInfo[] = [
  {
    stage: 1,
    title: "1. Requirements Gathering",
    shortTitle: "Requirements",
    description: "Clarify functional requirements, non-functional SLAs, and out-of-scope boundaries.",
    interviewerQuestion:
      "Welcome to your System Design Interview! Today we're designing **YouTube / Global Video Streaming**.\n\nTo begin: What are the core **functional features** we should support, and what **non-functional constraints** (availability, latency, consistency) must we target?",
    expectedKeywords: [
      "upload",
      "stream",
      "watch",
      "search",
      "latency",
      "availability",
      "sla",
      "qps",
      "read",
      "write",
      "99.99",
      "resilient",
      "hls",
      "dash",
    ],
    hint: "Identify key user actions: uploading videos and streaming them. State 99.99% availability, sub-200ms stream initiation, and extreme read-heavy distribution (99:1).",
  },
  {
    stage: 2,
    title: "2. Scale & Capacity Estimation",
    shortTitle: "Scale",
    description: "Back-of-the-envelope calculations for throughput, storage, memory, and network bandwidth.",
    interviewerQuestion:
      "Great scope definition. Now let's calculate the **capacity & scale requirements**.\n\nAssuming 100M Daily Active Users (DAU) and 500 hours of video uploaded every minute: What is our expected peak ingress QPS, daily video storage volume, and required egress network bandwidth?",
    expectedKeywords: [
      "dau",
      "qps",
      "rps",
      "storage",
      "bandwidth",
      "tb",
      "gb",
      "mbps",
      "tbps",
      "day",
      "upload",
      "minute",
      "compression",
      "peak",
    ],
    hint: "500 hrs/min at ~50MB/min compressed is ~25 TB/day. With 100M DAU watching 5 videos/day, egress bandwidth easily reaches 1–5 Tbps, requiring edge CDN distribution.",
  },
  {
    stage: 3,
    title: "3. API & Interface Design",
    shortTitle: "APIs",
    description: "Define RESTful / gRPC contracts, upload chunking, and streaming protocols.",
    interviewerQuestion:
      "Now, define the external **API endpoints** and transport protocols for:\n1. Uploading a video (handling massive files reliably)\n2. Streaming video playback\n3. Searching for videos\n\nWhat protocols (HTTP/REST, gRPC, HLS/DASH) and request/response payloads would you specify?",
    expectedKeywords: [
      "post",
      "get",
      "upload",
      "stream",
      "chunk",
      "resumable",
      "multipart",
      "hls",
      "dash",
      "manifest",
      "m3u8",
      "mp4",
      "rest",
      "grpc",
    ],
    hint: "Use multipart/resumable chunked upload with signed URLs (`POST /api/v1/videos/upload-session`). For streaming, serve adaptive bitrate manifests (`GET /api/v1/videos/:id/master.m3u8`).",
  },
  {
    stage: 4,
    title: "4. High-Level Architecture",
    shortTitle: "High-Level",
    description: "Draft the primary building blocks: Clients, CDN, Load Balancer, Gateway, Microservices.",
    interviewerQuestion:
      "Let's look at the **high-level architectural topology**.\n\nWalk me through the end-to-end request flow from the client through the edge down to the application services. How do you separate the streaming read path from the video ingestion write path?",
    expectedKeywords: [
      "client",
      "cdn",
      "gateway",
      "load balancer",
      "reverse proxy",
      "microservice",
      "stateless",
      "separate",
      "ingress",
      "cluster",
      "auth",
      "edge",
    ],
    hint: "Place a global CDN in front for video segments. Route API traffic through an L7 Load Balancer into an API Gateway. Split services into Metadata Service, Search Service, and Ingestion Pipeline.",
  },
  {
    stage: 5,
    title: "5. Database & Schema Design",
    shortTitle: "Database",
    description: "Choose database paradigms (SQL vs NoSQL), schema modeling, sharding, and replication.",
    interviewerQuestion:
      "Let's dive into **data persistence**.\n\nWhat database technologies would you choose for video metadata, user accounts, and view counts? How would you design the primary keys, indexes, and sharding strategy for high scale?",
    expectedKeywords: [
      "sql",
      "postgres",
      "mysql",
      "nosql",
      "cassandra",
      "dynamodb",
      "shard",
      "partition",
      "index",
      "replication",
      "blob",
      "s3",
      "schema",
      "video_id",
    ],
    hint: "Relational DB (PostgreSQL) with read replicas for user/video metadata. Distributed NoSQL (Cassandra/DynamoDB) with partition key `video_id` for view counters and comments. Object storage (S3/GCS) for video blobs.",
  },
  {
    stage: 6,
    title: "6. Caching & Performance",
    shortTitle: "Caching",
    description: "Design multi-tier caching, eviction policies, TTLs, and cache stampede mitigations.",
    interviewerQuestion:
      "Streaming platforms face extreme read skew (top 1% of viral videos generate 90% of views).\n\nHow does your **caching layer** operate? What cache policies (LRU/LFU), TTLs, and stampede/thundering-herd mitigations would you deploy?",
    expectedKeywords: [
      "cache",
      "redis",
      "memcached",
      "lru",
      "ttl",
      "stampede",
      "thundering herd",
      "mutex",
      "bloom filter",
      "hit ratio",
      "edge",
      "cdn",
      "invalidation",
    ],
    hint: "Deploy Redis Cluster for video metadata with LRU eviction. Use CDN edge caching with 85%+ hit ratio. Mitigate thundering herd with distributed mutex locks (single-flight) or probabilistic early expiration.",
  },
  {
    stage: 7,
    title: "7. Messaging & Async Processing",
    shortTitle: "Messaging",
    description: "Decouple heavy tasks (transcoding, indexing, notifications) using distributed message queues.",
    interviewerQuestion:
      "When a user uploads a 4K 60fps video, it cannot be processed synchronously.\n\nHow does your **asynchronous processing pipeline** work? Which message queue (Kafka/RabbitMQ/SQS) do you use, and how do worker clusters transcode videos into 1080p, 720p, and 480p?",
    expectedKeywords: [
      "kafka",
      "queue",
      "rabbitmq",
      "worker",
      "transcod",
      "async",
      "consumer",
      "chunk",
      "resolution",
      "decouple",
      "dlq",
      "backpressure",
    ],
    hint: "Publish raw video upload event to Apache Kafka. Independent transcoder worker pools consume messages, split video into chunks, encode into multiple bitrates/resolutions, and generate HLS playlists.",
  },
  {
    stage: 8,
    title: "8. Scaling & Fault Tolerance",
    shortTitle: "Scaling",
    description: "Eliminate single points of failure, implement auto-scaling, circuit breakers, and rate limiting.",
    interviewerQuestion:
      "Systems at this scale must withstand component crashes without global degradation.\n\nHow do you ensure **fault tolerance and elastic scaling**? What happens if your primary database or cache crashes? How do you protect downstream services with circuit breakers?",
    expectedKeywords: [
      "horizontal",
      "autoscaling",
      "hpa",
      "failover",
      "replica",
      "circuit breaker",
      "rate limit",
      "degrade",
      "fallback",
      "multi-az",
      "active-passive",
      "spof",
    ],
    hint: "Use Multi-AZ active-passive database failover with hot standby. Implement client-side circuit breakers (trip when error rate > 20%) to serve cached fallbacks. Deploy token bucket rate limiters at API Gateway.",
  },
  {
    stage: 9,
    title: "9. Observability & Monitoring",
    shortTitle: "Observability",
    description: "Telemetry, the 4 golden signals, distributed tracing, alerting, and SLA verification.",
    interviewerQuestion:
      "Finally, how do we operate and monitor this platform in production?\n\nWhat are the **key golden signals, metrics, and alerting thresholds** you would track? How would you debug an intermittent p99 latency spike using distributed tracing?",
    expectedKeywords: [
      "latency",
      "traffic",
      "errors",
      "saturation",
      "golden signals",
      "prometheus",
      "grafana",
      "opentelemetry",
      "trace",
      "span",
      "alert",
      "slo",
      "sli",
      "p99",
    ],
    hint: "Track the 4 Golden Signals: Latency (p50/p95/p99), Traffic (QPS), Errors (HTTP 5xx rate), Saturation (CPU, DB pool, queue lag). Use OpenTelemetry traces with correlation IDs across microservices.",
  },
];

// ============================================================================
// INITIAL STATE FACTORY
// ============================================================================

export function getInitialInterviewState(): {
  messages: InterviewMessage[];
  scores: InterviewRubricScores;
  currentStage: number;
} {
  const firstStage = INTERVIEW_STAGES[0];
  const initialMessage: InterviewMessage = {
    id: `msg-${Date.now()}-0`,
    sender: "interviewer",
    text: firstStage.interviewerQuestion,
    timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  const initialScores: InterviewRubricScores = {
    requirements_understanding: 5,
    scale_estimation: 0,
    architecture: 0,
    trade_offs: 0,
    scalability: 0,
    reliability: 0,
    communication: 6,
  };

  return {
    messages: [initialMessage],
    scores: initialScores,
    currentStage: 1,
  };
}

// ============================================================================
// TURN EVALUATION ENGINE
// ============================================================================

export function evaluateInterviewTurn(
  stageIndex: number,
  candidateText: string,
  graph: ArchitectureGraph,
  currentScores: InterviewRubricScores
): {
  feedback: string;
  interviewerReply: string;
  updatedScores: InterviewRubricScores;
  nextStage: number;
  readyForNext: boolean;
} {
  const currentStage = INTERVIEW_STAGES.find((s) => s.stage === stageIndex) || INTERVIEW_STAGES[0];
  const textLower = candidateText.toLowerCase().trim();
  const words = textLower.split(/\s+/);

  // Check expected keywords
  const matchedKeywords = currentStage.expectedKeywords.filter((kw) => textLower.includes(kw));
  const keywordRatio = matchedKeywords.length / Math.max(1, currentStage.expectedKeywords.length);

  // Inspect actual architecture graph to see if candidate has placed relevant components
  const hasDb = graph.nodes.some((n) => ["relational_db", "postgresql", "mysql", "mongodb", "cassandra"].includes(n.type));
  const hasCache = graph.nodes.some((n) => ["cache", "redis", "memcached"].includes(n.type));
  const hasQueue = graph.nodes.some((n) => ["queue", "kafka", "rabbitmq"].includes(n.type));
  const hasLb = graph.nodes.some((n) => ["gateway", "api_gateway", "load_balancer", "cdn"].includes(n.type));

  let stageScoreDelta = 0;
  let feedback = "";
  let interviewerReply = "";
  const updatedScores = { ...currentScores };

  const isShortOrVague = words.length < 10 || matchedKeywords.length === 0;

  if (isShortOrVague) {
    feedback = "Your answer was rather brief. Consider expanding with concrete technical numbers, protocols, and architectural trade-offs.";
    interviewerReply = `Good start, but let's dive deeper. For **${currentStage.title}**, could you specify more technical details? Specifically: ${currentStage.hint}`;
    stageScoreDelta = 1;
  } else if (matchedKeywords.length >= 2 || words.length >= 35) {
    feedback = `Solid explanation! You covered key concepts (${matchedKeywords.slice(0, 3).join(", ")}).`;
    stageScoreDelta = Math.min(3, 1 + Math.round(keywordRatio * 4));

    // Progress to next stage if available
    const nextStageNum = Math.min(9, stageIndex + 1);
    const nextStageInfo = INTERVIEW_STAGES.find((s) => s.stage === nextStageNum);

    if (stageIndex < 9 && nextStageInfo) {
      // Connect to canvas architecture
      let canvasContext = "";
      if (stageIndex === 4 && hasLb) {
        canvasContext = " I notice on your canvas you've placed load balancers and gateways, which aligns with your explanation.";
      } else if (stageIndex === 5 && hasDb) {
        canvasContext = " Your canvas has relational database nodes configured with replicas, which matches this discussion.";
      } else if (stageIndex === 6 && hasCache) {
        canvasContext = " Your Redis cache tier on the canvas complements your read-throughput strategy.";
      }

      interviewerReply = `Excellent work on **${currentStage.shortTitle}**!${canvasContext}\n\nLet's advance to **Stage ${nextStageNum}: ${nextStageInfo.title}**.\n\n${nextStageInfo.interviewerQuestion}`;
      return {
        feedback,
        interviewerReply,
        updatedScores: applyScoreIncrements(updatedScores, stageIndex, stageScoreDelta),
        nextStage: nextStageNum,
        readyForNext: true,
      };
    } else {
      interviewerReply = "Outstanding! You have completed all 9 stages of the System Design Interview. Let's review your final Staff Architect Evaluation scorecard!";
      return {
        feedback,
        interviewerReply,
        updatedScores: applyScoreIncrements(updatedScores, stageIndex, stageScoreDelta),
        nextStage: 9,
        readyForNext: true,
      };
    }
  } else {
    feedback = "Good point, but consider elaborating on trade-offs.";
    interviewerReply = `Understood. How would you specifically address: ${currentStage.hint}`;
    stageScoreDelta = 1;
  }

  return {
    feedback,
    interviewerReply,
    updatedScores: applyScoreIncrements(updatedScores, stageIndex, stageScoreDelta),
    nextStage: stageIndex,
    readyForNext: false,
  };
}

function applyScoreIncrements(
  scores: InterviewRubricScores,
  stage: number,
  delta: number
): InterviewRubricScores {
  const s = { ...scores };
  const clamp = (val: number) => Math.min(10, Math.max(0, val));

  switch (stage) {
    case 1:
      s.requirements_understanding = clamp(s.requirements_understanding + delta);
      s.communication = clamp(s.communication + 1);
      break;
    case 2:
      s.scale_estimation = clamp(s.scale_estimation + delta + 2);
      break;
    case 3:
      s.architecture = clamp(s.architecture + delta);
      s.trade_offs = clamp(s.trade_offs + 1);
      break;
    case 4:
      s.architecture = clamp(s.architecture + delta + 1);
      s.scalability = clamp(s.scalability + 1);
      break;
    case 5:
      s.trade_offs = clamp(s.trade_offs + delta);
      s.reliability = clamp(s.reliability + 1);
      break;
    case 6:
      s.scalability = clamp(s.scalability + delta);
      s.architecture = clamp(s.architecture + 1);
      break;
    case 7:
      s.architecture = clamp(s.architecture + delta);
      s.reliability = clamp(s.reliability + 1);
      break;
    case 8:
      s.reliability = clamp(s.reliability + delta + 1);
      s.scalability = clamp(s.scalability + 1);
      break;
    case 9:
      s.reliability = clamp(s.reliability + delta);
      s.communication = clamp(s.communication + delta);
      break;
  }

  return s;
}

export function computeOverallRubricPercentage(scores: InterviewRubricScores): number {
  const sum =
    scores.requirements_understanding +
    scores.scale_estimation +
    scores.architecture +
    scores.trade_offs +
    scores.scalability +
    scores.reliability +
    scores.communication;
  // 7 categories * 10 points = 70 max points
  return Math.min(100, Math.round((sum / 70) * 100));
}
