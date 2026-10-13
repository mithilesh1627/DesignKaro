import type {
  GuidedExercise,
  GuidedTask,
  TaskValidationResult,
  ExerciseValidationResult,
  EdgeRequirement,
  NodeRequirement,
} from "@/types/exercise";
import type { ArchitectureGraph, ArchitectureNode, ArchitectureEdge } from "@/types/simulator";

/**
 * Validates a single guided task against the learner's current architecture graph.
 */
export function validateTask(
  task: GuidedTask,
  graph: ArchitectureGraph
): TaskValidationResult {
  const missingRequirements: string[] = [];
  const nodes = graph?.nodes || [];
  const edges = graph?.edges || [];

  const nodeMap = new Map<string, ArchitectureNode>(nodes.map((n) => [n.id, n]));

  // 1. Verify Node Requirements
  if (task.requiredNodes && task.requiredNodes.length > 0) {
    for (const req of task.requiredNodes) {
      const matchingNodes = nodes.filter(
        (n) => n.type.toLowerCase() === req.type.toLowerCase()
      );

      const requiredCount = req.minCount ?? 1;
      if (matchingNodes.length < requiredCount) {
        missingRequirements.push(
          `Missing component: Requires at least ${requiredCount} '${req.type}' node(s) on the canvas (found ${matchingNodes.length}).`
        );
      }

      if (req.minReplicas && matchingNodes.length > 0) {
        const underReplicated = matchingNodes.filter(
          (n) => (n.config?.replicas || 1) < req.minReplicas!
        );
        if (underReplicated.length > 0) {
          missingRequirements.push(
            `Insufficient replicas: ${underReplicated.length} '${req.type}' node(s) configured with fewer than ${req.minReplicas} replicas.`
          );
        }
      }
    }
  }

  // 2. Verify Edge Requirements
  if (task.requiredEdges && task.requiredEdges.length > 0) {
    for (const req of task.requiredEdges) {
      const requiredCount = req.minCount ?? 1;
      const matchingEdges = edges.filter((edge) => {
        // Guard against invalid self-loops
        if (edge.source === edge.target) {
          return false;
        }

        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        // Guard against dangling/invalid edges
        if (!sourceNode || !targetNode) {
          return false;
        }

        const matchesSource = matchesType(sourceNode.type, req.sourceType);
        const matchesTarget = matchesType(targetNode.type, req.targetType);

        if (!matchesSource || !matchesTarget) {
          return false;
        }

        if (req.connectionType) {
          return edge.connectionType === req.connectionType;
        }

        return true;
      });

      if (matchingEdges.length < requiredCount) {
        const connDesc = req.connectionType
          ? ` via connection type '${req.connectionType}'`
          : "";
        const countDesc =
          requiredCount > 1
            ? ` (requires at least ${requiredCount}, found ${matchingEdges.length})`
            : "";
        missingRequirements.push(
          `Missing connection: Must connect '${req.sourceType}' → '${req.targetType}'${connDesc}${countDesc}.`
        );
      }
    }
  }

  const isCompleted = missingRequirements.length === 0;

  let feedback = "";
  if (isCompleted) {
    feedback = `Completed: ${task.title}. Architecture criteria satisfied.`;
  } else {
    feedback = `Action required: ${missingRequirements[0]}`;
  }

  return {
    taskId: task.id,
    taskTitle: task.title,
    isCompleted,
    feedback,
    missingRequirements,
  };
}

/**
 * Validates an entire guided exercise against the learner's current architecture graph.
 */
export function validateExercise(
  exercise: GuidedExercise,
  graph: ArchitectureGraph
): ExerciseValidationResult {
  const taskResults: TaskValidationResult[] = exercise.tasks.map((task) =>
    validateTask(task, graph)
  );

  const completedTaskCount = taskResults.filter((t) => t.isCompleted).length;
  const totalTaskCount = exercise.tasks.length;
  const isCompleted = completedTaskCount === totalTaskCount;
  const score = totalTaskCount > 0 ? Math.round((completedTaskCount / totalTaskCount) * 100) : 0;

  let overallFeedback = "";
  if (isCompleted) {
    overallFeedback = exercise.completionMessage;
  } else {
    const nextIncomplete = taskResults.find((t) => !t.isCompleted);
    overallFeedback = nextIncomplete
      ? `Task ${completedTaskCount + 1}/${totalTaskCount}: ${nextIncomplete.feedback}`
      : `Exercise in progress (${completedTaskCount}/${totalTaskCount} tasks completed).`;
  }

  return {
    exerciseId: exercise.id,
    isCompleted,
    completedTaskCount,
    totalTaskCount,
    score,
    taskResults,
    overallFeedback,
  };
}

/**
 * Helper to match component types with polymorphic compute and proxy aliases.
 */
function matchesType(actual: string, expected: string): boolean {
  const a = actual.toLowerCase();
  const e = expected.toLowerCase();

  if (a === e) return true;

  // Compute aliases
  if (e === "server" && ["server", "service", "microservice", "worker"].includes(a)) {
    return true;
  }
  if (e === "compute" && ["server", "service", "microservice", "worker"].includes(a)) {
    return true;
  }

  // Database aliases
  if (e === "database" && ["postgresql", "mysql", "mongodb", "relational_db"].includes(a)) {
    return true;
  }

  // Gateway aliases
  if (e === "gateway" && ["api_gateway", "load_balancer", "gateway"].includes(a)) {
    return true;
  }

  return false;
}
