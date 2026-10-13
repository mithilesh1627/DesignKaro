"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  HelpCircle,
  Lightbulb,
  RotateCcw,
  Sparkles,
  ArrowRight,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  X,
  Target,
  Check,
  Shield,
  Layers,
  FlaskConical,
} from "lucide-react";
import { GuidedExercise, HintLevel, TaskValidationResult } from "@/types/exercise";
import { ArchitectureGraph } from "@/types/simulator";
import { validateExercise, validateTask } from "@/lib/exerciseValidator";
import { useExerciseStore } from "@/lib/exerciseStore";
import { SimulatorTab } from "./simulatorConstants";
import { SimulatorTradeoffLab } from "./SimulatorTradeoffLab";

interface SimulatorGuidedExercisePanelProps {
  exercise: GuidedExercise;
  graphState: ArchitectureGraph;
  setActiveTab: (tab: SimulatorTab) => void;
  onResetToExerciseStarter: () => void;
  onExerciseCompleted?: (exerciseId: string) => void;
}

export function SimulatorGuidedExercisePanel({
  exercise,
  graphState,
  setActiveTab,
  onResetToExerciseStarter,
  onExerciseCompleted,
}: SimulatorGuidedExercisePanelProps) {
  const {
    progressByExerciseId,
    startExercise,
    recordValidation,
    revealNextHint,
    resetProgress,
  } = useExerciseStore();

  const progress = progressByExerciseId[exercise.id] || {
    status: "not_started",
    completedTaskIds: [],
    revealedHintLevels: {},
    lastAttemptedAt: null,
    completedAt: null,
  };

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(
    exercise.tasks[0]?.id || null
  );
  const [showCommonMistakes, setShowCommonMistakes] = useState<boolean>(false);
  const [validationRunCount, setValidationRunCount] = useState<number>(0);
  const [lastValidationFeedback, setLastValidationFeedback] = useState<string | null>(null);

  const [panelSubTab, setPanelSubTab] = useState<"objectives" | "tradeoff_lab">("objectives");

  const isTradeoffSupported =
    exercise.slug === "distributed-cache-redis" ||
    exercise.id === "exercise-distributed-caching";

  // Reset transient validation feedback and expand initial task when switching exercises
  React.useEffect(() => {
    setExpandedTaskId(exercise.tasks[0]?.id || null);
    setLastValidationFeedback(null);
    setShowCommonMistakes(false);
    setPanelSubTab("objectives");
  }, [exercise.id, exercise.tasks]);

  // Run dynamic evaluation against current graph
  const liveValidation = useMemo(() => {
    return validateExercise(exercise, graphState);
  }, [exercise, graphState]);

  // Handle explicit validation check button click
  const handleRunValidation = () => {
    startExercise(exercise.id);
    const result = validateExercise(exercise, graphState);
    const passedTaskIds = result.taskResults
      .filter((t) => t.isCompleted)
      .map((t) => t.taskId);

    recordValidation(exercise.id, passedTaskIds, result.isCompleted);
    setValidationRunCount((prev) => prev + 1);
    setLastValidationFeedback(result.overallFeedback);

    if (result.isCompleted && onExerciseCompleted) {
      onExerciseCompleted(exercise.id);
    }
  };

  const handleRevealHint = (taskId: string) => {
    startExercise(exercise.id);
    revealNextHint(exercise.id, taskId);
  };

  const completedCount = liveValidation.completedTaskCount;
  const totalCount = liveValidation.totalTaskCount;
  const progressPercent = Math.round((completedCount / totalCount) * 100);
  const isAllComplete = liveValidation.isCompleted;

  return (
    <div className="flex-1 flex flex-col overflow-y-auto font-sans">
      {/* Panel Top Header */}
      <div className="p-4 border-b border-surface-border bg-zinc-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
            <BookOpen className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-950/60 text-blue-400 border border-blue-800/80 font-medium">
                Guided Lab
              </span>
              <span
                className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded font-medium ${
                  isAllComplete
                    ? "bg-emerald-950/60 text-emerald-400 border border-emerald-800"
                    : completedCount > 0
                    ? "bg-amber-950/60 text-amber-400 border border-amber-800"
                    : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                }`}
              >
                {isAllComplete ? "Complete" : completedCount > 0 ? "In Progress" : "Not Started"}
              </span>
            </div>
            <h3 className="text-xs font-semibold text-zinc-100 truncate mt-1">
              {exercise.title}
            </h3>
          </div>
        </div>

        <button
          onClick={() => setActiveTab("architecture")}
          className="md:hidden p-1.5 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition shrink-0"
          title="Return to canvas"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Subtab navigation if topic supports Tradeoff Lab */}
      {isTradeoffSupported && (
        <div className="flex items-center border-b border-zinc-800 bg-zinc-950/40 px-3 pt-2 shrink-0">
          <button
            onClick={() => setPanelSubTab("objectives")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
              panelSubTab === "objectives"
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Target className="w-3.5 h-3.5" />
            <span>Canvas Objectives</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 ml-1">
              {completedCount}/{totalCount}
            </span>
          </button>

          <button
            onClick={() => setPanelSubTab("tradeoff_lab")}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition ${
              panelSubTab === "tradeoff_lab"
                ? "border-purple-500 text-purple-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Trade-off Lab</span>
            <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/60 ml-0.5">
              Predict &amp; Run
            </span>
          </button>
        </div>
      )}

      {panelSubTab === "tradeoff_lab" ? (
        <SimulatorTradeoffLab
          graphState={graphState}
          onNavigateToCanvas={() => setActiveTab("architecture")}
        />
      ) : (
        <div className="p-4 space-y-4">
          {/* Objective & Problem Hero Card */}
        <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-900/60 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-semibold text-zinc-200">
            <span className="flex items-center gap-1.5">
              <Target className="w-3.5 h-3.5 text-blue-400" />
              <span>Objective</span>
            </span>
            <span className="text-[10px] font-mono text-zinc-500">
              {completedCount}/{totalCount} Completed
            </span>
          </div>

          <p className="text-xs text-zinc-300 leading-relaxed">
            {exercise.problemStatement}
          </p>

          {/* Progress Bar */}
          <div className="space-y-1 pt-1">
            <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  isAllComplete ? "bg-emerald-500" : "bg-blue-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>

        {/* Validation / Success Banner */}
        {isAllComplete ? (
          <div className="p-3.5 rounded-lg border border-emerald-800 bg-emerald-950/40 text-emerald-300 text-xs space-y-2 animate-in fade-in">
            <div className="flex items-center gap-2 font-semibold">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>All Exercise Objectives Achieved!</span>
            </div>
            <p className="text-[11px] text-emerald-200/90 leading-relaxed font-sans">
              {exercise.completionMessage}
            </p>
            <div className="pt-2 flex items-center justify-between">
              <Link
                href={`/learn/${encodeURIComponent(exercise.slug)}`}
                className="inline-flex items-center gap-1.5 text-xs text-emerald-300 hover:text-emerald-100 font-mono underline"
              >
                <span>Return to Lesson Curriculum</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ) : lastValidationFeedback ? (
          <div className="p-3 rounded-lg border border-amber-800/80 bg-amber-950/30 text-xs text-amber-200 space-y-1.5 animate-in fade-in">
            <div className="flex items-center gap-1.5 font-semibold text-[11px] text-amber-300">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Validation Feedback</span>
            </div>
            <p className="text-[11px] text-zinc-300 font-mono leading-relaxed">
              {lastValidationFeedback}
            </p>
          </div>
        ) : null}

        {/* Guided Tasks Checklist */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium">
            <span>Guided Steps</span>
            <span className="text-[11px] font-mono text-zinc-500">
              Step-by-Step
            </span>
          </div>

          <div className="space-y-2">
            {(() => {
              const firstIncompleteIndex = exercise.tasks.findIndex(
                (t) => !liveValidation.taskResults.find((r) => r.taskId === t.id)?.isCompleted
              );

              return exercise.tasks.map((task, index) => {
                const taskResult = liveValidation.taskResults.find(
                  (r) => r.taskId === task.id
                );
                const isTaskDone = taskResult?.isCompleted ?? false;
                const isExpanded = expandedTaskId === task.id;
                const hintLevel = (progress.revealedHintLevels[task.id] || 0) as HintLevel;

                return (
                  <div
                    key={task.id}
                    className={`rounded-lg border transition ${
                      isTaskDone
                        ? "border-emerald-800/60 bg-emerald-950/20"
                        : isExpanded
                        ? "border-blue-700/70 bg-zinc-900/90"
                        : "border-zinc-800 bg-zinc-900/40 hover:border-zinc-700"
                    }`}
                  >
                    {/* Task Card Header (Accessible button) */}
                    <div
                      role="button"
                      tabIndex={0}
                      aria-expanded={isExpanded}
                      aria-label={`Step ${index + 1}: ${task.title}. ${isTaskDone ? "Passed" : "Incomplete"}`}
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedTaskId(isExpanded ? null : task.id);
                        }
                      }}
                      className="p-3 flex items-start justify-between gap-2.5 cursor-pointer select-none focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500 rounded-t-lg"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <div className="pt-0.5 shrink-0">
                          {isTaskDone ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Circle className="w-4 h-4 text-zinc-500" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-zinc-500">
                              Step {index + 1}
                            </span>
                            {isTaskDone ? (
                              <span className="text-[9px] font-mono text-emerald-400 uppercase font-semibold">
                                Passed
                              </span>
                            ) : index === firstIncompleteIndex ? (
                              <span className="text-[9px] font-mono text-blue-400 bg-blue-950/70 border border-blue-800/80 px-1 py-0.2 rounded uppercase font-semibold">
                                Current Action
                              </span>
                            ) : null}
                          </div>
                          <h4
                            className={`text-xs font-medium truncate ${
                              isTaskDone ? "text-emerald-200 line-through opacity-85" : "text-zinc-200"
                            }`}
                          >
                            {task.title}
                          </h4>
                        </div>
                      </div>

                      <div className="text-zinc-400 shrink-0">
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>

                  {/* Task Detailed Drawer */}
                  {isExpanded && (
                    <div className="px-3 pb-3.5 pt-1 space-y-3 border-t border-zinc-800/60 text-xs">
                      <p className="text-zinc-300 text-[11px] leading-relaxed">
                        {task.instructions}
                      </p>

                      {/* Missing Requirement Alert (if not done) */}
                      {!isTaskDone && taskResult && taskResult.missingRequirements.length > 0 && (
                        <div className="p-2 rounded bg-rose-950/30 border border-rose-900/40 text-[11px] text-rose-300 font-mono">
                          {taskResult.missingRequirements[0]}
                        </div>
                      )}

                      {/* Progressive Hints Section */}
                      <div className="pt-1 space-y-1.5 border-t border-zinc-800/40">
                        <div className="flex items-center justify-between text-[11px] text-zinc-400">
                          <span className="flex items-center gap-1">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                            <span>Progressive Hints</span>
                          </span>
                          <span className="text-[10px] font-mono text-zinc-500">
                            {hintLevel > 0 ? `Level ${hintLevel}/3` : "Locked"}
                          </span>
                        </div>

                        {/* Hint Level 1 */}
                        {hintLevel >= 1 && (
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-amber-200/90 leading-relaxed">
                            <span className="font-semibold text-amber-400 font-mono mr-1">
                              Hint 1 (Concept):
                            </span>
                            {task.hints[0]}
                          </div>
                        )}

                        {/* Hint Level 2 */}
                        {hintLevel >= 2 && (
                          <div className="p-2 rounded bg-zinc-950 border border-zinc-800 text-[11px] text-sky-200/90 leading-relaxed">
                            <span className="font-semibold text-sky-400 font-mono mr-1">
                              Hint 2 (Architecture):
                            </span>
                            {task.hints[1]}
                          </div>
                        )}

                        {/* Hint Level 3 */}
                        {hintLevel >= 3 && (
                          <div className="p-2 rounded bg-zinc-950 border border-blue-900/60 text-[11px] text-blue-200/90 leading-relaxed">
                            <span className="font-semibold text-blue-400 font-mono mr-1">
                              Hint 3 (Direct Step):
                            </span>
                            {task.hints[2]}
                          </div>
                        )}

                        {/* Request Next Hint Action */}
                        {hintLevel < 3 && (
                          <button
                            onClick={() => handleRevealHint(task.id)}
                            className="w-full py-1.5 px-2.5 rounded border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-zinc-100 text-[11px] font-medium transition flex items-center justify-center gap-1.5"
                          >
                            <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
                            <span>
                              {hintLevel === 0
                                ? "Reveal Conceptual Nudge"
                                : hintLevel === 1
                                ? "Reveal Architectural Hint"
                                : "Reveal Step-by-Step Direction"}
                            </span>
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            });
          })()}
        </div>
        </div>

        {/* Primary Action Button: Validate Architecture */}
        <div className="pt-2 space-y-2">
          <button
            onClick={handleRunValidation}
            className={`w-full min-h-[42px] py-2.5 px-4 rounded-md font-medium text-xs transition flex items-center justify-center gap-2 shadow-sm ${
              isAllComplete
                ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            }`}
          >
            {isAllComplete ? (
              <>
                <Check className="w-4 h-4" />
                <span>Validate &amp; Confirm Mastery</span>
              </>
            ) : (
              <>
                <Target className="w-4 h-4" />
                <span>Check Exercise Objectives</span>
              </>
            )}
          </button>

          {/* Reset / Retry Controls */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[11px]">
            <button
              onClick={onResetToExerciseStarter}
              className="text-zinc-400 hover:text-zinc-200 transition flex items-center gap-1 font-mono"
              title="Reset canvas back to initial exercise problem state"
            >
              <RotateCcw className="w-3 h-3 text-zinc-500" />
              <span>Reset Canvas to Starter</span>
            </button>

            <Link
              href={`/learn/${encodeURIComponent(exercise.slug)}`}
              className="text-zinc-400 hover:text-blue-400 transition flex items-center gap-1 font-mono"
            >
              <span>Lesson Curriculum</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </div>

        {/* Common Architectural Mistakes Section */}
        {exercise.commonMistakes.length > 0 && (
          <div className="pt-2 border-t border-zinc-800">
            <button
              onClick={() => setShowCommonMistakes(!showCommonMistakes)}
              className="w-full flex items-center justify-between py-1 text-xs text-zinc-400 hover:text-zinc-200 transition font-medium"
            >
              <span className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-zinc-500" />
                <span>Common Architectural Pitfalls</span>
              </span>
              {showCommonMistakes ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            {showCommonMistakes && (
              <div className="mt-2 space-y-2 animate-in fade-in">
                {exercise.commonMistakes.map((pitfall, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950 text-[11px] space-y-1 font-sans"
                  >
                    <div className="font-semibold text-rose-400 flex items-center gap-1">
                      <span>✕</span>
                      <span>{pitfall.mistake}</span>
                    </div>
                    <div className="text-zinc-300 leading-relaxed font-light">
                      {pitfall.remedy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </div>
  );
}
