"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Clock,
  Sparkles,
  BookOpen,
  Calculator,
  Terminal,
  AlertTriangle,
  Loader2,
  Check,
  X,
  HelpCircle,
  Layers,
  Compass,
  ShieldCheck,
  Split,
  ChevronRight,
  Lock,
  LogIn,
  ShieldAlert,
} from "lucide-react";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { AuthModal } from "@/components/AuthModal";
import { useAuthStore } from "@/lib/authStore";
import { API_BASE } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface LessonData {
  id: string;
  slug: string;
  title: string;
  topic_id: string;
  topic_slug: string;
  topic_title: string;
  content_markdown: string;
  estimated_minutes: number;
  order_index: number;
  is_completed: boolean;
  next_lesson_slug?: string | null;
  prev_lesson_slug?: string | null;
}

interface MiniExercise {
  question: string;
  placeholder: string;
  validate: (input: string) => { isCorrect: boolean; message: string };
  hint: string;
}

interface DecisionOption {
  id: string;
  label: string;
  isOptimal: boolean;
  tradeoffExplanation: string;
}

interface DecisionChallenge {
  scenario: string;
  requirement: string;
  options: DecisionOption[];
}

const CONCEPTUAL_PROGRESSION = [
  { id: "problem", label: "Problem" },
  { id: "mental_model", label: "Mental Model" },
  { id: "decision", label: "Decision" },
  { id: "tradeoff", label: "Trade-off" },
  { id: "failure", label: "Failure Modes" },
  { id: "scale", label: "Scale Strategy" },
  { id: "canvas", label: "Canvas Application" },
  { id: "interview", label: "Staff Defense" },
];

const LESSON_EXERCISES: Record<string, MiniExercise> = {
  "latency-vs-throughput": {
    question:
      "An API receives 5,000 QPS with an average latency of 40ms (0.040s). Using Little's Law (L = λ × W), how many concurrent active connections must your server pool sustain?",
    placeholder: "e.g. 200",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "200") {
        return {
          isCorrect: true,
          message: "Correct! L = 5,000 QPS × 0.040s = 200 concurrent active in-flight requests.",
        };
      }
      return {
        isCorrect: false,
        message: "Try again! Little's Law: Concurrency (L) = 5,000 QPS × 0.040s = ?",
      };
    },
    hint: "Little's Law: L = λ × W. Convert 40ms to 0.040 seconds, then multiply by 5,000.",
  },
  "cap-theorem-in-practice": {
    question:
      "During a transatlantic fiber cut partition, two users simultaneously attempt to reserve seat #14B in a concert. To prevent double-booking, should the system enforce CP or AP?",
    placeholder: "e.g. CP",
    validate: (val: string) => {
      const v = val.toLowerCase().trim();
      if (v === "cp" || v.includes("consistency") || v === "cp system" || v === "cp architecture") {
        return {
          isCorrect: true,
          message: "Correct! Preventing duplicate seat bookings requires linearizable consistency (CP), rejecting conflicting writes during a network split.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. An AP system would allow diverged writes, selling the same seat to two different users. Consistency (CP) is strictly required.",
      };
    },
    hint: "If financial correctness and non-duplication are non-negotiable, choose Consistency over Availability during a network partition.",
  },
  "distributed-cache-redis": {
    question:
      "Your platform stores 10,000,000 user profiles in Redis. Each profile payload averages 2 Kilobytes. What is the total raw memory footprint required in Gigabytes?",
    placeholder: "e.g. 20",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "20") {
        return {
          isCorrect: true,
          message: "Correct! 10,000,000 × 2 KB = 20,000,000 KB = 20 Gigabytes of RAM.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. 10,000,000 × 2 KB = 20,000,000 KB. Convert Kilobytes to Gigabytes (divide by 1,000,000).",
      };
    },
    hint: "10,000,000 profiles × 2 KB = 20,000,000 KB = 20 GB.",
  },
  "consistent-hashing-sharding": {
    question:
      "You currently have 4 database shards using consistent hashing. A new 5th shard is added. What percentage of total keys will be migrated to the new shard?",
    placeholder: "e.g. 20%",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "20" || v === "0.2") {
        return {
          isCorrect: true,
          message: "Correct! With consistent hashing, only 1/(N+1) = 1/5 = 20% of keys are migrated. With simple modulo hashing, ~80% would move!",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. Consistent hashing migrates 1/(N+1) fraction of keys when adding the (N+1)-th shard. 1 / 5 = ?",
      };
    },
    hint: "Formula: 1 / (N + 1) where N is current shards (4) and cluster becomes 5 shards.",
  },
  "kafka-event-streaming": {
    question:
      "A Kafka topic is configured with 8 partitions. A consumer group has 12 consumer instances running. How many consumers will be actively processing messages concurrently?",
    placeholder: "e.g. 8",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "8") {
        return {
          isCorrect: true,
          message: "Correct! Kafka assigns at most one consumer per partition within a single consumer group. 8 will be active and 4 will stay idle on hot standby.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. In Kafka, maximum concurrency in a consumer group is strictly bounded by the partition count.",
      };
    },
    hint: "One partition can be assigned to only one consumer per consumer group at a time.",
  },
  "api-gateway-envoy-routing": {
    question:
      "An Envoy API Gateway receives 50,000 HTTPS QPS. 10% of requests require a fresh TLS 1.3 handshake taking 1.2ms of CPU. How many full TLS handshakes occur per second?",
    placeholder: "e.g. 5000",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "5000" || v === "5,000") {
        return {
          isCorrect: true,
          message: "Correct! 50,000 QPS × 10% = 5,000 full TLS handshakes per second (consuming ~6 CPU cores).",
        };
      }
      return {
        isCorrect: false,
        message: "Try again! 50,000 total QPS × 10% (0.10) handshakes = ?",
      };
    },
    hint: "Multiply total QPS (50,000) by non-reused handshake percentage (10%).",
  },
  "load-balancing-horizontal-scaling": {
    question:
      "Each application container comfortably processes 250 QPS. Traffic surges to 10,000 QPS during peak commute. How many replicas are required?",
    placeholder: "e.g. 40",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "40") {
        return {
          isCorrect: true,
          message: "Correct! 10,000 QPS ÷ 250 QPS/replica = 40 replicas (recommend 48 with 20% headroom).",
        };
      }
      return {
        isCorrect: false,
        message: "Try again! Divide total peak QPS (10,000) by capacity per replica (250).",
      };
    },
    hint: "Replicas = Peak QPS / Unit Capacity. 10,000 / 250 = ?",
  },
  "raft-distributed-consensus": {
    question:
      "In a 5-node Raft cluster, what is the minimum quorum of operational nodes required to safely commit log entries?",
    placeholder: "e.g. 3",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "3") {
        return {
          isCorrect: true,
          message: "Correct! Quorum = floor(N/2) + 1 = floor(5/2) + 1 = 3 nodes.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. Raft requires a strict majority quorum: floor(5 / 2) + 1 = ?",
      };
    },
    hint: "Majority formula: floor(N/2) + 1.",
  },
  "circuit-breakers-resilience": {
    question:
      "A client retries failed requests with exponential backoff base delay 100ms. What is the deterministic delay for attempt 3 before jitter (in ms)?",
    placeholder: "e.g. 400",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "400") {
        return {
          isCorrect: true,
          message: "Correct! Delay = 100ms × 2^(3-1) = 100 × 4 = 400ms.",
        };
      }
      return {
        isCorrect: false,
        message: "Try again! Attempt 1: 100ms, Attempt 2: 200ms, Attempt 3: ?",
      };
    },
    hint: "Exponential progression: 100ms, 200ms, 400ms, 800ms.",
  },
  "distributed-tracing-opentelemetry": {
    question:
      "A service processes 10,000 QPS with 10 spans per trace (500 bytes/span). What is the trace telemetry data rate in Megabytes/sec at 100% sampling?",
    placeholder: "e.g. 50",
    validate: (val: string) => {
      const v = val.toLowerCase().replace(/[^0-9.]/g, "");
      if (v === "50") {
        return {
          isCorrect: true,
          message: "Correct! 10,000 QPS × 10 spans × 500 bytes = 50,000,000 bytes/s ≈ 50 MB/sec.",
        };
      }
      return {
        isCorrect: false,
        message: "Try again! 10,000 × 10 × 500 = 50,000,000 bytes/s. Convert to MB/s (divide by 1,000,000).",
      };
    },
    hint: "Multiply 10,000 requests by 5,000 bytes per trace = 50,000,000 bytes/s = 50 MB/s.",
  },
  "zero-trust-mtls-security": {
    question:
      "In Mutual TLS (mTLS), who must present a valid X.509 cryptographic certificate during the handshake?",
    placeholder: "e.g. Both client and server",
    validate: (val: string) => {
      const v = val.toLowerCase().trim();
      if (v.includes("both") || v.includes("client and server") || v.includes("two-way")) {
        return {
          isCorrect: true,
          message: "Correct! Unlike standard TLS where only the server presents a certificate, mTLS requires BOTH client and server to verify identities.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. In standard TLS only server presents a certificate. In MUTUAL TLS, who must present a certificate?",
      };
    },
    hint: "The word 'Mutual' means two-way authentication: both client and server.",
  },
  "low-latency-ml-inference": {
    question:
      "To reduce feature store lookup latency from 45ms to <2ms for real-time model inference, what tier of datastore must front the feature store?",
    placeholder: "e.g. Redis",
    validate: (val: string) => {
      const v = val.toLowerCase().trim();
      if (v.includes("redis") || v.includes("in-memory") || v.includes("cache") || v.includes("dragonfly")) {
        return {
          isCorrect: true,
          message: "Correct! An in-memory key-value cache (such as Redis or Dragonfly) delivers sub-2ms point lookups required for real-time inference.",
        };
      }
      return {
        isCorrect: false,
        message: "Incorrect. Disk-based databases incur multi-millisecond random I/O. Which in-memory caching datastore achieves <2ms lookups?",
      };
    },
    hint: "Consider in-memory key-value data stores like Redis.",
  },
};

const LESSON_DECISION_MATRICES: Record<string, DecisionChallenge> = {
  "latency-vs-throughput": {
    scenario:
      "Flash traffic surge: 15,000 QPS with 40ms average database query latency. Worker containers are hitting thread exhaustion.",
    requirement: "Increase concurrency headroom without crashing the backend database.",
    options: [
      {
        id: "opt1",
        label: "Increase application container thread pool size to 2,000 threads per instance",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. High thread counts increase Linux OS context-switching overhead and exhaust PostgreSQL database connection pools, causing lock thrashing.",
      },
      {
        id: "opt2",
        label: "Introduce Redis Cache-Aside for read requests with connection pool isolation",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Offloading 90% of reads to Redis drops average read latency from 40ms to 1.5ms, which by Little's Law reduces concurrent in-flight requests by ~95%.",
      },
      {
        id: "opt3",
        label: "Increase HTTP request timeout from 1s to 10s",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Lengthening timeouts holds onto stalled worker threads 10x longer, rapidly compounding thread starvation and tail latency.",
      },
    ],
  },
  "cap-theorem-in-practice": {
    scenario:
      "A transatlantic fiber cut partitions US-East and EU-West datacenters. Two users simultaneously attempt to book the last available concert ticket.",
    requirement: "Prevent double-booking while minimizing error impact.",
    options: [
      {
        id: "opt1",
        label: "Choose AP: accept local writes on both sides and resolve conflict later",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Double-booking physical assets creates unresolvable real-world business conflict that cannot be merged with Last-Write-Wins.",
      },
      {
        id: "opt2",
        label: "Choose CP: lock seat reservation via majority quorum consensus",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. A CP system rejects or stalls mutations on the minority isolated side, guaranteeing linearizability and zero double-bookings.",
      },
      {
        id: "opt3",
        label: "Choose CA: configure single database without network partition handling",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. 'CA' does not exist in distributed systems across wide-area networks; network partitions are physically inevitable.",
      },
    ],
  },
  "distributed-cache-redis": {
    scenario:
      "A viral celebrity post expires from Redis cache while receiving 80,000 concurrent read requests per second.",
    requirement: "Prevent the Thundering Herd cache stampede from crashing the primary database.",
    options: [
      {
        id: "opt1",
        label: "Direct all 80,000 misses to query the primary PostgreSQL database concurrently",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. A textbook Cache Stampede / Thundering Herd: DB connections exhaust immediately and disk IOPS spike to 100%, causing total service outage.",
      },
      {
        id: "opt2",
        label: "Use Probabilistic Early Expiration (XFetch) and distributed mutex on miss",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Only one worker acquires the mutex to regenerate the cache value, while all other concurrent readers receive the stale cached copy or wait briefly.",
      },
      {
        id: "opt3",
        label: "Disable TTL expiration permanently across all keys",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Eliminating TTLs leads to rapid Redis memory exhaustion (OOM) and prevents mutated data from ever getting refreshed.",
      },
    ],
  },
  "consistent-hashing-sharding": {
    scenario:
      "An order database table exceeds 10 Terabytes. Write throughput exceeds single-node NVMe IOPS limits (15,000 writes/sec).",
    requirement: "Partition orders across 8 database shards with minimal rebalancing overhead.",
    options: [
      {
        id: "opt1",
        label: "Modulo hashing: shard = hash(order_id) % N",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. When changing the number of shards N, ~80% of all keys must be remigrated, causing massive operational downtime.",
      },
      {
        id: "opt2",
        label: "Consistent Hashing with virtual nodes (vnodes) on a 2^32 ring",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Adding a new shard moves only 1/(N+1) keys on average, and virtual nodes prevent uneven key clustering and hotspots.",
      },
      {
        id: "opt3",
        label: "Shard by timestamp: one shard per day of the week",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Timestamp sharding routes 100% of current write traffic to today's shard, leaving other shards idle and failing to distribute load.",
      },
    ],
  },
  "kafka-event-streaming": {
    scenario:
      "The order service publishes payment events to trigger email receipts. The email vendor experiences an intermittent 45-minute outage.",
    requirement: "Prevent checkout transactions from failing while ensuring every receipt is eventually sent.",
    options: [
      {
        id: "opt1",
        label: "Make synchronous HTTP calls from checkout to the email service with 10 retries",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Blocks checkout thread pools waiting for email retries, triggering cascading failures that take down payment checkout.",
      },
      {
        id: "opt2",
        label: "Publish OrderPlaced events to Kafka; consume with consumer group and offset commits",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Kafka provides temporal decoupling. Checkout succeeds instantly in milliseconds, and the email consumer processes accumulated backlog safely when recovered.",
      },
      {
        id: "opt3",
        label: "Buffer emails in an in-memory application queue on the web node",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. If the web container restarts, crashes, or autoscales down during the 45-minute outage, all buffered receipts are permanently lost.",
      },
    ],
  },
  "api-gateway-envoy-routing": {
    scenario:
      "A mobile app calls 35 internal microservices. Each service currently implements its own TLS certificate and JWT validation logic.",
    requirement: "Centralize security policies and reduce client connection latency.",
    options: [
      {
        id: "opt1",
        label: "Expose all 35 microservices directly to the public internet via Layer 4 NLB",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Leaks internal topology, multiplies TLS handshake CPU on every service, and lacks header-based routing.",
      },
      {
        id: "opt2",
        label: "Deploy Envoy L7 API Gateway with edge TLS termination and path routing",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Centralizes OAuth2/JWT verification and rate limiting, terminates TLS once at edge, and routes internal traffic via fast gRPC/mTLS.",
      },
      {
        id: "opt3",
        label: "Embed billing business logic into the API Gateway routing layer",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. The 'Fat Gateway' antipattern couples routing with domain business rules, degrading gateway performance and deployment velocity.",
      },
    ],
  },
  "load-balancing-horizontal-scaling": {
    scenario:
      "A ticketing platform expects a 10x traffic surge during a 9:00 AM concert ticket launch.",
    requirement: "Ensure worker tier scales smoothly without crashing cold instances.",
    options: [
      {
        id: "opt1",
        label: "Rely solely on CPU-based reactive autoscaling triggered at 9:00 AM",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Container spin-up and readiness probes take 60-90s, causing initial traffic spike to drop requests before new instances join the pool.",
      },
      {
        id: "opt2",
        label: "Pre-scale instance pool with slow-start load balancer warmup and pre-warmed caches",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Pre-scaling provides immediate capacity, while slow-start warmup prevents cold databases and caches from getting hammered simultaneously.",
      },
      {
        id: "opt3",
        label: "Store user shopping carts in container local disk RAM",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Statefulness breaks horizontal scaling; if requests land on a different replica, user carts disappear.",
      },
    ],
  },
  "raft-distributed-consensus": {
    scenario:
      "A 5-node etcd cluster loses 2 nodes due to a rack power failure in the secondary datacenter.",
    requirement: "Determine cluster behavior and ability to commit new configuration changes.",
    options: [
      {
        id: "opt1",
        label: "Reject all writes because the cluster is no longer 100% intact",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Raft does not require 100% node presence; requiring all nodes defeats the entire purpose of fault-tolerant consensus.",
      },
      {
        id: "opt2",
        label: "Continue committing writes since 3 of 5 nodes form a strict majority quorum",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Quorum = floor(N/2) + 1 = floor(5/2) + 1 = 3 nodes. Since 3 nodes remain active, Raft continues electing leaders and committing logs safely.",
      },
      {
        id: "opt3",
        label: "Dynamically reduce quorum to 1 node to guarantee maximum uptime",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Reducing quorum without consensus creates immediate split-brain, causing catastrophic state divergence and data corruption.",
      },
    ],
  },
  "circuit-breakers-resilience": {
    scenario:
      "A fraud evaluation microservice latency degrades from 25ms to 8,000ms under heavy database lock contention.",
    requirement: "Prevent checkout service thread pool exhaustion while still processing transactions.",
    options: [
      {
        id: "opt1",
        label: "Increase checkout HTTP connection timeout to 15 seconds to wait out the fraud DB",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Holding threads open for 15s exhausts Tomcat/Node connection pools within seconds, turning a downstream slow-down into a full platform crash.",
      },
      {
        id: "opt2",
        label: "Trip Circuit Breaker after 50% failures over 300ms, falling back to async review",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. The Circuit Breaker fails fast immediately without waiting, shedding load from the struggling fraud service and allowing checkouts to finish.",
      },
      {
        id: "opt3",
        label: "Retry failed fraud checks 5 times immediately in a while loop",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Causes a massive Retry Storm that multiplies traffic onto the struggling database by 5x, guaranteeing it can never recover.",
      },
    ],
  },
  "distributed-tracing-opentelemetry": {
    scenario:
      "Users in Europe report sporadic 3.2-second checkout delays (p99.9), while average latency is 65ms across 22 microservices.",
    requirement: "Pinpoint the exact microservice and query responsible for the tail latency spike.",
    options: [
      {
        id: "opt1",
        label: "Add high-verbosity console print statements across all 22 microservices",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Produces terabytes of disjointed log lines without correlation IDs, making causal timeline reconstruction across services impossible.",
      },
      {
        id: "opt2",
        label: "Inject W3C traceparent headers and analyze OpenTelemetry spans in Jaeger",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Distributed tracing visualizes the full synchronous/asynchronous call DAG, immediately isolating the exact child span and query causing the tail delay.",
      },
      {
        id: "opt3",
        label: "Double the CPU cores on all 22 services blindly",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. Tail latency spikes are typically caused by lock contention, missing database indexes, or slow remote DNS, not CPU deficits.",
      },
    ],
  },
  "zero-trust-mtls-security": {
    scenario:
      "An attacker compromises a public-facing frontend web container through an unpatched dependency vulnerability.",
    requirement: "Prevent the attacker from accessing the internal payments and database clusters.",
    options: [
      {
        id: "opt1",
        label: "Rely on the AWS VPC subnet security group to block internal access",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. The compromised container is already inside the VPC perimeter. With plain HTTP, the attacker can sniff credentials and make unauthorized calls.",
      },
      {
        id: "opt2",
        label: "Enforce Mutual TLS (mTLS) with SPIFFE cryptographic IDs and strict RBAC",
        isOptimal: true,
        tradeoffExplanation:
          "Optimal. Zero Trust requires every request to prove cryptographic identity. The frontend SPIFFE ID has no IAM permission to call internal payment endpoints.",
      },
      {
        id: "opt3",
        label: "Store a shared secret password in an environment variable shared by all pods",
        isOptimal: false,
        tradeoffExplanation:
          "Suboptimal. The attacker can inspect environment variables in the compromised container and obtain the shared key immediately.",
      },
    ],
  },
};

// Rich structured markdown & LaTeX renderer powered by react-markdown + KaTeX
function LessonSectionRenderer({ sectionText }: { sectionText: string }) {
  return (
    <div className="prose prose-invert max-w-none text-zinc-300 font-sans">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children, ...props }) => (
            <h1
              className="text-xl sm:text-2xl font-bold font-display text-zinc-100 tracking-tight mt-6 mb-3"
              {...props}
            >
              {children}
            </h1>
          ),
          h2: ({ children, ...props }) => (
            <h2
              className="text-lg sm:text-xl font-semibold font-display text-zinc-100 tracking-tight mt-7 mb-3.5 border-b border-zinc-800/80 pb-2"
              {...props}
            >
              {children}
            </h2>
          ),
          h3: ({ children, ...props }) => (
            <h3
              className="text-base sm:text-lg font-semibold font-sans text-zinc-200 mt-5 mb-2.5"
              {...props}
            >
              {children}
            </h3>
          ),
          h4: ({ children, ...props }) => (
            <h4
              className="text-sm sm:text-base font-semibold font-sans text-zinc-300 mt-4 mb-2"
              {...props}
            >
              {children}
            </h4>
          ),
          p: ({ children, ...props }) => (
            <p
              className="text-sm sm:text-[15px] text-zinc-300 leading-relaxed my-3 font-sans"
              {...props}
            >
              {children}
            </p>
          ),
          ul: ({ children, ...props }) => (
            <ul
              className="list-disc pl-6 my-3.5 space-y-1.5 text-sm sm:text-[15px] text-zinc-300 marker:text-zinc-500"
              {...props}
            >
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol
              className="list-decimal pl-6 my-3.5 space-y-1.5 text-sm sm:text-[15px] text-zinc-300 marker:text-zinc-500"
              {...props}
            >
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li className="leading-relaxed text-zinc-300 pl-1" {...props}>
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              className="border-l border-zinc-700 bg-zinc-900/60 px-4 py-2.5 my-4 rounded-r-md text-sm sm:text-[15px] text-zinc-300 italic shadow-sm"
              {...props}
            >
              {children}
            </blockquote>
          ),
          code: ({ className, children, ...props }) => {
            const isBlock = Boolean(className) || (typeof children === "string" && children.includes("\n"));
            if (isBlock) {
              return (
                <code
                  className="font-mono text-xs sm:text-[13px] leading-relaxed text-zinc-300"
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="px-1.5 py-0.5 rounded bg-zinc-800/90 font-mono text-xs sm:text-[13px] text-sky-300 border border-zinc-700/60"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <div className="relative my-4 rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs sm:text-[13px] text-zinc-300 shadow-inner overflow-x-auto">
              <pre className="leading-relaxed whitespace-pre font-mono" {...props}>
                {children}
              </pre>
            </div>
          ),
          table: ({ children, ...props }) => (
            <div className="overflow-x-auto my-5 rounded-lg border border-zinc-800 bg-zinc-950/70 shadow-md">
              <table
                className="min-w-full text-xs sm:text-sm text-left divide-y divide-zinc-800"
                {...props}
              >
                {children}
              </table>
            </div>
          ),
          thead: ({ children, ...props }) => (
            <thead
              className="bg-zinc-900/90 text-sky-400 font-mono font-semibold"
              {...props}
            >
              {children}
            </thead>
          ),
          th: ({ children, ...props }) => (
            <th
              className="px-4 py-3 font-mono text-xs uppercase tracking-wider text-sky-400 font-semibold"
              {...props}
            >
              {children}
            </th>
          ),
          tbody: ({ children, ...props }) => (
            <tbody className="divide-y divide-zinc-800/60" {...props}>
              {children}
            </tbody>
          ),
          tr: ({ children, ...props }) => (
            <tr className="hover:bg-zinc-900/40 transition-colors" {...props}>
              {children}
            </tr>
          ),
          td: ({ children, ...props }) => (
            <td
              className="px-4 py-2.5 text-zinc-300 leading-relaxed font-sans text-xs sm:text-sm"
              {...props}
            >
              {children}
            </td>
          ),
          strong: ({ children, ...props }) => (
            <strong className="font-semibold text-white" {...props}>
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em className="italic text-zinc-200" {...props}>
              {children}
            </em>
          ),
          hr: ({ ...props }) => (
            <hr className="my-6 border-zinc-800" {...props} />
          ),
          a: ({ children, ...props }) => (
            <a
              className="text-sky-400 hover:text-sky-300 underline underline-offset-2 transition-colors"
              {...props}
            >
              {children}
            </a>
          ),
        }}
      >
        {sectionText}
      </ReactMarkdown>
    </div>
  );
}

export default function LessonDetailPage() {
  const params = useParams();
  const slug = params?.slug as string;

  const [lesson, setLesson] = useState<LessonData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  // Mini exercise state
  const [exerciseInput, setExerciseInput] = useState("");
  const [exerciseFeedback, setExerciseFeedback] = useState<{ isCorrect: boolean; message: string } | null>(null);
  const [showHint, setShowHint] = useState(false);

  // Decision matrix state
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [decisionFeedback, setDecisionFeedback] = useState<DecisionOption | null>(null);

  const { user, accessToken, isAuthenticated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isUserLoggedIn = mounted && isAuthenticated && !!user && !!accessToken;

  useEffect(() => {
    if (!slug) {
      setIsLoading(false);
      return;
    }

    const fetchLesson = async () => {
      try {
        const headers: Record<string, string> = {};
        if (accessToken) {
          headers["Authorization"] = `Bearer ${accessToken}`;
        }
        const res = await fetch(`${API_BASE}/api/v1/lessons/${slug}`, { headers });
        if (res.ok) {
          const data = await res.json();
          setLesson(data);
          setCompleted(data.is_completed || false);
        }
      } catch (err) {
        console.error("Failed to load lesson:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchLesson();
  }, [slug, accessToken]);

  const currentExercise = LESSON_EXERCISES[slug] || {
    question: `Evaluate the trade-offs of ${lesson?.title || "this pattern"} in production. Identify the primary capacity constraint.`,
    placeholder: "e.g. Latency vs Storage",
    validate: () => ({ isCorrect: true, message: "Insight noted! Review the trade-off matrix to compare alternatives." }),
    hint: "Think about whether read throughput, disk storage, or consistency is the primary bottleneck.",
  };

  const currentDecisionMatrix = LESSON_DECISION_MATRICES[slug] || LESSON_DECISION_MATRICES["latency-vs-throughput"];

  const handleMarkComplete = async () => {
    if (!lesson) return;
    setIsCompleting(true);

    try {
      if (isAuthenticated && accessToken) {
        const res = await fetch(`${API_BASE}/api/v1/lessons/${lesson.id}/complete`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ notes: "Completed lesson" }),
        });
        if (res.ok) {
          const data = await res.json();
          setCompleted(true);
          setCompletionToast(
            `Lesson Mastered! +${data.xp_earned} XP earned. Skill Mastery: ${data.updated_mastery_score}/100`
          );
        }
      } else {
        setCompleted(true);
        setCompletionToast("Lesson marked as completed! (Sign in to save permanent progress across devices)");
      }
    } catch {
      setCompleted(true);
      setCompletionToast("Lesson completed locally!");
    } finally {
      setIsCompleting(false);
      setTimeout(() => setCompletionToast(null), 6000);
    }
  };

  const handleCheckExercise = (e: React.FormEvent) => {
    e.preventDefault();
    if (!exerciseInput.trim()) return;
    const result = currentExercise.validate(exerciseInput);
    setExerciseFeedback(result);
  };

  const handleSelectDecisionOption = (option: DecisionOption) => {
    setSelectedOptionId(option.id);
    setDecisionFeedback(option);
  };
  if (!mounted || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <Navigation />
        <div className="flex-1 flex items-center justify-center py-32 text-zinc-400 text-xs">
          <Loader2 className="h-5 w-5 animate-spin text-blue-500 mr-2" />
          <span>Loading lesson content...</span>
        </div>
        <Footer />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
        <Navigation />
        <div className="flex-1 max-w-4xl mx-auto px-4 py-20 text-center">
          <h2 className="text-xl font-semibold text-zinc-100 mb-2">Lesson Not Found</h2>
          <p className="text-xs text-zinc-400 mb-4">The requested architectural lesson could not be located.</p>
          <Link href="/learn" className="text-xs font-medium text-blue-400 hover:underline">
            ← Return to Curriculum
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      <Navigation />

      <main id="main-content" tabIndex={-1} className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 focus:outline-none">
        {/* Breadcrumb Navigation */}
        <div className="flex items-center justify-between gap-4 mb-6">
          <Link
            href="/learn"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Curriculum: {lesson.topic_title}</span>
          </Link>

          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Clock className="h-3.5 w-3.5 text-zinc-500" />
            <span>{lesson.estimated_minutes} min read</span>
          </div>
        </div>

        {/* Completion Toast Notification */}
        {completionToast && (
          <div className="mb-6 p-3.5 rounded-md bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-3 shadow-md animate-in fade-in">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span className="flex-1 font-medium">{completionToast}</span>
          </div>
        )}

        {/* Lesson Header with Contextual Action CTAs */}
        <div className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 font-medium mb-2.5 inline-block">
                Dimension {lesson.order_index} of 10 • Architecture Standard
              </span>
              <h1 className="text-2xl sm:text-3xl font-semibold text-zinc-100 tracking-tight font-sans">
                {lesson.title}
              </h1>
            </div>

            {/* Action CTAs */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              <Link
                href={`/simulator?topic=${encodeURIComponent(lesson.topic_slug)}`}
                className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-md bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 text-zinc-200 text-xs sm:text-sm font-medium transition"
              >
                <Layers className="h-3.5 w-3.5 text-zinc-400" />
                <span>Open in Simulator</span>
              </Link>

              <button
                onClick={handleMarkComplete}
                disabled={isCompleting || completed}
                className={`min-h-[44px] inline-flex items-center gap-2 px-3.5 py-2.5 rounded-md text-xs sm:text-sm font-medium transition ${
                  completed
                    ? "bg-emerald-950/60 text-emerald-300 border border-emerald-800/80 cursor-default"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
                }`}
              >
                {isCompleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                )}
                <span>{completed ? "Completed" : "Mark Complete (+50 XP)"}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Conceptual Progression Header */}
        <div className="mb-8 p-3 rounded-md border border-zinc-800 bg-zinc-900/40 overflow-x-auto">
          <div className="flex items-center gap-2 text-xs whitespace-nowrap min-w-max">
            <span className="text-zinc-400 text-xs mr-1 flex items-center gap-1 font-medium">
              <Compass className="h-3.5 w-3.5 text-blue-400" />
              <span>Progression:</span>
            </span>
            {CONCEPTUAL_PROGRESSION.map((step, idx) => (
              <React.Fragment key={step.id}>
                <span className="px-2.5 py-1 rounded bg-zinc-800 text-zinc-300 text-xs font-medium flex items-center gap-1.5">
                  <span className="text-xs font-mono text-zinc-500">{idx + 1}.</span>
                  <span>{step.label}</span>
                </span>
                {idx < CONCEPTUAL_PROGRESSION.length - 1 && (
                  <ChevronRight className="h-3.5 w-3.5 text-zinc-600" />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Rich Lesson Body */}
        <article className="space-y-6">
          {lesson.content_markdown.split("---").map((section, idx) => (
            <div
              key={idx}
              className="rounded-lg border border-zinc-800 bg-zinc-900/50 p-6"
            >
              <LessonSectionRenderer sectionText={section.trim()} />
            </div>
          ))}
        </article>

        {/* Architecture Decision Matrix Interactive Widget */}
        {currentDecisionMatrix && (
          <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6 space-y-4">
            <div className="flex items-center gap-2 text-zinc-200 text-xs sm:text-sm font-semibold uppercase tracking-wide">
              <Split className="h-4 w-4 text-blue-400" />
              <span>Architectural Decision: Trade-Off Analysis</span>
            </div>

            <div className="p-4 rounded-md bg-zinc-950 border border-zinc-800 text-sm space-y-2">
              <p className="text-zinc-300 leading-relaxed font-sans">
                <span className="font-semibold text-zinc-100">Scenario: </span>
                {currentDecisionMatrix.scenario}
              </p>
              <p className="text-zinc-400 text-xs sm:text-sm">
                <span className="text-zinc-500 font-medium">Constraint: </span>
                {currentDecisionMatrix.requirement}
              </p>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs sm:text-sm text-zinc-400 font-medium block">
                Select the most defensible architectural strategy:
              </span>
              {currentDecisionMatrix.options.map((opt) => {
                const isSelected = selectedOptionId === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleSelectDecisionOption(opt)}
                    className={`w-full text-left p-3.5 rounded-md border text-xs sm:text-sm transition flex items-start gap-3 ${
                      isSelected
                        ? opt.isOptimal
                          ? "bg-emerald-950/40 border-emerald-600 text-emerald-200"
                          : "bg-amber-950/40 border-amber-600 text-amber-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    <div
                      className={`h-4 w-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center ${
                        isSelected
                          ? opt.isOptimal
                            ? "border-emerald-400 bg-emerald-500/20"
                            : "border-amber-400 bg-amber-500/20"
                          : "border-zinc-600"
                      }`}
                    >
                      {isSelected && (
                        <div
                          className={`h-1.5 w-1.5 rounded-full ${
                            opt.isOptimal ? "bg-emerald-400" : "bg-amber-400"
                          }`}
                        />
                      )}
                    </div>
                    <span className="leading-snug">{opt.label}</span>
                  </button>
                );
              })}
            </div>

            {decisionFeedback && (
              <div
                className={`p-4 rounded-md border text-xs sm:text-sm space-y-1.5 animate-in fade-in ${
                  decisionFeedback.isOptimal
                    ? "bg-emerald-950/30 border-emerald-800/80 text-emerald-300"
                    : "bg-amber-950/30 border-amber-800/80 text-amber-300"
                }`}
              >
                <div className="flex items-center gap-1.5 font-semibold">
                  {decisionFeedback.isOptimal ? (
                    <>
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                      <span>Optimal Engineering Decision</span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                      <span>Suboptimal Architectural Trade-off</span>
                    </>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">{decisionFeedback.tradeoffExplanation}</p>
              </div>
            )}
          </div>
        )}

        {/* Interactive Mini Exercise Widget */}
        <div className="mt-8 rounded-lg border border-zinc-800 bg-zinc-900/60 p-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-zinc-200 text-xs sm:text-sm font-semibold uppercase tracking-wide">
              <Calculator className="h-4 w-4 text-blue-400" />
              <span>Mini-Exercise: Capacity Calculation</span>
            </div>
            <button
              type="button"
              onClick={() => setShowHint(!showHint)}
              className="min-h-[44px] px-2.5 py-1.5 text-xs sm:text-sm text-zinc-400 hover:text-zinc-200 inline-flex items-center gap-1 transition-colors rounded hover:bg-zinc-800"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span>{showHint ? "Hide Hint" : "Hint"}</span>
            </button>
          </div>

          <p className="text-sm sm:text-[15px] text-zinc-300 mb-4 leading-relaxed">
            {currentExercise.question}
          </p>

          {showHint && (
            <div className="mb-4 p-3.5 rounded-md bg-zinc-950 border border-zinc-800 text-xs sm:text-sm text-zinc-300 leading-relaxed">
              {currentExercise.hint}
            </div>
          )}

          <form onSubmit={handleCheckExercise} className="flex flex-col sm:flex-row gap-2.5 max-w-md">
            <label htmlFor="lesson-mini-exercise-input" className="sr-only">
              Your calculation answer
            </label>
            <input
              id="lesson-mini-exercise-input"
              type="text"
              value={exerciseInput}
              onChange={(e) => setExerciseInput(e.target.value)}
              placeholder={currentExercise.placeholder}
              className="min-h-[44px] rounded-md border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:border-zinc-500 focus:outline-none flex-1"
            />
            <button
              type="submit"
              className="min-h-[44px] px-5 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-medium text-white transition shrink-0 inline-flex items-center justify-center"
            >
              Verify Calculation
            </button>
          </form>

          {exerciseFeedback && (
            <div
              className={`mt-3 p-3.5 rounded-md text-xs sm:text-sm flex items-start gap-2.5 ${
                exerciseFeedback.isCorrect
                  ? "bg-emerald-950/30 text-emerald-300 border border-emerald-800/80"
                  : "bg-amber-950/30 text-amber-300 border border-amber-800/80"
              }`}
            >
              {exerciseFeedback.isCorrect ? (
                <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <X className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              )}
              <span className="leading-relaxed">{exerciseFeedback.message}</span>
            </div>
          )}
        </div>

        {/* Next / Previous Navigation Footer */}
        <div className="mt-12 pt-6 border-t border-zinc-800 flex items-center justify-between gap-4">
          {lesson.prev_lesson_slug ? (
            <Link
              href={`/learn/${lesson.prev_lesson_slug}`}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-800 bg-zinc-900 text-xs sm:text-sm text-zinc-300 hover:text-white hover:bg-zinc-850 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Previous Lesson</span>
            </Link>
          ) : (
            <Link
              href="/learn"
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-md border border-zinc-800 bg-zinc-900 text-xs sm:text-sm text-zinc-300 hover:text-white hover:bg-zinc-850 transition"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Curriculum</span>
            </Link>
          )}

          {lesson.next_lesson_slug ? (
            <Link
              href={`/learn/${lesson.next_lesson_slug}`}
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs sm:text-sm font-medium text-white transition shadow-sm"
            >
              <span>Next Lesson</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <Link
              href="/simulator"
              className="min-h-[44px] inline-flex items-center gap-2 px-4 py-2.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-xs sm:text-sm font-medium text-zinc-200 border border-zinc-700 transition"
            >
              <span>Open in Simulator</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
