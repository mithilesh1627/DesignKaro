"use client";

import React, { useState, useCallback, useMemo, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  ReactFlow,
  Controls,
  Background,
  applyNodeChanges,
  applyEdgeChanges,
  Node,
  Edge,
  Connection,
  BackgroundVariant,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  Layers,
  Activity,
  ShieldCheck,
  RotateCcw,
  RotateCw,
  Clock,
  Maximize2,
  Trash2,
  Copy,
  Workflow,
  CheckCircle2,
  Plus,
  Brain,
  MessageSquare,
  History,
  User,
  LogIn,
  RefreshCw,
} from "lucide-react";
import {
  ArchitectureEdge,
  ArchitectureEvent,
  ArchitectureEventType,
  ArchitectureGraph,
  ArchitectureNode,
  ArchitectureNodeConfig,
  ConnectionType,
  RuleViolation,
  RuleSeverity,
  ValidationResponse,
  AIArchitectSuggestion,
  AIArchitectCritiqueResponse,
  SimulationTrafficProfile,
  SimulationResult,
  SimulationTick,
  SimulationNodeMetric,
  ChaosFailureType,
  InterviewMessage,
  InterviewRubricScores,
  ArchitectureEvaluationReport,
  ArchitectureVersionDiff,
} from "@/types/simulator";
import {
  createArchitectureEvent,
  getEdgeVisualProps,
  evaluateArchitectureRules,
  fetchAIArchitectCritique,
} from "@/lib/architectureGraph";
import {
  DEFAULT_TRAFFIC_PROFILE,
  TrafficPreset,
  runClientSimulation,
  runBackendSimulation,
} from "@/lib/simulationEngine";
import {
  INTERVIEW_STAGES,
  getInitialInterviewState,
  evaluateInterviewTurn,
} from "@/lib/interviewEngine";
import {
  evaluateArchitectureComprehensive,
  computeGraphDiff,
} from "@/lib/evaluationEngine";
import { useAuthStore } from "@/lib/authStore";
import { AuthModal } from "@/components/AuthModal";
import { API_BASE } from "@/lib/api";

// Extracted Modular Simulator Components
import {
  COMPONENT_CATALOG,
  INITIAL_YOUTUBE_GRAPH,
  STARTER_TEMPLATES,
  SimulatorTab,
} from "@/components/simulator/simulatorConstants";
import {
  CustomFlowData,
  SIMULATOR_NODE_TYPES,
} from "@/components/simulator/SimulatorCustomNode";
import { SimulatorComponentLibrary } from "@/components/simulator/SimulatorComponentLibrary";
import { SimulatorCockpitPanel } from "@/components/simulator/SimulatorCockpitPanel";
import { SimulatorRequirementsPanel } from "@/components/simulator/SimulatorRequirementsPanel";
import { SimulatorEvaluationPanel } from "@/components/simulator/SimulatorEvaluationPanel";
import { SimulatorConfigPanel } from "@/components/simulator/SimulatorConfigPanel";
import { SimulatorEventStreamDrawer } from "@/components/simulator/SimulatorEventStreamDrawer";
import { SimulatorRuleEngineDrawer } from "@/components/simulator/SimulatorRuleEngineDrawer";
import { SimulatorAdvisorDrawer } from "@/components/simulator/SimulatorAdvisorDrawer";
import { SimulatorInterviewModal } from "@/components/simulator/SimulatorInterviewModal";
import { SimulatorClearCanvasModal } from "@/components/simulator/SimulatorClearCanvasModal";

// ============================================================================
// MAIN SIMULATOR WORKSPACE COMPONENT
// ============================================================================

function SimulatorContent() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const problemSlug = searchParams?.get("problem");
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);
  const reactFlowInstance = useReactFlow();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // --------------------------------------------------------------------------
  // ARCHITECTURE GRAPH STATE (SINGLE SOURCE OF TRUTH)
  // --------------------------------------------------------------------------
  const [graphState, setGraphState] = useState<ArchitectureGraph>(INITIAL_YOUTUBE_GRAPH);

  // Handle URL Problem Param (e.g., /simulator?problem=rate-limiter)
  useEffect(() => {
    if (!problemSlug) return;
    const fetchProblem = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/v1/problems/${encodeURIComponent(problemSlug)}`);
        if (res.ok) {
          const data = await res.json();
          setGraphState((prev) => ({
            ...prev,
            metadata: {
              ...prev.metadata,
              problemId: data.slug,
              title: data.title,
              targetRps: data.expected_scale?.qps ? `${data.expected_scale.qps} RPS` : prev.metadata.targetRps,
            },
          }));
        }
      } catch {
        // Fallback gracefully
      }
    };
    fetchProblem();
  }, [problemSlug]);

  // History for Undo / Redo
  const [history, setHistory] = useState<ArchitectureGraph[]>([INITIAL_YOUTUBE_GRAPH]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Event Log
  const [events, setEvents] = useState<ArchitectureEvent[]>([
    createArchitectureEvent("LOAD_TEMPLATE", 1, "Loaded YouTube Initial Architecture Blueprint"),
  ]);

  // UI Selection State
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);

  // UI Panel Modes
  const [activeTab, setActiveTab] = useState<SimulatorTab>("architecture");
  const [showEventLog, setShowEventLog] = useState<boolean>(false);
  const [showValidationDrawer, setShowValidationDrawer] = useState<boolean>(false);

  // AI Architect State (Phase 4)
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiCritique, setAiCritique] = useState<AIArchitectCritiqueResponse | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  // Canvas Reset Confirmation State
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [isMobileComponentLibraryOpen, setIsMobileComponentLibraryOpen] = useState<boolean>(false);
  const handleFetchCritiqueRef = useRef<((overrideGraph?: unknown) => Promise<void>) | null>(null);

  // --------------------------------------------------------------------------
  // PHASE 5 & 6: SIMULATION, TRAFFIC & CHAOS ENGINE STATE
  // --------------------------------------------------------------------------
  const [trafficProfile, setTrafficProfile] = useState<SimulationTrafficProfile>(DEFAULT_TRAFFIC_PROFILE);
  const [activePresetId, setActivePresetId] = useState<string>("surge");
  const [isSimulationRunning, setIsSimulationRunning] = useState<boolean>(false);
  const [simTickIndex, setSimTickIndex] = useState<number>(0);
  const [isBackendSimulating, setIsBackendSimulating] = useState<boolean>(false);
  const [backendSimResult, setBackendSimResult] = useState<SimulationResult | null>(null);

  // Phase 6 Chaos Engineering State
  const [activeChaosFailure, setActiveChaosFailure] = useState<ChaosFailureType>("NONE");
  const [chaosTargetNodeId, setChaosTargetNodeId] = useState<string | null>(null);
  const [simulationSubTab, setSimulationSubTab] = useState<"traffic" | "chaos">("traffic");

  // Instant deterministic client-side simulation with 0ms Chaos injection
  const activeSimulationResult: SimulationResult = useMemo(() => {
    if (backendSimResult) return backendSimResult;
    return runClientSimulation(
      graphState,
      trafficProfile,
      activeChaosFailure,
      chaosTargetNodeId || undefined
    );
  }, [backendSimResult, graphState, trafficProfile, activeChaosFailure, chaosTargetNodeId]);

  // --------------------------------------------------------------------------
  // PHASE 7: INTERVIEW MODE (SOCRATIC INTERVIEWER) STATE
  // --------------------------------------------------------------------------
  const [showInterviewModal, setShowInterviewModal] = useState<boolean>(false);
  const [interviewStage, setInterviewStage] = useState<number>(1);
  const [interviewMessages, setInterviewMessages] = useState<InterviewMessage[]>(() => getInitialInterviewState().messages);
  const [interviewScores, setInterviewScores] = useState<InterviewRubricScores>(() => getInitialInterviewState().scores);
  const [interviewInput, setInterviewInput] = useState<string>("");
  const [isInterviewCritiqueLoading, setIsInterviewCritiqueLoading] = useState<boolean>(false);

  // --------------------------------------------------------------------------
  // PHASE 8: EVALUATION & VERSION DIFF STATE
  // --------------------------------------------------------------------------
  const [evaluationSubTab, setEvaluationSubTab] = useState<"verdict" | "history">("verdict");
  const [diffBaseVersion, setDiffBaseVersion] = useState<number>(1);
  const [diffTargetVersion, setDiffTargetVersion] = useState<number>(1);

  // Keep diffTargetVersion synced with graphState version
  useEffect(() => {
    setDiffTargetVersion(graphState.metadata.version);
  }, [graphState.metadata.version]);

  const comprehensiveEvaluation: ArchitectureEvaluationReport = useMemo(() => {
    return evaluateArchitectureComprehensive(graphState);
  }, [graphState]);

  const versionDiffResult: ArchitectureVersionDiff | null = useMemo(() => {
    const baseGraph = history.find((h) => h.metadata.version === diffBaseVersion) || history[0];
    const targetGraph = history.find((h) => h.metadata.version === diffTargetVersion) || graphState;
    if (!baseGraph || !targetGraph) return null;
    return computeGraphDiff(baseGraph, targetGraph);
  }, [history, diffBaseVersion, diffTargetVersion, graphState]);

  // Discrete time playback ticker
  useEffect(() => {
    if (!isSimulationRunning) return;
    const ticks = activeSimulationResult.ticks;
    if (!ticks || ticks.length === 0) return;

    const timer = setInterval(() => {
      setSimTickIndex((prev) => (prev + 1) % ticks.length);
    }, 800);
    return () => clearInterval(timer);
  }, [isSimulationRunning, activeSimulationResult.ticks]);

  // Current active discrete tick
  const currentTick: SimulationTick | null = useMemo(() => {
    if (!activeSimulationResult.ticks || activeSimulationResult.ticks.length === 0) return null;
    const idx = Math.min(simTickIndex, activeSimulationResult.ticks.length - 1);
    return activeSimulationResult.ticks[idx] || null;
  }, [activeSimulationResult.ticks, simTickIndex]);

  // Map of node ID to live simulation metric (from current tick or peak)
  const nodeMetricsMap = useMemo(() => {
    const map = new Map<string, SimulationNodeMetric>();
    if (currentTick) {
      currentTick.node_metrics.forEach((m) => map.set(m.node_id, m));
    } else if (activeSimulationResult.ticks.length > 0) {
      const peakTick = activeSimulationResult.ticks.reduce(
        (max, t) => (t.qps > max.qps ? t : max),
        activeSimulationResult.ticks[0]
      );
      peakTick.node_metrics.forEach((m) => map.set(m.node_id, m));
    }
    return map;
  }, [currentTick, activeSimulationResult]);

  // Active Drag & Drop Tracking State (Ensures 100% Reliable Placement Across All Browsers)
  const [draggedType, setDraggedType] = useState<string | null>(null);
  const draggedTypeRef = useRef<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDragOverCanvas, setIsDragOverCanvas] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((prev) => (prev === msg ? null : prev));
    }, 2800);
  }, []);

  // Component Search & Filter
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchFilter, setSearchFilter] = useState<string>("");

  // Countdown timer: 18:42
  const [secondsRemaining, setSecondsRemaining] = useState<number>(18 * 60 + 42);

  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsRemaining((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedTime = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, [secondsRemaining]);

  // Deterministic Graph Rule Engine Evaluation (Instant 0ms Latency)
  const validationResponse: ValidationResponse = useMemo(() => {
    return evaluateArchitectureRules(graphState);
  }, [graphState]);

  // Node violation map for fast canvas node styling
  const nodeViolationMap = useMemo(() => {
    const map = new Map<string, { severity: RuleSeverity; violations: RuleViolation[] }>();
    validationResponse.violations.forEach((v) => {
      v.node_ids.forEach((nodeId) => {
        const existing = map.get(nodeId);
        if (!existing) {
          map.set(nodeId, { severity: v.severity, violations: [v] });
        } else {
          existing.violations.push(v);
          if (v.severity === "critical") {
            existing.severity = "critical";
          } else if (v.severity === "warning" && existing.severity !== "critical") {
            existing.severity = "warning";
          }
        }
      });
    });
    return map;
  }, [validationResponse]);

  // Convert Architecture Graph to ReactFlow Nodes & Edges
  const flowNodes: Node<CustomFlowData>[] = useMemo(() => {
    return graphState.nodes.map((n) => {
      const vInfo = nodeViolationMap.get(n.id);
      const metric = nodeMetricsMap.get(n.id);
      const isBottleneck = activeSimulationResult.bottleneck_node_id === n.id;
      return {
        id: n.id,
        type: "simulatorCustomNode",
        position: n.position,
        initialWidth: 210,
        initialHeight: 80,
        data: {
          archNode: n,
          isSelected: n.id === selectedNodeId,
          violationSeverity: vInfo?.severity || null,
          violations: vInfo?.violations || [],
          isSimulationMode: activeTab === "simulation",
          isBottleneck: isBottleneck,
          utilizationPercent: metric?.utilization_percent ?? (isBottleneck ? activeSimulationResult.bottleneck_utilization : 0),
          throughputQps: metric?.throughput_qps ?? Math.round(activeSimulationResult.throughput_qps / Math.max(1, graphState.nodes.length)),
          nodeLatencyMs: metric?.latency_p99_ms ?? Math.round(activeSimulationResult.p95_latency_ms),
          nodeStatus: metric?.status ?? "HEALTHY",
        },
      };
    });
  }, [
    graphState.nodes,
    selectedNodeId,
    nodeViolationMap,
    nodeMetricsMap,
    activeSimulationResult,
    activeTab,
  ]);

  const flowEdges: Edge[] = useMemo(() => {
    return graphState.edges.map((e) => {
      const visualProps = getEdgeVisualProps(e.connectionType);
      const isSelected = e.id === selectedEdgeId;
      const isSim = activeTab === "simulation";
      const sourceMetric = nodeMetricsMap.get(e.source);
      const targetMetric = nodeMetricsMap.get(e.target);
      const hasCrashedNode = sourceMetric?.status === "CRASHED" || targetMetric?.status === "CRASHED";
      const hasDegradedNode = sourceMetric?.status === "DEGRADED" || targetMetric?.status === "DEGRADED";

      let strokeColor = isSelected ? "#38bdf8" : isSim ? "#06b6d4" : visualProps.stroke;
      let strokeDash = isSim ? "6, 6" : visualProps.strokeDasharray;
      let strokeW = isSelected ? 3 : isSim ? 2.5 : visualProps.strokeWidth;

      if (isSim && hasCrashedNode) {
        strokeColor = "#ef4444";
        strokeDash = "4, 4";
        strokeW = 3;
      } else if (isSim && hasDegradedNode) {
        strokeColor = "#f59e0b";
        strokeDash = "5, 5";
      }

      return {
        id: e.id,
        source: e.source,
        target: e.target,
        animated: isSim ? true : visualProps.animated,
        label: isSim && currentTick ? `${Math.round(currentTick.qps).toLocaleString()} RPS` : visualProps.label,
        labelStyle: visualProps.labelStyle,
        labelBgStyle: visualProps.labelBgStyle,
        markerEnd: { type: MarkerType.ArrowClosed, color: strokeColor },
        style: {
          stroke: strokeColor,
          strokeWidth: strokeW,
          strokeDasharray: strokeDash,
        },
      };
    });
  }, [graphState.edges, selectedEdgeId, activeTab, currentTick, nodeMetricsMap]);

  const nodeTypes = SIMULATOR_NODE_TYPES;

  // Filtered component catalog
  const filteredComponents = useMemo(() => {
    return COMPONENT_CATALOG.filter((comp) => {
      const matchCategory =
        selectedCategory === "all" || comp.category === selectedCategory;
      const matchSearch =
        comp.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
        comp.description.toLowerCase().includes(searchFilter.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [selectedCategory, searchFilter]);

  // --------------------------------------------------------------------------
  // STATE MUTATION WITH EVENT EMISSION & UNDO/REDO SNAPSHOTTING
  // --------------------------------------------------------------------------

  const commitGraphChange = useCallback(
    (
      newGraphProducer: (prev: ArchitectureGraph) => ArchitectureGraph,
      eventType: ArchitectureEventType,
      description: string,
      extra: { componentType?: string; nodeId?: string; edgeId?: string; payload?: Record<string, any> } = {}
    ) => {
      setGraphState((currentGraph) => {
        const nextGraph = newGraphProducer(currentGraph);
        const newVersion = currentGraph.metadata.version + 1;
        nextGraph.metadata = {
          ...nextGraph.metadata,
          version: newVersion,
          updatedAt: new Date().toISOString(),
          change_summary: description,
          last_event_type: eventType,
        };

        // Record Architecture Event
        const newEvent = createArchitectureEvent(eventType, newVersion, description, extra);
        setEvents((prev) => [newEvent, ...prev.slice(0, 49)]);

        // Push to History (truncate future redo steps if branching)
        setHistory((prevHistory) => {
          const newHistory = prevHistory.slice(0, historyIndex + 1);
          return [...newHistory, nextGraph];
        });
        setHistoryIndex((prevIndex) => prevIndex + 1);

        return nextGraph;
      });
    },
    [historyIndex]
  );

  // Undo / Redo Actions
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const targetIndex = historyIndex - 1;
      const targetGraph = history[targetIndex];
      setHistoryIndex(targetIndex);
      setGraphState(targetGraph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      const undoEvent = createArchitectureEvent(
        "UNDO",
        targetGraph.metadata.version,
        `Reverted architecture to version ${targetGraph.metadata.version}`
      );
      setEvents((prev) => [undoEvent, ...prev.slice(0, 49)]);
    }
  }, [history, historyIndex]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const targetIndex = historyIndex + 1;
      const targetGraph = history[targetIndex];
      setHistoryIndex(targetIndex);
      setGraphState(targetGraph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);

      const redoEvent = createArchitectureEvent(
        "REDO",
        targetGraph.metadata.version,
        `Restored architecture to version ${targetGraph.metadata.version}`
      );
      setEvents((prev) => [redoEvent, ...prev.slice(0, 49)]);
    }
  }, [history, historyIndex]);

  // --------------------------------------------------------------------------
  // NODE & EDGE MUTATIONS
  // --------------------------------------------------------------------------

  // Add Component
  const handleAddComponent = useCallback(
    (compType: string, position?: { x: number; y: number }) => {
      const comp = COMPONENT_CATALOG.find((c) => c.type === compType);
      if (!comp) return;

      const isManualDrop = position && !isNaN(position.x) && !isNaN(position.y);
      let pos = position;
      if (!pos || isNaN(pos.x) || isNaN(pos.y)) {
        if (reactFlowInstance && reactFlowWrapper.current) {
          try {
            const rect = reactFlowWrapper.current.getBoundingClientRect();
            pos = reactFlowInstance.screenToFlowPosition({
              x: rect.left + rect.width / 2 + (Math.random() * 80 - 40),
              y: rect.top + rect.height / 2 + (Math.random() * 80 - 40),
            });
          } catch {
            pos = { x: 350 + Math.random() * 60, y: 180 + Math.random() * 60 };
          }
        } else {
          pos = {
            x: 350 + Math.random() * 80,
            y: 180 + Math.random() * 80,
          };
        }
      }

      const newId = `${compType}-${Date.now().toString().slice(-4)}`;
      const newNode: ArchitectureNode = {
        id: newId,
        type: comp.type,
        name: comp.name,
        category: comp.category,
        position: pos,
        config: { ...comp.defaultConfig },
      };

      commitGraphChange(
        (prev) => ({
          ...prev,
          nodes: [...prev.nodes, newNode],
        }),
        "ADD_COMPONENT",
        `Added '${comp.name}' component to ${comp.category} tier`,
        { componentType: comp.type, nodeId: newId }
      );
      setSelectedNodeId(newId);
      showToast(`Added ${comp.name} to architecture canvas`);

      // Only pan to the newly placed component if it was added via click (not dropped under cursor)
      if (!isManualDrop && reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.setCenter(pos!.x + 90, pos!.y + 35, {
            duration: 350,
          });
        }, 50);
      }
    },
    [commitGraphChange, reactFlowInstance, showToast]
  );

  const handleLoadStarterTemplate = useCallback(
    (key: "three_tier" | "cache_aside" | "event_driven") => {
      const template = STARTER_TEMPLATES[key];
      if (!template) return;
      const loaded: ArchitectureGraph = {
        ...template,
        metadata: {
          ...template.metadata,
          version: (graphState.metadata.version || 1) + 1,
          updatedAt: new Date().toISOString(),
        },
      };
      commitGraphChange(
        () => loaded,
        "LOAD_TEMPLATE",
        `Loaded starter pattern: ${template.metadata.title}`
      );
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      showToast(`Loaded ${template.metadata.title}`);
      if (reactFlowInstance) {
        setTimeout(() => {
          reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
        }, 80);
      }
    },
    [commitGraphChange, graphState.metadata.version, reactFlowInstance, showToast]
  );

  const handleUpdateNodeConfig = useCallback(
    (nodeId: string, partial: Partial<ArchitectureNodeConfig>) => {
      commitGraphChange(
        (prev) => ({
          ...prev,
          nodes: prev.nodes.map((n) =>
            n.id === nodeId
              ? { ...n, config: { ...n.config, ...partial } }
              : n
          ),
        }),
        "UPDATE_CONFIGURATION",
        `Updated configuration for node '${nodeId}'`,
        { nodeId, payload: partial }
      );
    },
    [commitGraphChange]
  );

  // Delete Component
  const handleDeleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    const targetNode = graphState.nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode) return;

    commitGraphChange(
      (prev) => ({
        ...prev,
        nodes: prev.nodes.filter((n) => n.id !== selectedNodeId),
        edges: prev.edges.filter(
          (e) => e.source !== selectedNodeId && e.target !== selectedNodeId
        ),
      }),
      "REMOVE_COMPONENT",
      `Removed component '${targetNode.name}' and attached connections`,
      { nodeId: selectedNodeId, componentType: targetNode.type }
    );
    setSelectedNodeId(null);
  }, [selectedNodeId, graphState.nodes, commitGraphChange]);

  // Duplicate Component
  const handleDuplicateNode = useCallback(() => {
    if (!selectedNodeId) return;
    const targetNode = graphState.nodes.find((n) => n.id === selectedNodeId);
    if (!targetNode) return;

    const newId = `${targetNode.type}-${Date.now().toString().slice(-4)}`;
    const duplicatedNode: ArchitectureNode = {
      ...targetNode,
      id: newId,
      name: `${targetNode.name} (Copy)`,
      position: {
        x: targetNode.position.x + 40,
        y: targetNode.position.y + 40,
      },
      config: { ...targetNode.config },
    };

    commitGraphChange(
      (prev) => ({
        ...prev,
        nodes: [...prev.nodes, duplicatedNode],
      }),
      "ADD_COMPONENT",
      `Duplicated component '${targetNode.name}'`,
      { nodeId: newId, componentType: targetNode.type }
    );
    setSelectedNodeId(newId);
  }, [selectedNodeId, graphState.nodes, commitGraphChange]);

  // Delete Edge
  const handleDeleteSelectedEdge = useCallback(() => {
    if (!selectedEdgeId) return;
    commitGraphChange(
      (prev) => ({
        ...prev,
        edges: prev.edges.filter((e) => e.id !== selectedEdgeId),
      }),
      "DISCONNECT_COMPONENTS",
      `Removed connection edge`,
      { edgeId: selectedEdgeId }
    );
    setSelectedEdgeId(null);
  }, [selectedEdgeId, commitGraphChange]);

  // Keyboard Shortcuts: Ctrl+Z / Ctrl+Y / Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        handleRedo();
      } else if (e.key === "Delete" || e.key === "Backspace") {
        const activeElem = document.activeElement?.tagName.toLowerCase();
        if (activeElem !== "input" && activeElem !== "textarea") {
          if (selectedNodeId) {
            e.preventDefault();
            handleDeleteSelectedNode();
          } else if (selectedEdgeId) {
            e.preventDefault();
            handleDeleteSelectedEdge();
          }
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleUndo, handleRedo, selectedNodeId, selectedEdgeId, handleDeleteSelectedNode, handleDeleteSelectedEdge]);

  // Center / Pan Canvas to an affected Node
  const handleFocusNode = useCallback(
    (nodeId: string) => {
      const target = graphState.nodes.find((n) => n.id === nodeId);
      if (target && reactFlowInstance) {
        setSelectedNodeId(nodeId);
        reactFlowInstance.setCenter(target.position.x + 90, target.position.y + 40, {
          zoom: 1.1,
          duration: 500,
        });
      }
    },
    [graphState.nodes, reactFlowInstance]
  );

  // Quick Fix rule violations
  const handleApplyQuickFix = useCallback(
    (violation: RuleViolation) => {
      if (violation.rule_id === "RULE-001") {
        if (violation.node_ids.length > 0) {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                violation.node_ids.includes(n.id)
                  ? { ...n, config: { ...n.config, replicas: Math.max(2, (n.config.replicas || 1) + 1) } }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `Auto-remediated ${violation.rule_name}: Scaled database replicas to 2 for High Availability`,
            { nodeId: violation.node_ids[0], payload: { nodeIds: violation.node_ids } }
          );
        }
      } else if (violation.rule_id === "RULE-017") {
        if (violation.node_ids.length > 0) {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                violation.node_ids.includes(n.id)
                  ? { ...n, config: { ...n.config, replicas: Math.max(2, (n.config.replicas || 1) + 1) } }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `Auto-remediated ${violation.rule_name}: Scaled compute service replicas to 2`,
            { nodeId: violation.node_ids[0], payload: { nodeIds: violation.node_ids } }
          );
        }
      } else if (violation.rule_id === "RULE-002") {
        handleAddComponent("api_gateway", { x: 260, y: 180 });
      } else if (violation.rule_id === "RULE-003") {
        handleAddComponent("redis", { x: 560, y: 110 });
      } else if (violation.rule_id === "RULE-006") {
        handleAddComponent("cdn", { x: 200, y: 120 });
      } else if (violation.rule_id === "RULE-012") {
        handleAddComponent("kafka", { x: 520, y: 260 });
      }

      setTimeout(() => {
        handleFetchCritiqueRef.current?.();
      }, 150);
    },
    [commitGraphChange, handleAddComponent]
  );

  // Connect Components
  const onConnect = useCallback(
    (params: Connection) => {
      if (!params.source || !params.target) return;
      const edgeId = `e-${params.source}-${params.target}-${Date.now().toString().slice(-3)}`;
      const newEdge: ArchitectureEdge = {
        id: edgeId,
        source: params.source,
        target: params.target,
        connectionType: "sync",
      };

      commitGraphChange(
        (prev) => ({
          ...prev,
          edges: [...prev.edges, newEdge],
        }),
        "CONNECT_COMPONENTS",
        `Connected '${params.source}' → '${params.target}' via Sync Request`,
        { edgeId, payload: { source: params.source, target: params.target } }
      );
      setSelectedEdgeId(edgeId);
    },
    [commitGraphChange]
  );

  // Change Edge Connection Type
  const handleUpdateConnectionType = useCallback(
    (newType: ConnectionType) => {
      if (!selectedEdgeId) return;
      commitGraphChange(
        (prev) => ({
          ...prev,
          edges: prev.edges.map((e) =>
            e.id === selectedEdgeId ? { ...e, connectionType: newType } : e
          ),
        }),
        "CHANGE_CONNECTION_TYPE",
        `Changed connection type to '${newType}'`,
        { edgeId: selectedEdgeId, payload: { connectionType: newType } }
      );
    },
    [selectedEdgeId, commitGraphChange]
  );

  // Drag & Drop Handlers with Contextual Fallbacks for 100% Reliability
  const onDragStart = (event: React.DragEvent, compType: string) => {
    draggedTypeRef.current = compType;
    setDraggedType(compType);
    if (typeof window !== "undefined") {
      (window as any).__draggedComponentType = compType;
    }
    try {
      event.dataTransfer.setData("application/reactflow", compType);
      event.dataTransfer.setData("text/plain", compType);
      event.dataTransfer.setData("text", compType);
      event.dataTransfer.setData("application/reactflow/type", compType);
    } catch {}
    event.dataTransfer.effectAllowed = "copyMove";
  };

  const onDragEnd = () => {
    setIsDragOverCanvas(false);
    setTimeout(() => {
      draggedTypeRef.current = null;
      setDraggedType(null);
      if (typeof window !== "undefined") {
        (window as any).__draggedComponentType = null;
      }
    }, 400);
  };

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = "copy";
    setIsDragOverCanvas(true);
  }, []);

  const onDragEnter = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOverCanvas(true);
  }, []);

  const onDragLeave = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const rect = reactFlowWrapper.current?.getBoundingClientRect();
    if (
      rect &&
      (event.clientX <= rect.left ||
        event.clientX >= rect.right ||
        event.clientY <= rect.top ||
        event.clientY >= rect.bottom)
    ) {
      setIsDragOverCanvas(false);
    }
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      setIsDragOverCanvas(false);

      let compType: string | null = null;
      try {
        compType =
          event.dataTransfer?.getData("application/reactflow") ||
          event.dataTransfer?.getData("text/plain") ||
          event.dataTransfer?.getData("text") ||
          event.dataTransfer?.getData("application/reactflow/type") ||
          null;
      } catch {}

      if (!compType || compType.trim() === "") {
        compType =
          draggedTypeRef.current ||
          draggedType ||
          (typeof window !== "undefined" ? (window as any).__draggedComponentType : null);
      }

      if (!compType) {
        console.warn("Could not determine dropped component type");
        return;
      }

      let position = { x: 400, y: 220 };
      if (reactFlowInstance?.screenToFlowPosition) {
        try {
          const flowPos = reactFlowInstance.screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          if (
            typeof flowPos.x === "number" &&
            !isNaN(flowPos.x) &&
            typeof flowPos.y === "number" &&
            !isNaN(flowPos.y)
          ) {
            position = flowPos;
          }
        } catch (err) {
          console.warn("screenToFlowPosition failed, fallback to offset:", err);
          if (reactFlowWrapper.current) {
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            position = {
              x: event.clientX - bounds.left,
              y: event.clientY - bounds.top,
            };
          }
        }
      } else if (reactFlowWrapper.current) {
        const bounds = reactFlowWrapper.current.getBoundingClientRect();
        position = {
          x: event.clientX - bounds.left,
          y: event.clientY - bounds.top,
        };
      }

      handleAddComponent(compType, position);

      setTimeout(() => {
        draggedTypeRef.current = null;
        setDraggedType(null);
        if (typeof window !== "undefined") {
          (window as any).__draggedComponentType = null;
        }
      }, 300);
    },
    [reactFlowInstance, handleAddComponent, draggedType]
  );

  // --------------------------------------------------------------------------
  // AI ARCHITECT LOGIC & GRAPH MUTATIONS (PHASE 4)
  // --------------------------------------------------------------------------
  const handleFetchCritique = useCallback(async (overrideGraph?: unknown) => {
    setIsAiLoading(true);
    setAiError(null);
    try {
      const targetGraph =
        overrideGraph && typeof overrideGraph === "object" && "nodes" in overrideGraph
          ? (overrideGraph as ArchitectureGraph)
          : graphState;
      const response = await fetchAIArchitectCritique(targetGraph, {
        target_rps: targetGraph.metadata.targetRps,
        problem_id: targetGraph.metadata.problemId,
      });
      setAiCritique(response);
    } catch (err: unknown) {
      console.error("AI Architect error:", err);
      const msg = err instanceof Error ? err.message : "Failed to analyze architecture.";
      setAiError(msg);
    } finally {
      setIsAiLoading(false);
    }
  }, [graphState]);

  useEffect(() => {
    handleFetchCritiqueRef.current = handleFetchCritique;
  }, [handleFetchCritique]);

  const handleApplySuggestion = useCallback(
    (suggestion: AIArchitectSuggestion) => {
      const action = suggestion.action || "";
      const parts = action.split(":");
      const actionType = parts[0];

      if (actionType === "add_component") {
        const rawType = parts[1] || "redis";
        let compType = rawType;
        if (rawType === "cache") compType = "redis";
        if (rawType === "queue") compType = "kafka";
        if (rawType === "database") compType = "postgresql";
        if (rawType === "service") compType = "server";

        const nodeCount = graphState.nodes.length;
        const targetPos = {
          x: 420 + ((nodeCount * 55) % 280),
          y: 130 + ((nodeCount * 40) % 220),
        };
        handleAddComponent(compType, targetPos);
      } else if (actionType === "scale") {
        const targetCategoryOrType = parts[1] || "service";
        const replicaCount = parseInt(parts[2]) || 2;

        const matchingNodes = graphState.nodes.filter(
          (n) =>
            n.id === targetCategoryOrType ||
            n.type === targetCategoryOrType ||
            n.category === targetCategoryOrType ||
            (targetCategoryOrType === "database" &&
              (n.category === "database" ||
                n.type === "postgresql" ||
                n.type === "mysql" ||
                n.type === "cassandra" ||
                n.type === "mongodb")) ||
            (targetCategoryOrType === "service" &&
              (n.category === "compute" || n.type === "server" || n.type === "microservice"))
        );

        if (matchingNodes.length > 0) {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                matchingNodes.some((mn) => mn.id === n.id)
                  ? {
                      ...n,
                      config: {
                        ...n.config,
                        replicas: Math.max(replicaCount, (n.config.replicas || 1) + 1),
                      },
                    }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `AI Architect Applied: Scaled ${targetCategoryOrType} replicas to ${replicaCount} (${suggestion.title})`,
            { payload: { action, suggestionTitle: suggestion.title } }
          );
        } else {
          commitGraphChange(
            (prev) => ({
              ...prev,
              nodes: prev.nodes.map((n) =>
                n.category === "compute" || n.category === "database"
                  ? { ...n, config: { ...n.config, replicas: replicaCount } }
                  : n
              ),
            }),
            "UPDATE_CONFIGURATION",
            `AI Architect Applied: Scaled replicas to ${replicaCount} (${suggestion.title})`,
            { payload: { action } }
          );
        }
      } else if (actionType === "connect") {
        const sourceId = parts[1];
        const targetId = parts[2];
        if (sourceId && targetId) {
          const edgeId = `e-${sourceId}-${targetId}-${Date.now().toString().slice(-3)}`;
          commitGraphChange(
            (prev) => ({
              ...prev,
              edges: [
                ...prev.edges,
                {
                  id: edgeId,
                  source: sourceId,
                  target: targetId,
                  connectionType: "sync",
                },
              ],
            }),
            "CONNECT_COMPONENTS",
            `AI Architect Applied: Connected '${sourceId}' → '${targetId}'`,
            { edgeId }
          );
        }
      }

      setAppliedSuggestions((prev) => new Set(prev).add(suggestion.title));
      setTimeout(() => {
        handleFetchCritiqueRef.current?.();
      }, 150);
    },
    [graphState.nodes, handleAddComponent, commitGraphChange]
  );

  // --------------------------------------------------------------------------
  // PHASE 5: SIMULATION ACTIONS & REMEDIATION
  // --------------------------------------------------------------------------
  const handleSelectPreset = useCallback(
    (preset: TrafficPreset) => {
      setActivePresetId(preset.id);
      setBackendSimResult(null);
      setTrafficProfile((prev) => ({
        ...prev,
        ...preset.profile,
      }));
      setSimTickIndex(0);
      showToast(`Applied preset: ${preset.name} (${preset.badge})`);
    },
    [showToast]
  );

  const handleApplySimulationFix = useCallback(
    (action: string) => {
      if (!action) return;
      setBackendSimResult(null);

      if (action.startsWith("scale:")) {
        const parts = action.split(":");
        const targetNodeId = parts[1];
        const replicaCount = parseInt(parts[2], 10) || 3;
        const targetNode = graphState.nodes.find((n) => n.id === targetNodeId);

        commitGraphChange(
          (prev) => ({
            ...prev,
            nodes: prev.nodes.map((n) =>
              n.id === targetNodeId
                ? { ...n, config: { ...n.config, replicas: replicaCount } }
                : n
            ),
          }),
          "SCALE_COMPONENT",
          `Scaled ${targetNode?.name || targetNodeId} to ${replicaCount} replicas to relieve primary bottleneck`,
          { nodeId: targetNodeId, payload: { replicaCount } }
        );
        showToast(`⚡ Scaled ${targetNode?.name || targetNodeId} to ${replicaCount} replicas!`);
      } else if (action.startsWith("add_component:")) {
        const compType = action.split(":")[1] || "redis";
        const bNode = graphState.nodes.find((n) => n.id === activeSimulationResult.bottleneck_node_id);
        const posX = bNode ? bNode.position.x - 130 : 500;
        const posY = bNode ? bNode.position.y - 90 : 150;

        handleAddComponent(compType, { x: Math.max(50, posX), y: Math.max(50, posY) });
        showToast(`⚡ Added ${compType.toUpperCase()} to canvas to relieve primary bottleneck!`);
      }

      setTimeout(() => {
        handleFetchCritiqueRef.current?.();
      }, 150);
    },
    [graphState.nodes, activeSimulationResult.bottleneck_node_id, commitGraphChange, handleAddComponent, showToast]
  );

  const handleRunBackendTrace = useCallback(async () => {
    setIsBackendSimulating(true);
    try {
      const res = await runBackendSimulation(graphState, trafficProfile);
      setBackendSimResult(res);
      setSimTickIndex(0);
      showToast("Discrete event simulation trace completed via Backend Engine!");
    } catch {
      showToast("Backend simulation failed, running client simulation.");
    } finally {
      setIsBackendSimulating(false);
    }
  }, [graphState, trafficProfile, showToast]);

  // --------------------------------------------------------------------------
  // PHASE 6: CHAOS FAILURE INJECTION HANDLERS
  // --------------------------------------------------------------------------
  const handleTriggerChaos = useCallback((failureType: ChaosFailureType, targetId?: string) => {
    setBackendSimResult(null);
    setActiveChaosFailure(failureType);
    setChaosTargetNodeId(targetId || null);
    setSimTickIndex(0);

    if (failureType === "NONE" || failureType === "HEAL_SYSTEM") {
      showToast("🟢 Chaos healed: All systems restored to healthy state!");
    } else {
      showToast(`💥 Injected fault: ${failureType.replace(/_/g, " ")}`);
    }
  }, [showToast]);

  // --------------------------------------------------------------------------
  // PHASE 7: INTERVIEW MODE HANDLERS
  // --------------------------------------------------------------------------
  const handleSendInterviewTurn = useCallback(() => {
    if (!interviewInput.trim() || isInterviewCritiqueLoading) return;
    const candidateMsgText = interviewInput.trim();
    setInterviewInput("");

    const userMsg: InterviewMessage = {
      id: `msg-${Date.now()}-c`,
      sender: "candidate",
      text: candidateMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setInterviewMessages((prev) => [...prev, userMsg]);
    setIsInterviewCritiqueLoading(true);

    setTimeout(() => {
      const evalResult = evaluateInterviewTurn(
        interviewStage,
        candidateMsgText,
        graphState,
        interviewScores
      );

      const aiMsg: InterviewMessage = {
        id: `msg-${Date.now()}-i`,
        sender: "interviewer",
        text: evalResult.interviewerReply,
        feedback: evalResult.feedback,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setInterviewMessages((prev) => [...prev, aiMsg]);
      setInterviewScores(evalResult.updatedScores);
      if (evalResult.readyForNext) {
        setInterviewStage(evalResult.nextStage);
        showToast(`Advanced to Stage ${evalResult.nextStage}: ${INTERVIEW_STAGES[evalResult.nextStage - 1]?.title}`);
      }
      setIsInterviewCritiqueLoading(false);
    }, 450);
  }, [interviewInput, isInterviewCritiqueLoading, interviewStage, graphState, interviewScores, showToast]);

  const handleRequestInterviewHint = useCallback(() => {
    const currentStageInfo = INTERVIEW_STAGES.find((s) => s.stage === interviewStage) || INTERVIEW_STAGES[0];
    const hintMsg: InterviewMessage = {
      id: `msg-${Date.now()}-h`,
      sender: "interviewer",
      text: `💡 **Staff Architect Hint**: ${currentStageInfo.hint}`,
      is_hint: true,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setInterviewMessages((prev) => [...prev, hintMsg]);
  }, [interviewStage]);

  const handleRestartInterview = useCallback(() => {
    const init = getInitialInterviewState();
    setInterviewMessages(init.messages);
    setInterviewScores(init.scores);
    setInterviewStage(1);
    showToast("Restarted System Design Interview session");
  }, [showToast]);

  // Restore past architecture version snapshot (Phase 8)
  const handleRestoreVersion = useCallback((versionNum: number) => {
    const targetGraph = history.find((h) => h.metadata.version === versionNum);
    if (targetGraph) {
      setGraphState(targetGraph);
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
      showToast(`↺ Restored architecture canvas to version ${versionNum}`);
    }
  }, [history, showToast]);

  // Auto-decluster and space out nodes into clean logical architecture lanes
  const handleDeClusterCanvas = useCallback(() => {
    if (graphState.nodes.length === 0) return;

    const tierMap: Record<string, number> = {
      client: 0,
      dns: 0,
      cdn: 1,
      api_gateway: 1,
      gateway: 1,
      load_balancer: 2,
      server: 3,
      microservice: 3,
      worker: 3,
      cache: 4,
      redis: 4,
      memcached: 4,
      queue: 4,
      kafka: 4,
      rabbitmq: 4,
      database: 5,
      postgresql: 5,
      mysql: 5,
      mongodb: 5,
      cassandra: 5,
      object_storage: 5,
      block_storage: 5,
    };

    const tierNodes: Record<number, ArchitectureNode[]> = {
      0: [],
      1: [],
      2: [],
      3: [],
      4: [],
      5: [],
    };

    graphState.nodes.forEach((n) => {
      const tier = tierMap[n.type] ?? (tierMap[n.category] ?? 3);
      if (!tierNodes[tier]) tierNodes[tier] = [];
      tierNodes[tier].push(n);
    });

    const startX = 80;
    const tierSpacingX = 320;
    const nodeSpacingY = 170;
    const baseY = 220;

    const newNodes = graphState.nodes.map((n) => {
      const tier = tierMap[n.type] ?? (tierMap[n.category] ?? 3);
      const listInTier = tierNodes[tier] || [];
      const indexInTier = listInTier.findIndex((item) => item.id === n.id);
      const totalInTier = listInTier.length;

      const posX = startX + tier * tierSpacingX;
      const posY = baseY + (indexInTier - (totalInTier - 1) / 2) * nodeSpacingY;

      return {
        ...n,
        position: { x: posX, y: Math.max(60, Math.round(posY)) },
      };
    });

    commitGraphChange(
      (prev) => ({
        ...prev,
        nodes: newNodes,
      }),
      "AUTO_LAYOUT",
      "De-clustered canvas and aligned into clean architectural tiers"
    );

    showToast("🪄 Canvas de-clustered & organized into clean tiers!");

    setTimeout(() => {
      reactFlowInstance.fitView({ padding: 0.25, duration: 400 });
    }, 50);
  }, [graphState.nodes, commitGraphChange, showToast, reactFlowInstance]);

  // Node Drag on Canvas
  const onNodesChange = useCallback((changes: any) => {
    const hasMeaningfulChange = changes.some(
      (c: any) => (c.type === "position" && c.position) || c.type === "remove"
    );
    if (!hasMeaningfulChange) return;

    setGraphState((prev) => {
      const updatedFlowNodes = applyNodeChanges(
        changes,
        prev.nodes.map((n) => ({
          id: n.id,
          type: "simulatorCustomNode",
          position: n.position,
          initialWidth: 210,
          initialHeight: 80,
          data: { archNode: n },
        }))
      );
      return {
        ...prev,
        nodes: prev.nodes
          .filter((n) => updatedFlowNodes.some((fn) => fn.id === n.id))
          .map((n) => {
            const match = updatedFlowNodes.find((fn) => fn.id === n.id);
            return match && match.position ? { ...n, position: match.position } : n;
          }),
      };
    });
  }, []);

  const onEdgesChange = useCallback((changes: any) => {
    setGraphState((prev) => {
      const updatedFlowEdges = applyEdgeChanges(
        changes,
        prev.edges.map((e) => ({ id: e.id, source: e.source, target: e.target }))
      );
      return {
        ...prev,
        edges: prev.edges.filter((e) => updatedFlowEdges.some((fe) => fe.id === e.id)),
      };
    });
  }, []);

  // Active selected entities
  const activeNode = useMemo(
    () => graphState.nodes.find((n) => n.id === selectedNodeId) || null,
    [graphState.nodes, selectedNodeId]
  );

  const activeEdge = useMemo(
    () => graphState.edges.find((e) => e.id === selectedEdgeId) || null,
    [graphState.edges, selectedEdgeId]
  );

  const isRightPaneActiveOnMobile =
    Boolean(activeNode) ||
    Boolean(activeEdge) ||
    activeTab === "simulation" ||
    activeTab === "evaluation" ||
    activeTab === "requirements";

  return (
    <main id="main-content" tabIndex={-1} className="flex flex-col h-screen w-full overflow-hidden bg-surface-ground text-zinc-200 focus:outline-none">
      {/* ==================================================================== */}
      {/* TOP BAR — DEVELOPER WORKSPACE HEADER                                 */}
      {/* ==================================================================== */}
      <header className="h-13 border-b border-zinc-800 bg-zinc-950 px-3 sm:px-4 lg:px-5 flex items-center justify-between gap-3 shrink-0 z-40 select-none">
        {/* ==================== ZONE 1: BRAND & CONTEXT (LEFT) ==================== */}
        <div className="flex items-center gap-2.5 shrink-0">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-7 h-7 rounded-md bg-zinc-900 border border-zinc-700 flex items-center justify-center">
              <Layers className="w-3.5 h-3.5 text-zinc-100" />
            </div>
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-bold tracking-tight text-zinc-100 leading-tight">
                Design<span className="text-blue-500">Karo</span>
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
                Simulator
              </span>
            </div>
          </Link>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Problem Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900/60 text-xs">
            <span className="text-zinc-500 text-[11px] hidden md:inline font-sans">Problem:</span>
            <span className="font-semibold text-zinc-200 tracking-tight truncate max-w-[140px] sm:max-w-[180px]">
              {graphState.metadata.title}
            </span>
          </div>

          {/* Unified Telemetry Health Badge */}
          <button
            onClick={() => {
              setActiveTab("evaluation");
              setShowValidationDrawer(true);
            }}
            className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-850 hover:border-zinc-700 text-xs transition group"
            title={`System Health: ${validationResponse.health_score}% | Est. Cost: $${validationResponse.estimated_monthly_cost.toLocaleString()}/mo`}
          >
            <span className={`w-2 h-2 rounded-full ${
              validationResponse.status === "PASS"
                ? "bg-emerald-500"
                : validationResponse.status === "NEEDS_IMPROVEMENT"
                ? "bg-amber-500"
                : "bg-red-500"
            }`} />
            <span className="font-semibold text-zinc-200 font-mono">
              {validationResponse.health_score}%
            </span>
            <span className="text-zinc-500 text-[11px] hidden min-[1700px]:inline">
              {validationResponse.status === "PASS" ? "Healthy" : "Issues"}
            </span>
            <span className="text-zinc-700 hidden min-[1700px]:inline">|</span>
            <span className="text-zinc-400 text-[11px] font-mono hidden min-[1700px]:flex items-center gap-0.5">
              ${validationResponse.estimated_monthly_cost.toLocaleString()}/mo
            </span>
          </button>
        </div>

        {/* ==================== ZONE 2: WORKFLOW STAGES (CENTER) ==================== */}
        <nav className="hidden md:flex items-center p-0.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab("requirements")}
            className={`px-3 py-1 rounded-md transition font-medium ${
              activeTab === "requirements"
                ? "bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            }`}
          >
            Requirements
          </button>
          <button
            onClick={() => setActiveTab("architecture")}
            className={`px-3 py-1 rounded-md transition font-medium ${
              activeTab === "architecture"
                ? "bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            }`}
          >
            Architecture
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
              activeTab === "simulation"
                ? "bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-zinc-400" />
            <span>Simulation</span>
            {activeSimulationResult.bottleneck_node_id && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
            )}
          </button>
          <button
            onClick={() => setActiveTab("evaluation")}
            className={`px-3 py-1 rounded-md transition font-medium flex items-center gap-1.5 ${
              activeTab === "evaluation"
                ? "bg-zinc-800 border border-zinc-700 text-zinc-100 shadow-xs"
                : "text-zinc-400 hover:text-zinc-200 border border-transparent"
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
            <span>Evaluation</span>
          </button>
        </nav>

        {/* Mobile View Toggle (Center) */}
        <div className="flex md:hidden items-center p-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs">
          <button
            onClick={() => setActiveTab("architecture")}
            className={`min-h-[36px] px-2.5 py-1.5 rounded transition inline-flex items-center justify-center ${
              activeTab === "architecture"
                ? "bg-zinc-800 text-zinc-100 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Design
          </button>
          <button
            onClick={() => setActiveTab("simulation")}
            className={`min-h-[36px] px-2.5 py-1.5 rounded transition inline-flex items-center justify-center gap-1 ${
              activeTab === "simulation"
                ? "bg-zinc-800 text-zinc-100 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="w-3 h-3 text-zinc-400" />
            <span>Sim</span>
          </button>
          <button
            onClick={() => setActiveTab("evaluation")}
            className={`min-h-[36px] px-2.5 py-1.5 rounded transition inline-flex items-center justify-center ${
              activeTab === "evaluation"
                ? "bg-zinc-800 text-zinc-100 font-medium"
                : "text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Eval
          </button>
        </div>

        {/* ==================== ZONE 3: ACTIONS & INTELLIGENCE (RIGHT) ==================== */}
        <div className="flex items-center gap-2 shrink-0">
          {/* History Controls (Undo / Redo) */}
          <div className="flex items-center rounded-md border border-zinc-800 bg-zinc-900 p-0.5">
            <button
              onClick={handleUndo}
              disabled={historyIndex === 0}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition ${
                historyIndex > 0
                  ? "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                  : "text-zinc-600 cursor-not-allowed"
              }`}
              title="Undo (Ctrl+Z)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
            <div className="h-3 w-[1px] bg-zinc-800" />
            <button
              onClick={handleRedo}
              disabled={historyIndex >= history.length - 1}
              className={`min-w-[36px] min-h-[36px] flex items-center justify-center rounded transition ${
                historyIndex < history.length - 1
                  ? "text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800"
                  : "text-zinc-600 cursor-not-allowed"
              }`}
              title="Redo (Ctrl+Y)"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* New Canvas Button */}
          <button
            onClick={() => {
              if (graphState.nodes.length === 0 && graphState.edges.length === 0) {
                showToast("Canvas is already empty");
                return;
              }
              setIsResetConfirmOpen(true);
            }}
            className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition"
            title="Create a new blank canvas"
          >
            <Trash2 className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden sm:inline">New Canvas</span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 hidden sm:block" />

          {/* Architecture Critique / Review Button */}
          <button
            onClick={() => {
              const next = !showAiDrawer;
              setShowAiDrawer(next);
              if (next) setShowValidationDrawer(false);
              if (next && !aiCritique && !isAiLoading) {
                handleFetchCritique();
              }
            }}
            className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs font-medium transition ${
              showAiDrawer
                ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-zinc-100"
            }`}
            title="Review topology critique & trade-offs"
          >
            <Brain className="w-3.5 h-3.5 text-blue-400" />
            <span>Review</span>
            {isAiLoading ? (
              <RefreshCw className="w-2.5 h-2.5 text-blue-400 animate-spin" />
            ) : null}
          </button>

          {/* Socratic System Design Interview Button */}
          <button
            onClick={() => setShowInterviewModal(true)}
            className="min-h-[36px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-zinc-100 text-xs font-medium transition"
            title="Launch Socratic System Design Interview"
          >
            <MessageSquare className="w-3.5 h-3.5 text-zinc-400" />
            <span>Interview</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
              {interviewStage}/9
            </span>
          </button>

          <div className="h-4 w-[1px] bg-zinc-800 hidden md:block" />

          {/* Diagnostics: Rules, Events & Timer */}
          <div className="flex items-center gap-1">
            {/* Rules Button */}
            <button
              onClick={() => {
                const next = !showValidationDrawer;
                setShowValidationDrawer(next);
                if (next) setShowAiDrawer(false);
              }}
              className={`min-h-[36px] flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-xs transition ${
                showValidationDrawer
                  ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                  : validationResponse.violations.some((v) => v.severity === "critical")
                  ? "border-red-500/50 bg-red-500/10 text-red-300 hover:bg-red-500/20"
                  : validationResponse.violations.length > 0
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
              title={`Deterministic Rules: ${validationResponse.violations.length} Issues`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-zinc-400" />
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-mono font-medium ${
                  validationResponse.violations.some((v) => v.severity === "critical")
                    ? "bg-red-500 text-white"
                    : validationResponse.violations.length > 0
                    ? "bg-amber-500 text-amber-950 font-bold"
                    : "bg-zinc-800 text-zinc-300 border border-zinc-700"
                }`}
              >
                {validationResponse.violations.length}
              </span>
            </button>

            {/* Events Button */}
            <button
              onClick={() => setShowEventLog(!showEventLog)}
              className={`flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-mono transition ${
                showEventLog
                  ? "border-zinc-700 bg-zinc-800 text-zinc-100"
                  : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
              }`}
              title={`Architecture Event Stream: ${events.length} Events`}
            >
              <History className="w-3.5 h-3.5 text-zinc-400" />
              <span className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 text-zinc-400 border border-zinc-700">
                {events.length}
              </span>
            </button>

            {/* Session Timer */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900 text-xs font-mono text-zinc-400">
              <Clock className="w-3 h-3 text-zinc-500" />
              <span>{formattedTime}</span>
            </div>

            {/* User Session Badge / Guest Sign-In */}
            {user ? (
              <Link
                href="/progress"
                title={`Logged in as ${user?.profile?.username || user?.email} — View telemetry`}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md border border-zinc-800 bg-zinc-900 hover:bg-zinc-850 hover:border-zinc-700 text-xs font-mono text-zinc-300 transition"
              >
                <User className="w-3 h-3 text-zinc-400" />
                <span className="max-w-[90px] truncate hidden xl:inline font-medium">
                  {user?.profile?.username || user?.email?.split("@")[0]}
                </span>
              </Link>
            ) : (
              <button
                onClick={() => setAuthModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-700 bg-zinc-800 hover:bg-zinc-750 text-xs text-zinc-200 hover:text-white transition font-medium"
                title="Sign in to sync XP, persist canvas diagrams, and track rubric progress"
              >
                <LogIn className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">Sign In</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. THREE-PANE MAIN WORKSPACE                                         */}
      {/* ==================================================================== */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* LEFT PANE: COMPONENT LIBRARY */}
        <SimulatorComponentLibrary
          isMobileComponentLibraryOpen={isMobileComponentLibraryOpen}
          setIsMobileComponentLibraryOpen={setIsMobileComponentLibraryOpen}
          searchFilter={searchFilter}
          setSearchFilter={setSearchFilter}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          filteredComponents={filteredComponents}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          handleAddComponent={handleAddComponent}
        />

        {/* CENTER PANE: ARCHITECTURE CANVAS */}
        <main
          ref={reactFlowWrapper}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          className={`flex-1 h-full relative bg-surface-ground transition-all duration-150 ${
            isDragOverCanvas ? "ring-2 ring-inset ring-blue-500/40 bg-zinc-950" : ""
          }`}
        >
          {/* Visual Drop Overlay Hint */}
          {isDragOverCanvas && (
            <div className="absolute inset-0 z-30 pointer-events-none flex items-center justify-center bg-zinc-950/40 border-2 border-dashed border-blue-500/60 rounded-lg m-2">
              <div className="px-4 py-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs font-medium flex items-center gap-2 shadow-xl">
                <Plus className="w-4 h-4 text-blue-400" />
                <span>Drop to place component</span>
              </div>
            </div>
          )}

          {/* Placement Toast Notification */}
          {toastMessage && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="px-3.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-200 text-xs flex items-center gap-2 shadow-xl">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span>{toastMessage}</span>
              </div>
            </div>
          )}

          {/* Blank Canvas Onboarding & Starter Templates Overlay */}
          {graphState.nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center p-4 pointer-events-none z-20">
              <div className="max-w-md w-full p-6 rounded-lg bg-zinc-900 border border-zinc-800 shadow-2xl text-center pointer-events-auto space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div className="w-10 h-10 rounded-md bg-zinc-800 border border-zinc-700 text-zinc-300 mx-auto flex items-center justify-center">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-zinc-100">
                    Design Canvas is Blank
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Select a starter architectural pattern or add blocks from the component catalog to begin designing.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-left">
                  <button
                    onClick={() => handleLoadStarterTemplate("three_tier")}
                    className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-950 transition-colors group"
                  >
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-blue-400">3-Tier Web</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">LB ➔ App ➔ DB</div>
                  </button>
                  <button
                    onClick={() => handleLoadStarterTemplate("cache_aside")}
                    className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-950 transition-colors group"
                  >
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-blue-400">Cache-Aside</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Redis + Postgres</div>
                  </button>
                  <button
                    onClick={() => handleLoadStarterTemplate("event_driven")}
                    className="p-2.5 rounded-md border border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-950 transition-colors group"
                  >
                    <div className="text-xs font-medium text-zinc-200 group-hover:text-blue-400">Event-Driven</div>
                    <div className="text-[10px] text-zinc-500 font-mono mt-0.5">Kafka Streams</div>
                  </button>
                </div>
                <div className="pt-1 flex items-center justify-center">
                  <button
                    onClick={() => setIsMobileComponentLibraryOpen(true)}
                    className="md:hidden w-full py-2 px-3 rounded-md bg-blue-600 text-white text-xs font-medium flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Browse Component Catalog</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          <ReactFlow
            nodes={flowNodes}
            edges={flowEdges}
            nodeTypes={nodeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDragOver={onDragOver}
            onDrop={onDrop}
            proOptions={{ hideAttribution: true }}
            onNodeClick={(_e, node) => {
              setSelectedNodeId(node.id);
              setSelectedEdgeId(null);
            }}
            onEdgeClick={(_e, edge) => {
              setSelectedEdgeId(edge.id);
              setSelectedNodeId(null);
            }}
            onPaneClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
            }}
            fitView
            fitViewOptions={{ padding: 0.2, includeHiddenNodes: true }}
            minZoom={0.3}
            maxZoom={1.8}
            className="bg-surface-ground"
          >
            <Background
              variant={BackgroundVariant.Dots}
              gap={20}
              size={1}
              color="#27272a"
            />
            <Controls className="!bg-zinc-900 !border-zinc-800 !rounded-md !text-zinc-300 [&>button]:!bg-transparent [&>button]:!border-zinc-800 [&>button:hover]:!bg-zinc-800" />
          </ReactFlow>

          {/* Floating Action Bar */}
          <div className="absolute top-3.5 left-3.5 z-10 flex items-center gap-1 p-1 rounded-md bg-zinc-900 border border-zinc-800 shadow-md text-xs">
            {/* Mobile Open Component Library Button */}
            <button
              onClick={() => setIsMobileComponentLibraryOpen(true)}
              className="md:hidden flex items-center gap-1 px-2 py-1 rounded bg-blue-600 text-white text-xs font-medium"
              title="Open Component Library"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Block</span>
            </button>
            <div className="h-3.5 w-[1px] bg-zinc-800 md:hidden" />

            <button
              onClick={handleDeClusterCanvas}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800 transition text-xs font-medium"
              title="Auto-organize and de-cluster canvas into clean architectural lanes"
            >
              <Workflow className="w-3.5 h-3.5 text-zinc-400" />
              <span className="hidden sm:inline">Clean Layout</span>
            </button>
            <div className="h-3.5 w-[1px] bg-zinc-800" />
            <button
              onClick={() => reactFlowInstance.fitView({ padding: 0.2 })}
              className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
              title="Fit View"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => {
                if (graphState.nodes.length === 0 && graphState.edges.length === 0) {
                  showToast("Canvas is already empty");
                  return;
                }
                setIsResetConfirmOpen(true);
              }}
              className="flex items-center gap-1.5 px-2 py-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition text-xs font-medium"
              title="Clear canvas"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Clear</span>
            </button>

            {selectedNodeId && (
              <>
                <div className="h-3.5 w-[1px] bg-zinc-800" />
                <button
                  onClick={handleDuplicateNode}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
                  title="Duplicate Node"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleDeleteSelectedNode}
                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
                  title="Delete Selected Node (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}

            {selectedEdgeId && (
              <>
                <div className="h-3.5 w-[1px] bg-zinc-800" />
                <button
                  onClick={handleDeleteSelectedEdge}
                  className="p-1 rounded text-zinc-400 hover:text-rose-400 hover:bg-zinc-800 transition"
                  title="Delete Selected Edge (Del)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>

          {/* Canvas Bottom Legend */}
          <div className="absolute bottom-3.5 left-3.5 z-10 hidden md:flex items-center gap-3 px-3 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-[11px] text-zinc-400 select-none shadow-md">
            <span
              className="flex items-center gap-1.5 cursor-help hover:text-sky-300 transition"
              title="SYNC (HTTP/gRPC): Blocking call. Caller thread waits for response; downstream latency and crashes immediately cascade upstream."
            >
              <span className="w-2.5 h-[2px] bg-sky-400" />
              <span>Sync (Blocking)</span>
            </span>
            <span
              className="flex items-center gap-1.5 cursor-help hover:text-amber-300 transition"
              title="ASYNC (Queue/Stream): Non-blocking message buffer. Producers succeed immediately; consumers pull at capacity, absorbing spikes."
            >
              <span className="w-2.5 h-[2px] border-b border-dashed border-amber-400" />
              <span>Async (Buffered)</span>
            </span>
            <span
              className="flex items-center gap-1.5 cursor-help hover:text-sky-200 transition"
              title="REPLICATION: Data sync to read replicas. Relieves read load on primary DB; tracks replication lag during write bursts."
            >
              <span className="w-2.5 h-[2px] border-b border-dotted border-sky-300" />
              <span>Replication</span>
            </span>
            <span
              className="flex items-center gap-1.5 cursor-help hover:text-emerald-300 transition"
              title="READ PATH: Dedicated query flow. Served by caches or read replicas; reduces load on primary database storage."
            >
              <span className="w-2.5 h-[2px] bg-emerald-400" />
              <span>Read Path</span>
            </span>
            <span
              className="flex items-center gap-1.5 cursor-help hover:text-rose-300 transition"
              title="WRITE PATH: Mutation persist flow. Bypasses caches directly to storage; causes write lock serialization if unbuffered."
            >
              <span className="w-2.5 h-[2px] bg-rose-400" />
              <span>Write Path</span>
            </span>
          </div>
        </main>

        {/* Mobile Backdrop for Right Pane Drawer */}
        {isRightPaneActiveOnMobile && (
          <div
            onClick={() => {
              setSelectedNodeId(null);
              setSelectedEdgeId(null);
              if (activeTab !== "architecture") setActiveTab("architecture");
            }}
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs md:hidden"
          />
        )}

        {/* RIGHT PANE: CONFIGURATION DRAWER (NODE OR EDGE) */}
        <aside
          className={`${
            isRightPaneActiveOnMobile
              ? "fixed inset-y-0 right-0 z-40 w-full sm:w-[420px] md:relative md:flex"
              : "hidden md:flex"
          } ${
            activeTab === "simulation" || activeTab === "evaluation"
              ? "md:w-80 lg:w-[410px]"
              : "md:w-72 lg:w-80"
          } border-l border-surface-border bg-surface-base flex-col shrink-0 shadow-2xl md:shadow-none transition-all duration-200`}
        >
          {activeTab === "simulation" ? (
            <SimulatorCockpitPanel
              simulationSubTab={simulationSubTab}
              setSimulationSubTab={setSimulationSubTab}
              setActiveTab={setActiveTab}
              activeChaosFailure={activeChaosFailure}
              activeNode={activeNode ?? undefined}
              commitGraphChange={commitGraphChange}
              setSelectedNodeId={setSelectedNodeId}
              activePresetId={activePresetId}
              handleSelectPreset={handleSelectPreset}
              trafficProfile={trafficProfile}
              setTrafficProfile={setTrafficProfile}
              setBackendSimResult={setBackendSimResult}
              chaosTargetNodeId={chaosTargetNodeId}
              setChaosTargetNodeId={setChaosTargetNodeId}
              handleTriggerChaos={handleTriggerChaos}
              graphState={graphState}
              activeSimulationResult={activeSimulationResult}
              handleApplySimulationFix={handleApplySimulationFix}
              isSimulationRunning={isSimulationRunning}
              setIsSimulationRunning={setIsSimulationRunning}
              simTickIndex={simTickIndex}
              setSimTickIndex={setSimTickIndex}
              currentTick={currentTick ?? undefined}
              handleRunBackendTrace={handleRunBackendTrace}
              isBackendSimulating={isBackendSimulating}
            />
          ) : activeTab === "requirements" ? (
            <SimulatorRequirementsPanel setActiveTab={setActiveTab} />
          ) : activeTab === "evaluation" ? (
            <SimulatorEvaluationPanel
              graphState={graphState}
              setActiveTab={setActiveTab}
              evaluationSubTab={evaluationSubTab}
              setEvaluationSubTab={setEvaluationSubTab}
              history={history}
              comprehensiveEvaluation={comprehensiveEvaluation}
              validationResponse={validationResponse}
              setShowValidationDrawer={setShowValidationDrawer}
              diffBaseVersion={diffBaseVersion}
              setDiffBaseVersion={setDiffBaseVersion}
              diffTargetVersion={diffTargetVersion}
              setDiffTargetVersion={setDiffTargetVersion}
              versionDiffResult={versionDiffResult}
              handleRestoreVersion={handleRestoreVersion}
            />
          ) : (
            <SimulatorConfigPanel
              activeNode={activeNode ?? undefined}
              activeEdge={activeEdge ?? undefined}
              setSelectedNodeId={setSelectedNodeId}
              setSelectedEdgeId={setSelectedEdgeId}
              commitGraphChange={commitGraphChange}
              nodeViolationMap={nodeViolationMap}
              handleUpdateNodeConfig={handleUpdateNodeConfig}
              handleDuplicateNode={handleDuplicateNode}
              handleDeleteSelectedNode={handleDeleteSelectedNode}
              handleUpdateConnectionType={handleUpdateConnectionType}
              handleDeleteSelectedEdge={handleDeleteSelectedEdge}
            />
          )}
        </aside>
      </div>

      {/* ==================================================================== */}
      {/* 3. ARCHITECTURE EVENT STREAM & STATE INSPECTOR MODAL/DRAWER           */}
      {/* ==================================================================== */}
      <SimulatorEventStreamDrawer
        isOpen={showEventLog}
        onClose={() => setShowEventLog(false)}
        graphState={graphState}
        events={events}
      />

      {/* ==================================================================== */}
      {/* 4. DETERMINISTIC RULE ENGINE & INVARIANTS DRAWER                     */}
      {/* ==================================================================== */}
      <SimulatorRuleEngineDrawer
        isOpen={showValidationDrawer}
        onClose={() => setShowValidationDrawer(false)}
        validationResponse={validationResponse}
        handleFocusNode={handleFocusNode}
        handleApplyQuickFix={handleApplyQuickFix}
      />

      {/* ==================================================================== */}
      {/* 5. ARCHITECTURE ADVISOR DRAWER (PHASE 4)                             */}
      {/* ==================================================================== */}
      <SimulatorAdvisorDrawer
        isOpen={showAiDrawer}
        onClose={() => setShowAiDrawer(false)}
        aiCritique={aiCritique}
        isAiLoading={isAiLoading}
        aiError={aiError}
        handleFetchCritique={handleFetchCritique}
        graphState={graphState}
        validationResponse={validationResponse}
        appliedSuggestions={appliedSuggestions}
        handleApplySuggestion={handleApplySuggestion}
      />

      {/* ==================================================================== */}
      {/* PHASE 7: SOCRATIC SYSTEM DESIGN INTERVIEW MODAL / DRAWER             */}
      {/* ==================================================================== */}
      <SimulatorInterviewModal
        isOpen={showInterviewModal}
        onClose={() => setShowInterviewModal(false)}
        interviewStage={interviewStage}
        setInterviewStage={setInterviewStage}
        interviewMessages={interviewMessages}
        isInterviewCritiqueLoading={isInterviewCritiqueLoading}
        interviewInput={interviewInput}
        setInterviewInput={setInterviewInput}
        handleSendInterviewTurn={handleSendInterviewTurn}
        handleRequestInterviewHint={handleRequestInterviewHint}
        handleRestartInterview={handleRestartInterview}
        interviewScores={interviewScores}
        graphState={graphState}
      />

      {/* Clear Canvas Confirmation Modal */}
      <SimulatorClearCanvasModal
        isOpen={isResetConfirmOpen}
        onClose={() => setIsResetConfirmOpen(false)}
        graphState={graphState}
        onConfirmClear={() => {
          commitGraphChange(
            (prev) => ({ ...prev, nodes: [], edges: [] }),
            "CLEAR_ARCHITECTURE",
            "Cleared entire canvas architecture"
          );
          setSelectedNodeId(null);
          setSelectedEdgeId(null);
          setIsResetConfirmOpen(false);
          showToast("Canvas architecture reset to empty state");
        }}
      />

      {/* Auth Modal for Simulator actions */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
      />
    </main>
  );
}

export default function SimulatorPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen w-full bg-surface-ground flex flex-col items-center justify-center font-mono">
        <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center animate-pulse mb-3">
          <Layers className="w-5 h-5 text-blue-400" />
        </div>
        <p className="text-xs text-zinc-400">Loading architecture simulator...</p>
      </div>
    );
  }

  return (
    <Suspense
      fallback={
        <div className="min-h-screen w-full bg-surface-ground flex flex-col items-center justify-center font-mono">
          <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center animate-pulse mb-3">
            <Layers className="w-5 h-5 text-blue-400" />
          </div>
          <p className="text-xs text-zinc-400">Loading architecture simulator...</p>
        </div>
      }
    >
      <ReactFlowProvider>
        <SimulatorContent />
      </ReactFlowProvider>
    </Suspense>
  );
}
