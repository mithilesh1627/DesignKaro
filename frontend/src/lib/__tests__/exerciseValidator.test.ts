import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  validateExercise,
  validateTask,
} from "../exerciseValidator";
import {
  DISTRIBUTED_CACHE_EXERCISE,
  DATABASE_SHARDING_EXERCISE,
  EVENT_DRIVEN_EXERCISE,
  getExerciseForSlug,
} from "../guidedExercises";
import type { ArchitectureGraph } from "@/types/simulator";

describe("DesignKaro Phase 2 - Guided Exercises & Validation Engine", () => {
  // --------------------------------------------------------------------------
  // 1. Caching Exercise: Starter Graph Validation
  // --------------------------------------------------------------------------
  it("fails validation for starter uncached graph with actionable task feedback", () => {
    const starterGraph = DISTRIBUTED_CACHE_EXERCISE.initialGraph;
    const result = validateExercise(DISTRIBUTED_CACHE_EXERCISE, starterGraph);

    assert.strictEqual(result.isCompleted, false);
    assert.strictEqual(result.completedTaskCount < result.totalTaskCount, true);
    assert.strictEqual(result.score < 100, true);

    // Task 1: Add Redis node should fail because there is no redis node in starter graph
    const task1 = result.taskResults.find((t) => t.taskId === "task-add-redis");
    assert.ok(task1);
    assert.strictEqual(task1.isCompleted, false);
    assert.match(task1.feedback, /Redis/i);

    // Task 2: Wire Read Path should fail
    const task2 = result.taskResults.find((t) => t.taskId === "task-connect-read-path");
    assert.ok(task2);
    assert.strictEqual(task2.isCompleted, false);
  });

  // --------------------------------------------------------------------------
  // 2. Caching Exercise: Full Valid Cache-Aside Topology
  // --------------------------------------------------------------------------
  it("passes validation when complete cache-aside topology with >= 2 replicas is provided", () => {
    const targetGraph = DISTRIBUTED_CACHE_EXERCISE.targetGraph;
    assert.ok(targetGraph);

    const result = validateExercise(DISTRIBUTED_CACHE_EXERCISE, targetGraph);
    assert.strictEqual(result.isCompleted, true);
    assert.strictEqual(result.completedTaskCount, result.totalTaskCount);
    assert.strictEqual(result.score, 100);
    assert.match(result.overallFeedback, /Cache-Aside/i);
  });

  // --------------------------------------------------------------------------
  // 3. Partial Topology: Missing Database Write / Fallback Path
  // --------------------------------------------------------------------------
  it("detects missing database write path and provides actionable remediation", () => {
    const partialGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "server-1",
          type: "server",
          name: "User Service",
          category: "compute",
          position: { x: 300, y: 200 },
          config: { replicas: 2, qps_capacity: 1000, latency_ms: 5 },
        },
        {
          id: "redis-1",
          type: "redis",
          name: "Cache Cluster",
          category: "cache",
          position: { x: 550, y: 150 },
          config: { replicas: 2, qps_capacity: 5000, latency_ms: 1 },
        },
        {
          id: "postgresql-1",
          type: "postgresql",
          name: "User DB",
          category: "database",
          position: { x: 550, y: 350 },
          config: { replicas: 1, qps_capacity: 1000, latency_ms: 15 },
        },
      ],
      edges: [
        {
          id: "e-srv-cache",
          source: "server-1",
          target: "redis-1",
          connectionType: "read_path",
        },
        // Missing edge from server-1 to postgresql-1 with write_path
      ],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "Partial Cache",
        targetRps: 2000,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const task3 = DISTRIBUTED_CACHE_EXERCISE.tasks.find((t) => t.id === "task-connect-write-fallback");
    assert.ok(task3);

    const task3Result = validateTask(task3, partialGraph);
    assert.strictEqual(task3Result.isCompleted, false);
    assert.strictEqual(task3Result.missingRequirements.length > 0, true);
    assert.match(task3Result.feedback, /server.*postgresql/i);
  });

  // --------------------------------------------------------------------------
  // 4. Invalid / Dangling Edges Handled Safely
  // --------------------------------------------------------------------------
  it("safely handles dangling edges pointing to non-existent nodes without crashing", () => {
    const danglingGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "server-1",
          type: "server",
          name: "Service",
          category: "compute",
          position: { x: 100, y: 100 },
          config: { replicas: 1, qps_capacity: 100, latency_ms: 5 },
        },
      ],
      edges: [
        {
          id: "e-ghost",
          source: "server-1",
          target: "non-existent-redis-node-999",
          connectionType: "read_path",
        },
      ],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "Dangling Graph",
        targetRps: 100,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    assert.doesNotThrow(() => {
      const result = validateExercise(DISTRIBUTED_CACHE_EXERCISE, danglingGraph);
      assert.strictEqual(result.isCompleted, false);
    });
  });

  // --------------------------------------------------------------------------
  // 5. Irrelevant Extra Nodes Do Not Falsely Satisfy Requirements
  // --------------------------------------------------------------------------
  it("does not allow irrelevant components (e.g. CDN or Object Storage) to satisfy Redis requirements", () => {
    const irrelevantNodesGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "client-1",
          type: "client",
          name: "Client",
          category: "compute",
          position: { x: 50, y: 100 },
          config: { replicas: 1, qps_capacity: 100, latency_ms: 1 },
        },
        {
          id: "cdn-1",
          type: "cdn",
          name: "Cloudflare CDN",
          category: "compute",
          position: { x: 250, y: 100 },
          config: { replicas: 5, qps_capacity: 10000, latency_ms: 2 },
        },
        {
          id: "s3-1",
          type: "s3_compatible",
          name: "Object Store",
          category: "database",
          position: { x: 450, y: 100 },
          config: { replicas: 3, qps_capacity: 5000, latency_ms: 20 },
        },
      ],
      edges: [
        {
          id: "e-client-cdn",
          source: "client-1",
          target: "cdn-1",
          connectionType: "sync",
        },
      ],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "Irrelevant Nodes",
        targetRps: 500,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const task1 = DISTRIBUTED_CACHE_EXERCISE.tasks[0];
    const taskResult = validateTask(task1, irrelevantNodesGraph);
    assert.strictEqual(taskResult.isCompleted, false);
    assert.strictEqual(taskResult.missingRequirements.length > 0, true);
  });

  // --------------------------------------------------------------------------
  // 6. Progressive Hints Behavior
  // --------------------------------------------------------------------------
  it("ensures progressive hints are properly structured with 3 distinct tiers", () => {
    for (const task of DISTRIBUTED_CACHE_EXERCISE.tasks) {
      assert.strictEqual(task.hints.length, 3);
      // Hint 0: Conceptual nudge
      assert.ok(task.hints[0].length > 10);
      // Hint 1: Architectural hint
      assert.ok(task.hints[1].length > 10);
      // Hint 2: Direct step guidance
      assert.ok(task.hints[2].length > 10);

      // Verify hints are distinct
      assert.notStrictEqual(task.hints[0], task.hints[1]);
      assert.notStrictEqual(task.hints[1], task.hints[2]);
    }
  });

  // --------------------------------------------------------------------------
  // 7. Database Sharding Exercise Validation
  // --------------------------------------------------------------------------
  it("validates database sharding topology with router and 3 database shards", () => {
    const initialResult = validateExercise(
      DATABASE_SHARDING_EXERCISE,
      DATABASE_SHARDING_EXERCISE.initialGraph
    );
    assert.strictEqual(initialResult.isCompleted, false);

    const shardedGraph = DATABASE_SHARDING_EXERCISE.targetGraph;
    assert.ok(shardedGraph);
    const completedResult = validateExercise(DATABASE_SHARDING_EXERCISE, shardedGraph);
    assert.strictEqual(completedResult.isCompleted, true);
    assert.strictEqual(completedResult.score, 100);
    assert.strictEqual(completedResult.completedTaskCount, DATABASE_SHARDING_EXERCISE.tasks.length);
  });

  // --------------------------------------------------------------------------
  // 8. Event-Driven Architecture Exercise Validation
  // --------------------------------------------------------------------------
  it("validates event-driven architecture with Producer, Kafka Broker, Consumer, and DB", () => {
    const initialResult = validateExercise(
      EVENT_DRIVEN_EXERCISE,
      EVENT_DRIVEN_EXERCISE.initialGraph
    );
    assert.strictEqual(initialResult.isCompleted, false);

    const targetGraph = EVENT_DRIVEN_EXERCISE.targetGraph;
    assert.ok(targetGraph);
    const completedResult = validateExercise(EVENT_DRIVEN_EXERCISE, targetGraph);
    assert.strictEqual(completedResult.isCompleted, true);
    assert.strictEqual(completedResult.score, 100);
    assert.strictEqual(completedResult.completedTaskCount, EVENT_DRIVEN_EXERCISE.tasks.length);
  });

  // --------------------------------------------------------------------------
  // 9. Topic Slug Mapping and Fallback Behavior
  // --------------------------------------------------------------------------
  it("correctly resolves exercises by slug, topic slug, aliases, and gracefully falls back for unknown topics", () => {
    // Exact lesson slug
    const cacheEx = getExerciseForSlug("distributed-cache-redis");
    assert.ok(cacheEx);
    assert.strictEqual(cacheEx.id, "exercise-distributed-caching");

    // Topic alias
    const aliasEx = getExerciseForSlug("distributed-caching");
    assert.ok(aliasEx);
    assert.strictEqual(aliasEx.id, "exercise-distributed-caching");

    // Sharding aliases
    assert.ok(getExerciseForSlug("consistent-hashing-sharding"));
    assert.ok(getExerciseForSlug("database-sharding"));

    // Kafka / Event-driven aliases
    assert.ok(getExerciseForSlug("kafka-event-streaming"));
    assert.ok(getExerciseForSlug("event-driven-architecture"));

    // Unknown unmapped topic cleanly returns null
    const unknownEx = getExerciseForSlug("quantum-computing-random-topic");
    assert.strictEqual(unknownEx, null);
  });

  // --------------------------------------------------------------------------
  // 10. Insufficient Replicas Validation
  // --------------------------------------------------------------------------
  it("flags nodes that fail the minimum replica requirement", () => {
    const singleReplicaGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "redis-1",
          type: "redis",
          name: "Redis Cache",
          category: "cache",
          position: { x: 300, y: 200 },
          config: { replicas: 1, qps_capacity: 50000, latency_ms: 1 },
        },
      ],
      edges: [],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "Single Replica Cache",
        targetRps: 100,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const task4 = DISTRIBUTED_CACHE_EXERCISE.tasks.find((t) => t.id === "task-configure-redis-ha");
    assert.ok(task4);

    const taskResult = validateTask(task4, singleReplicaGraph);
    assert.strictEqual(taskResult.isCompleted, false);
    assert.match(taskResult.feedback, /replicas/i);
  });
});
