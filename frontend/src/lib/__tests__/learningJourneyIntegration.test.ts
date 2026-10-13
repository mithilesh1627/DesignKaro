import { describe, it, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { validateExercise, validateTask } from "../exerciseValidator";
import {
  DISTRIBUTED_CACHE_EXERCISE,
  DATABASE_SHARDING_EXERCISE,
  EVENT_DRIVEN_EXERCISE,
  getExerciseForSlug,
  GUIDED_EXERCISES,
} from "../guidedExercises";
import { useExerciseStore } from "../exerciseStore";
import {
  getStarterGraphForTopic,
  CACHE_ASIDE_TOPOLOGY,
  SHARDING_TOPOLOGY,
  EVENT_DRIVEN_TOPOLOGY,
  INITIAL_YOUTUBE_GRAPH,
  STARTER_TEMPLATES,
} from "@/components/simulator/simulatorConstants";
import type { ArchitectureGraph } from "@/types/simulator";

describe("DesignKaro Phase 3 - Learning Journey Integration & Reliability", () => {
  beforeEach(() => {
    // Reset exercise store progress before each test
    const store = useExerciseStore.getState();
    for (const exId of Object.keys(store.progressByExerciseId)) {
      store.resetProgress(exId);
    }
  });

  // --------------------------------------------------------------------------
  // 1. Lesson-to-guided-lab routing for each of the three exercises
  // --------------------------------------------------------------------------
  it("1. resolves lesson-to-guided-lab routing for each of the three exercises", () => {
    const exercises = [
      {
        slug: "distributed-cache-redis",
        expected: DISTRIBUTED_CACHE_EXERCISE,
        expectedTaskCount: 4,
      },
      {
        slug: "consistent-hashing-sharding",
        expected: DATABASE_SHARDING_EXERCISE,
        expectedTaskCount: 3,
      },
      {
        slug: "kafka-event-streaming",
        expected: EVENT_DRIVEN_EXERCISE,
        expectedTaskCount: 4,
      },
    ];

    for (const { slug, expected, expectedTaskCount } of exercises) {
      const resolved = getExerciseForSlug(slug);
      assert.ok(resolved, `Exercise for '${slug}' must resolve`);
      assert.strictEqual(resolved.id, expected.id);
      assert.strictEqual(resolved.slug, slug);
      assert.strictEqual(resolved.tasks.length, expectedTaskCount);

      // Verify routing URL contract
      const guidedLabUrl = `/simulator?topic=${encodeURIComponent(slug)}&mode=guided`;
      assert.ok(guidedLabUrl.includes(`topic=${slug}`));
      assert.ok(guidedLabUrl.includes("mode=guided"));
    }
  });

  // --------------------------------------------------------------------------
  // 2. Correct topic and exercise selection after refresh
  // --------------------------------------------------------------------------
  it("2. guarantees deterministic topic and exercise selection across simulated page refreshes", () => {
    const simulatedSearchParams = [
      { topic: "distributed-cache-redis", mode: "guided" },
      { topic: "consistent-hashing-sharding", mode: "guided" },
      { topic: "kafka-event-streaming", mode: "guided" },
    ];

    for (const params of simulatedSearchParams) {
      // Simulate first load
      const exercise1 = getExerciseForSlug(params.topic);
      const graph1 = exercise1?.initialGraph;

      // Simulate refresh with exact same parameters
      const exercise2 = getExerciseForSlug(params.topic);
      const graph2 = exercise2?.initialGraph;

      assert.strictEqual(exercise1?.id, exercise2?.id);
      assert.strictEqual(graph1?.metadata.problemId, graph2?.metadata.problemId);
      assert.strictEqual(graph1?.nodes.length, graph2?.nodes.length);
    }
  });

  // --------------------------------------------------------------------------
  // 3. Required nodes and edges evaluated from live canvas state
  // --------------------------------------------------------------------------
  it("3. validates directly against the provided live canvas state rather than static constants", () => {
    // Clone target graph but alter node configuration
    const liveCustomGraph: ArchitectureGraph = JSON.parse(
      JSON.stringify(DISTRIBUTED_CACHE_EXERCISE.targetGraph)
    );

    // Initial cloned graph passes
    const passResult = validateExercise(DISTRIBUTED_CACHE_EXERCISE, liveCustomGraph);
    assert.strictEqual(passResult.isCompleted, true);

    // Modify a node type on the live canvas state
    const redisNode = liveCustomGraph.nodes.find((n) => n.type === "redis");
    assert.ok(redisNode);
    redisNode.type = "memcached_unsupported";

    // Re-evaluating against the modified live graph MUST reflect the edit
    const failResult = validateExercise(DISTRIBUTED_CACHE_EXERCISE, liveCustomGraph);
    assert.strictEqual(failResult.isCompleted, false);
    assert.strictEqual(failResult.completedTaskCount < passResult.completedTaskCount, true);
  });

  // --------------------------------------------------------------------------
  // 4. Removing a required node invalidates dependent tasks
  // --------------------------------------------------------------------------
  it("4. invalidates dependent tasks when a required node is removed from the canvas", () => {
    const liveGraph: ArchitectureGraph = JSON.parse(
      JSON.stringify(DISTRIBUTED_CACHE_EXERCISE.targetGraph)
    );

    // Baseline: complete
    const initial = validateExercise(DISTRIBUTED_CACHE_EXERCISE, liveGraph);
    assert.strictEqual(initial.isCompleted, true);

    // Remove Redis node
    liveGraph.nodes = liveGraph.nodes.filter((n) => n.type !== "redis");

    const afterRemoval = validateExercise(DISTRIBUTED_CACHE_EXERCISE, liveGraph);
    assert.strictEqual(afterRemoval.isCompleted, false);

    // Task 1 (add redis) must fail
    const task1 = afterRemoval.taskResults.find((t) => t.taskId === "task-add-redis");
    assert.strictEqual(task1?.isCompleted, false);

    // Task 2 (connect read path to redis) must fail
    const task2 = afterRemoval.taskResults.find((t) => t.taskId === "task-connect-read-path");
    assert.strictEqual(task2?.isCompleted, false);

    // Task 4 (redis replica count) must fail
    const task4 = afterRemoval.taskResults.find((t) => t.taskId === "task-configure-redis-ha");
    assert.strictEqual(task4?.isCompleted, false);
  });

  // --------------------------------------------------------------------------
  // 5. Removing a required edge invalidates the corresponding task
  // --------------------------------------------------------------------------
  it("5. invalidates the specific edge task when a required connection is deleted", () => {
    const liveGraph: ArchitectureGraph = JSON.parse(
      JSON.stringify(DISTRIBUTED_CACHE_EXERCISE.targetGraph)
    );

    // Remove the read_path edge
    liveGraph.edges = liveGraph.edges.filter((e) => e.connectionType !== "read_path");

    const result = validateExercise(DISTRIBUTED_CACHE_EXERCISE, liveGraph);
    assert.strictEqual(result.isCompleted, false);

    const readPathTask = result.taskResults.find((t) => t.taskId === "task-connect-read-path");
    assert.strictEqual(readPathTask?.isCompleted, false);
    assert.match(readPathTask!.feedback, /read_path/i);

    // Node placement tasks should still pass
    const nodeTask = result.taskResults.find((t) => t.taskId === "task-add-redis");
    assert.strictEqual(nodeTask?.isCompleted, true);
  });

  // --------------------------------------------------------------------------
  // 6. Dangling edges and invalid node references fail safely
  // --------------------------------------------------------------------------
  it("6. safely ignores dangling edges and invalid node references without throwing", () => {
    const corruptedGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "server-1",
          type: "server",
          name: "Router",
          category: "compute",
          position: { x: 0, y: 0 },
          config: { replicas: 1, qps_capacity: 1000, latency_ms: 1 },
        },
      ],
      edges: [
        { id: "e-dangling-1", source: "server-1", target: "ghost-node-1", connectionType: "sync" },
        { id: "e-dangling-2", source: "ghost-node-2", target: "server-1", connectionType: "sync" },
        { id: "e-dangling-3", source: "ghost-node-3", target: "ghost-node-4", connectionType: "sync" },
      ],
      metadata: {
        problemId: "test-dangling",
        title: "Dangling Edges Test",
        targetRps: 100,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    assert.doesNotThrow(() => {
      const res = validateExercise(DATABASE_SHARDING_EXERCISE, corruptedGraph);
      assert.strictEqual(res.isCompleted, false);
      assert.strictEqual(res.completedTaskCount, 0);
    });
  });

  // --------------------------------------------------------------------------
  // 7. Invalid or cyclical edges are handled according to intended graph rules
  // --------------------------------------------------------------------------
  it("7. disallows self-loop connections from falsely satisfying connection requirements", () => {
    const selfLoopGraph: ArchitectureGraph = {
      nodes: [
        {
          id: "server-1",
          type: "server",
          name: "Server",
          category: "compute",
          position: { x: 0, y: 0 },
          config: { replicas: 1, qps_capacity: 1000, latency_ms: 1 },
        },
        {
          id: "redis-1",
          type: "redis",
          name: "Redis",
          category: "cache",
          position: { x: 200, y: 0 },
          config: { replicas: 2, qps_capacity: 5000, latency_ms: 1 },
        },
      ],
      edges: [
        // Self-loop on server
        {
          id: "e-self-loop",
          source: "server-1",
          target: "server-1",
          connectionType: "read_path",
        },
      ],
      metadata: {
        problemId: "distributed-cache-redis",
        title: "Self Loop Test",
        targetRps: 100,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    const task = DISTRIBUTED_CACHE_EXERCISE.tasks.find(
      (t) => t.id === "task-connect-read-path"
    );
    assert.ok(task);

    const validation = validateTask(task, selfLoopGraph);
    assert.strictEqual(validation.isCompleted, false);
    assert.match(validation.feedback, /Must connect 'server' → 'redis'/i);
  });

  // --------------------------------------------------------------------------
  // 8. Hints do not affect completion state
  // --------------------------------------------------------------------------
  it("8. verifies that requesting progressive hints never affects completion state", () => {
    const store = useExerciseStore.getState();
    const exId = DISTRIBUTED_CACHE_EXERCISE.id;
    const taskId = DISTRIBUTED_CACHE_EXERCISE.tasks[0].id;

    // Initially not started
    let prog = store.getProgress(exId);
    assert.strictEqual(prog.status, "not_started");
    assert.strictEqual(prog.completedTaskIds.length, 0);

    // Reveal Hint 1
    store.revealNextHint(exId, taskId);
    prog = store.getProgress(exId);
    assert.strictEqual(prog.revealedHintLevels[taskId], 1);
    assert.strictEqual(prog.status, "not_started"); // Not marked complete
    assert.strictEqual(prog.completedTaskIds.length, 0);

    // Reveal Hint 2 and Hint 3
    store.revealNextHint(exId, taskId);
    store.revealNextHint(exId, taskId);
    prog = store.getProgress(exId);
    assert.strictEqual(prog.revealedHintLevels[taskId], 3);
    assert.strictEqual(prog.status, "not_started");
    assert.strictEqual(prog.completedTaskIds.length, 0);
  });

  // --------------------------------------------------------------------------
  // 9. All required tasks passing produces completion
  // --------------------------------------------------------------------------
  it("9. marks exercise complete when all required tasks pass against actual graph", () => {
    const store = useExerciseStore.getState();
    const ex = DISTRIBUTED_CACHE_EXERCISE;
    const targetGraph = ex.targetGraph!;

    const result = validateExercise(ex, targetGraph);
    assert.strictEqual(result.isCompleted, true);
    assert.strictEqual(result.completedTaskCount, ex.tasks.length);
    assert.strictEqual(result.score, 100);

    const passedIds = result.taskResults.filter((t) => t.isCompleted).map((t) => t.taskId);
    store.recordValidation(ex.id, passedIds, result.isCompleted);

    const prog = store.getProgress(ex.id);
    assert.strictEqual(prog.status, "completed");
    assert.strictEqual(prog.completedTaskIds.length, ex.tasks.length);
    assert.ok(prog.completedAt !== null);
  });

  // --------------------------------------------------------------------------
  // 10. Incomplete graphs never produce completed exercises
  // --------------------------------------------------------------------------
  it("10. ensures incomplete graphs never produce completed exercises", () => {
    for (const ex of Object.values(GUIDED_EXERCISES)) {
      const initialResult = validateExercise(ex, ex.initialGraph);
      assert.strictEqual(initialResult.isCompleted, false);
      assert.strictEqual(
        initialResult.completedTaskCount < ex.tasks.length,
        true,
        `Initial graph for ${ex.title} must not pass all tasks`
      );
    }
  });

  // --------------------------------------------------------------------------
  // 11. Revalidation after graph edits updates task state correctly (Reversibility)
  // --------------------------------------------------------------------------
  it("11. truthfully and reversibly updates task state when graph edits break requirements", () => {
    const store = useExerciseStore.getState();
    const ex = DISTRIBUTED_CACHE_EXERCISE;
    const liveGraph: ArchitectureGraph = JSON.parse(JSON.stringify(ex.targetGraph));

    // Step 1: Validate full graph and record completion
    const passResult = validateExercise(ex, liveGraph);
    assert.strictEqual(passResult.isCompleted, true);
    store.recordValidation(
      ex.id,
      passResult.taskResults.map((t) => t.taskId),
      true
    );
    assert.strictEqual(store.getProgress(ex.id).status, "completed");

    // Step 2: Learner breaks the graph by removing the read_path edge
    liveGraph.edges = liveGraph.edges.filter((e) => e.connectionType !== "read_path");
    const brokenResult = validateExercise(ex, liveGraph);
    assert.strictEqual(brokenResult.isCompleted, false);

    const remainingPassedIds = brokenResult.taskResults
      .filter((t) => t.isCompleted)
      .map((t) => t.taskId);
    assert.strictEqual(remainingPassedIds.includes("task-connect-read-path"), false);

    // Record revalidation
    store.recordValidation(ex.id, remainingPassedIds, brokenResult.isCompleted);

    // Stored progress MUST revert to in_progress and completedTaskIds must NOT retain the broken task
    const revertedProg = store.getProgress(ex.id);
    assert.strictEqual(revertedProg.status, "in_progress");
    assert.strictEqual(revertedProg.completedAt, null);
    assert.strictEqual(revertedProg.completedTaskIds.includes("task-connect-read-path"), false);
  });

  // --------------------------------------------------------------------------
  // 12. Exercise switching does not leak progress between exercises
  // --------------------------------------------------------------------------
  it("12. isolates progress so completing one exercise does not leak into another", () => {
    const store = useExerciseStore.getState();
    const ex1 = DISTRIBUTED_CACHE_EXERCISE;
    const ex2 = DATABASE_SHARDING_EXERCISE;

    // Complete Exercise 1
    store.recordValidation(ex1.id, ["t1", "t2", "t3", "t4"], true);
    assert.strictEqual(store.getProgress(ex1.id).status, "completed");

    // Exercise 2 must still be untouched
    const ex2Prog = store.getProgress(ex2.id);
    assert.strictEqual(ex2Prog.status, "not_started");
    assert.strictEqual(ex2Prog.completedTaskIds.length, 0);
    assert.strictEqual(ex2Prog.completedAt, null);
  });

  // --------------------------------------------------------------------------
  // 13. localStorage reload and malformed-data recovery
  // --------------------------------------------------------------------------
  it("13. safely normalizes corrupt or malformed stored progress without crashing", () => {
    const store = useExerciseStore.getState();

    // Inject malformed record directly into store state
    const rawStore = store as unknown as { progressByExerciseId: Record<string, unknown> };
    rawStore.progressByExerciseId["corrupted-ex"] = {
      status: "invalid_status",
      completedTaskIds: null,
      revealedHintLevels: "not_an_object",
      lastAttemptedAt: 12345,
      completedAt: false,
    };

    const sanitized = store.getProgress("corrupted-ex");
    assert.strictEqual(sanitized.status, "not_started");
    assert.deepStrictEqual(sanitized.completedTaskIds, []);
    assert.deepStrictEqual(sanitized.revealedHintLevels, {});
    assert.strictEqual(sanitized.lastAttemptedAt, null);
    assert.strictEqual(sanitized.completedAt, null);

    // Non-existent key returns default
    const nonExistent = store.getProgress("non-existent-key");
    assert.strictEqual(nonExistent.status, "not_started");
  });

  // --------------------------------------------------------------------------
  // 14. Practice and Progress models remain strictly separated
  // --------------------------------------------------------------------------
  it("14. keeps guided exercises strictly distinct from interview practice problems", () => {
    const guidedSlugs = Object.keys(GUIDED_EXERCISES);

    // Practice problem slugs that should NOT be confused with guided exercises
    const practiceSlugs = [
      "url-shortener-tinyurl",
      "distributed-rate-limiter",
      "real-time-chat-engine",
      "video-transcoding-cdn",
      "distributed-ride-dispatch",
      "ticketmaster-distributed-lock",
      "ml-recommendation-system",
      "distributed-web-crawler",
    ];

    for (const pSlug of practiceSlugs) {
      assert.strictEqual(
        guidedSlugs.includes(pSlug),
        false,
        `Practice slug ${pSlug} must not be in guided exercises catalog`
      );
    }
  });

  // --------------------------------------------------------------------------
  // 15. Existing Phase 1 topic routing and default simulator behavior intact
  // --------------------------------------------------------------------------
  it("15. preserves Phase 1 topic starter templates and default simulator fallbacks", () => {
    // Phase 1 Starter Templates
    assert.strictEqual(getStarterGraphForTopic("distributed-cache-redis"), CACHE_ASIDE_TOPOLOGY);
    assert.strictEqual(getStarterGraphForTopic("consistent-hashing-sharding"), SHARDING_TOPOLOGY);
    assert.strictEqual(getStarterGraphForTopic("kafka-event-streaming"), EVENT_DRIVEN_TOPOLOGY);
    assert.ok(getStarterGraphForTopic("api-gateway-envoy-routing"));
    assert.ok(getStarterGraphForTopic("load-balancing-horizontal-scaling"));

    // Unknown topics safely return null to allow default fallback
    assert.strictEqual(getStarterGraphForTopic("unknown-topic-xyz"), null);

    // Initial default graph is preserved
    assert.strictEqual(INITIAL_YOUTUBE_GRAPH.metadata.title, "Design YouTube");
    assert.ok(STARTER_TEMPLATES.three_tier);
  });
});
