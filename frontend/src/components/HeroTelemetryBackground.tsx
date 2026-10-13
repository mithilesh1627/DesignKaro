"use client";

import React, { useEffect, useRef } from "react";

interface TelemetryNode {
  id: number;
  homeX: number;
  homeY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  driftRadiusX: number;
  driftRadiusY: number;
  driftSpeedX: number;
  driftSpeedY: number;
  driftPhaseX: number;
  driftPhaseY: number;
  baseRadius: number;
  type: "gateway" | "service" | "cache" | "database";
  tier: "ingress" | "compute" | "storage";
  label: string;
  alpha: number;
  pulsePhase: number;
  pulseSpeed: number;
  glowIntensity: number;
  neighbors: number[];
}

interface TelemetryPacket {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
  size: number;
  kind: "http" | "rpc" | "cache" | "db";
}

interface TelemetryRipple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  speed: number;
  active: boolean;
}

const GATEWAY_LABELS = ["EDGE-L7", "INGRESS", "ENVOY-GW", "ANYCAST-01"];
const SERVICE_LABELS = ["SVC:AUTH", "WORKER:01", "WORKER:02", "TASK:SCHED", "STREAM:PROC", "ORCHESTRATOR"];
const CACHE_LABELS = ["REDIS:CACHE", "MEM:L1", "KEY-VALUE", "WARM:STORE"];
const DB_LABELS = ["RAFT:LEADER", "PG:PRIMARY", "KAFKA:P0", "STATE:REPLICA"];

export function HeroTelemetryBackground() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let isReducedMotion = reducedMotionQuery.matches;

    // Quality configuration tiering
    const getQualityConfig = (width: number) => {
      const isCoarse = window.matchMedia("(pointer: coarse)").matches;
      if (isCoarse || width < 640) {
        return {
          nodeCount: 16,
          maxDistance: 110,
          maxNeighbors: 2,
          packetCount: 3,
          maxRipples: 4,
          enableMouse: false,
          enableLabels: false,
          dprCap: 1.0,
        };
      } else if (width < 1024) {
        return {
          nodeCount: 26,
          maxDistance: 135,
          maxNeighbors: 3,
          packetCount: 5,
          maxRipples: 8,
          enableMouse: true,
          enableLabels: true,
          dprCap: 1.25,
        };
      } else {
        return {
          nodeCount: 38,
          maxDistance: 160,
          maxNeighbors: 3,
          packetCount: 7,
          maxRipples: 12,
          enableMouse: true,
          enableLabels: true,
          dprCap: 1.5,
        };
      }
    };

    let width = container.clientWidth || window.innerWidth;
    let height = container.clientHeight || 700;
    let config = getQualityConfig(width);

    const setupCanvasSize = () => {
      if (!canvas || !container || !ctx) return;
      width = container.clientWidth || window.innerWidth;
      height = container.clientHeight || 700;
      config = getQualityConfig(width);

      const dpr = Math.min(window.devicePixelRatio || 1, config.dprCap);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    setupCanvasSize();

    // Node generation with structured topological architectural zones
    const nodes: TelemetryNode[] = [];
    const seedNodes = () => {
      nodes.length = 0;
      const count = config.nodeCount;
      const padX = Math.max(30, width * 0.05);
      const padY = Math.max(30, height * 0.08);

      // Divide width into 3 distinct architectural zones:
      // Ingress (15-30%), Compute (30-65%), Storage/Cache (65-90%)
      for (let i = 0; i < count; i++) {
        let tier: "ingress" | "compute" | "storage";
        let type: "gateway" | "service" | "cache" | "database";
        let label = "";
        let minX = padX;
        let maxX = width - padX;

        const ratio = i / (count - 1);
        if (ratio < 0.28) {
          tier = "ingress";
          type = "gateway";
          label = GATEWAY_LABELS[i % GATEWAY_LABELS.length];
          minX = padX;
          maxX = width * 0.33;
        } else if (ratio < 0.72) {
          tier = "compute";
          type = "service";
          label = SERVICE_LABELS[i % SERVICE_LABELS.length];
          minX = width * 0.32;
          maxX = width * 0.68;
        } else {
          tier = "storage";
          const isDb = (i % 2 === 0);
          type = isDb ? "database" : "cache";
          label = isDb
            ? DB_LABELS[i % DB_LABELS.length]
            : CACHE_LABELS[i % CACHE_LABELS.length];
          minX = width * 0.66;
          maxX = width - padX;
        }

        const homeX = minX + Math.random() * (maxX - minX);
        let homeY: number;
        // Distribute nodes to frame the hero content with atmospheric peripheral activity
        const yRand = Math.random();
        if (yRand < 0.42) {
          // Upper architectural band
          homeY = padY + Math.random() * (height * 0.36 - padY);
        } else if (yRand < 0.84) {
          // Lower telemetry band
          homeY = height * 0.64 + Math.random() * (height * 0.36 - padY);
        } else {
          // Peripheral flanks
          homeY = height * 0.36 + Math.random() * (height * 0.28);
        }

        let baseRadius = 2.2;
        let alpha = 0.55;

        if (type === "gateway") {
          baseRadius = 3.6;
          alpha = 0.75;
        } else if (type === "cache") {
          baseRadius = 2.8;
          alpha = 0.7;
        } else if (type === "database") {
          baseRadius = 3.2;
          alpha = 0.75;
        } else {
          baseRadius = 2.4;
          alpha = 0.55;
        }

        nodes.push({
          id: i,
          homeX,
          homeY,
          x: homeX,
          y: homeY,
          vx: 0,
          vy: 0,
          driftRadiusX: 12 + Math.random() * 24,
          driftRadiusY: 10 + Math.random() * 18,
          driftSpeedX: 0.35 + Math.random() * 0.45,
          driftSpeedY: 0.28 + Math.random() * 0.4,
          driftPhaseX: Math.random() * Math.PI * 2,
          driftPhaseY: Math.random() * Math.PI * 2,
          baseRadius,
          type,
          tier,
          label,
          alpha,
          pulsePhase: Math.random() * Math.PI * 2,
          pulseSpeed: 1.2 + Math.random() * 1.6,
          glowIntensity: 0,
          neighbors: [],
        });
      }
    };

    seedNodes();

    // Compute topological neighbors (prefer intra-tier or forward-tier connections)
    const updateNeighbors = () => {
      const maxDistSq = config.maxDistance * config.maxDistance;

      for (let i = 0; i < nodes.length; i++) {
        nodes[i].neighbors = [];
      }

      for (let i = 0; i < nodes.length; i++) {
        const u = nodes[i];
        const candidates: { idx: number; distSq: number }[] = [];

        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const v = nodes[j];

          const dx = u.homeX - v.homeX;
          const dy = u.homeY - v.homeY;
          const distSq = dx * dx + dy * dy;

          if (distSq < maxDistSq) {
            // Favor architecture flow: ingress -> compute -> storage
            let tierBonus = 1.0;
            if (
              (u.tier === "ingress" && v.tier === "compute") ||
              (u.tier === "compute" && v.tier === "storage") ||
              (u.tier === v.tier)
            ) {
              tierBonus = 0.8; // higher priority
            }
            candidates.push({ idx: j, distSq: distSq * tierBonus });
          }
        }

        candidates.sort((a, b) => a.distSq - b.distSq);
        const limit = Math.min(candidates.length, config.maxNeighbors);
        for (let k = 0; k < limit; k++) {
          nodes[i].neighbors.push(candidates[k].idx);
        }
      }
    };

    updateNeighbors();

    // Ripple shockwave pool
    const ripples: TelemetryRipple[] = [];
    for (let r = 0; r < config.maxRipples; r++) {
      ripples.push({
        x: 0,
        y: 0,
        radius: 0,
        maxRadius: 28,
        alpha: 0,
        color: "rgba(56, 189, 248, 0.8)",
        speed: 36,
        active: false,
      });
    }

    const triggerRipple = (x: number, y: number, color: string, maxR: number = 28) => {
      const ripple = ripples.find((r) => !r.active);
      if (!ripple) return;
      ripple.x = x;
      ripple.y = y;
      ripple.radius = 2;
      ripple.maxRadius = maxR;
      ripple.alpha = 0.65;
      ripple.color = color;
      ripple.speed = 32 + Math.random() * 14;
      ripple.active = true;
    };

    // Packets simulation (RPC, HTTP, Cache hits, DB commits)
    const packets: TelemetryPacket[] = [];
    const packetSpecs: { kind: TelemetryPacket["kind"]; color: string; speed: number; size: number }[] = [
      { kind: "http", color: "rgba(56, 189, 248, 0.95)", speed: 0.38, size: 2.0 },  // Sky blue
      { kind: "rpc", color: "rgba(129, 140, 248, 0.95)", speed: 0.44, size: 2.0 },   // Indigo
      { kind: "cache", color: "rgba(52, 211, 153, 0.95)", speed: 0.52, size: 2.2 },  // Emerald
      { kind: "db", color: "rgba(251, 191, 36, 0.95)", speed: 0.32, size: 1.9 },     // Amber
    ];

    const spawnPacket = (idx: number) => {
      if (nodes.length < 2) return;
      const validSources = nodes.filter((n) => n.neighbors.length > 0);
      if (validSources.length === 0) return;

      const source = validSources[Math.floor(Math.random() * validSources.length)];
      const targetIdx = source.neighbors[Math.floor(Math.random() * source.neighbors.length)];

      const spec = packetSpecs[idx % packetSpecs.length];

      packets[idx] = {
        fromIdx: source.id,
        toIdx: targetIdx,
        progress: 0,
        speed: spec.speed + (Math.random() * 0.16 - 0.08),
        color: spec.color,
        size: spec.size,
        kind: spec.kind,
      };
    };

    for (let i = 0; i < config.packetCount; i++) {
      spawnPacket(i);
      if (packets[i]) {
        packets[i].progress = Math.random() * 0.85;
      }
    }

    // Pointer Interaction State (Damped Spring HUD)
    const mouse = {
      targetX: -9999,
      targetY: -9999,
      currX: -9999,
      currY: -9999,
      active: false,
      intensity: 0,
      lastMoved: 0,
    };

    const handlePointerMove = (e: MouseEvent) => {
      if (!config.enableMouse) return;
      const rect = container.getBoundingClientRect();
      mouse.targetX = e.clientX - rect.left;
      mouse.targetY = e.clientY - rect.top;
      if (!mouse.active) {
        mouse.currX = mouse.targetX;
        mouse.currY = mouse.targetY;
      }
      mouse.active = true;
      mouse.lastMoved = performance.now();
    };

    const handlePointerLeave = () => {
      mouse.active = false;
    };

    if (config.enableMouse) {
      window.addEventListener("mousemove", handlePointerMove, { passive: true });
      container.addEventListener("mouseleave", handlePointerLeave, { passive: true });
    }

    // Render loop state
    let animFrameId: number | null = null;
    let lastTime = performance.now();
    let isIntersecting = true;
    let isVisible = !document.hidden;

    // Draw single frame
    const drawFrame = (dt: number, time: number) => {
      ctx.clearRect(0, 0, width, height);

      // Mouse smoothing
      if (mouse.active && time - mouse.lastMoved < 2400) {
        mouse.currX += (mouse.targetX - mouse.currX) * Math.min(1, dt * 10);
        mouse.currY += (mouse.targetY - mouse.currY) * Math.min(1, dt * 10);
        mouse.intensity = Math.min(1, mouse.intensity + dt * 4.0);
      } else {
        mouse.intensity = Math.max(0, mouse.intensity - dt * 2.2);
      }

      const tSec = time * 0.001;

      // 1. Update node physics & organic harmonic drift
      if (!isReducedMotion) {
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];

          // Harmonic drift around home coordinates
          const targetX =
            node.homeX + Math.sin(tSec * node.driftSpeedX + node.driftPhaseX) * node.driftRadiusX;
          const targetY =
            node.homeY + Math.cos(tSec * node.driftSpeedY + node.driftPhaseY) * node.driftRadiusY;

          node.x += (targetX - node.x) * Math.min(1, dt * 2.5);
          node.y += (targetY - node.y) * Math.min(1, dt * 2.5);

          // Pulse & glow relaxation
          node.pulsePhase += node.pulseSpeed * dt;
          if (node.glowIntensity > 0) {
            node.glowIntensity = Math.max(0, node.glowIntensity - dt * 3.0);
          }
        }
      }

      // 2. Blueprint schematic background grid tick marks
      const gridSize = 72;
      const numCols = Math.ceil(width / gridSize);
      const numRows = Math.ceil(height / gridSize);

      ctx.strokeStyle = "rgba(255, 255, 255, 0.04)";
      ctx.lineWidth = 1;
      for (let col = 1; col < numCols; col++) {
        const gx = col * gridSize;
        for (let row = 1; row < numRows; row++) {
          const gy = row * gridSize;
          // Draw small "+" intersection marks
          ctx.beginPath();
          ctx.moveTo(gx - 3, gy);
          ctx.lineTo(gx + 3, gy);
          ctx.moveTo(gx, gy - 3);
          ctx.lineTo(gx, gy + 3);
          ctx.stroke();
        }
      }

      // 3. Draw architectural connection links (Curved Bezier or Clean Lines)
      const maxDist = config.maxDistance;
      const drawnEdges = new Set<string>();

      for (let i = 0; i < nodes.length; i++) {
        const u = nodes[i];
        for (let k = 0; k < u.neighbors.length; k++) {
          const j = u.neighbors[k];
          const v = nodes[j];

          const edgeKey = i < j ? `${i}-${j}` : `${j}-${i}`;
          if (drawnEdges.has(edgeKey)) continue;
          drawnEdges.add(edgeKey);

          const dx = v.x - u.x;
          const dy = v.y - u.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const normalizedDist = 1 - dist / maxDist;
            // Higher alpha for inter-tier connections
            const baseAlpha = normalizedDist * normalizedDist * 0.18;

            let strokeColor = `rgba(148, 163, 184, ${baseAlpha.toFixed(3)})`;
            if (u.tier === "storage" || v.tier === "storage") {
              strokeColor = `rgba(245, 158, 11, ${(baseAlpha * 0.7).toFixed(3)})`;
            } else if (u.type === "cache" || v.type === "cache") {
              strokeColor = `rgba(52, 211, 153, ${(baseAlpha * 0.8).toFixed(3)})`;
            } else if (u.tier === "ingress" || v.tier === "ingress") {
              strokeColor = `rgba(56, 189, 248, ${(baseAlpha * 0.85).toFixed(3)})`;
            }

            ctx.strokeStyle = strokeColor;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(u.x, u.y);

            // Subtle curved routing for organic bus aesthetic
            const midX = (u.x + v.x) / 2;
            const midY = (u.y + v.y) / 2 + (u.x > v.x ? 8 : -8);
            ctx.quadraticCurveTo(midX, midY, v.x, v.y);
            ctx.stroke();
          }
        }
      }

      // 4. Update and Draw Shockwave Ripples
      if (!isReducedMotion) {
        for (let r = 0; r < ripples.length; r++) {
          const rip = ripples[r];
          if (!rip.active) continue;

          rip.radius += rip.speed * dt;
          rip.alpha = (1 - rip.radius / rip.maxRadius) * 0.6;

          if (rip.radius >= rip.maxRadius || rip.alpha <= 0.01) {
            rip.active = false;
            continue;
          }

          ctx.strokeStyle = rip.color.replace("0.8", rip.alpha.toFixed(3));
          ctx.lineWidth = 1.2;
          ctx.beginPath();
          ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // 5. Draw Interactive Mouse Telemetry HUD & Magnetic Proximity
      if (mouse.intensity > 0.02 && config.enableMouse) {
        const cursorRadius = 160;
        const cursorRadiusSq = cursorRadius * cursorRadius;
        const nearestToMouse: { idx: number; dist: number }[] = [];

        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i];
          const dx = mouse.currX - node.x;
          const dy = mouse.currY - node.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < cursorRadiusSq) {
            const dist = Math.sqrt(distSq);
            nearestToMouse.push({ idx: i, dist });

            // Magnetic attraction toward cursor
            if (!isReducedMotion) {
              const pull = (1 - dist / cursorRadius) * 12 * mouse.intensity;
              node.x += (dx / dist) * pull * dt * 2.5;
              node.y += (dy / dist) * pull * dt * 2.5;
            }
          }
        }

        // Draw laser reactive link beams from cursor to closest nodes
        nearestToMouse.sort((a, b) => a.dist - b.dist);
        const beamCount = Math.min(nearestToMouse.length, 3);
        for (let b = 0; b < beamCount; b++) {
          const targetNode = nodes[nearestToMouse[b].idx];
          const prox = 1 - nearestToMouse[b].dist / cursorRadius;
          const beamAlpha = prox * 0.3 * mouse.intensity;

          const beamGrad = ctx.createLinearGradient(
            mouse.currX,
            mouse.currY,
            targetNode.x,
            targetNode.y
          );
          beamGrad.addColorStop(0, `rgba(56, 189, 248, ${beamAlpha.toFixed(3)})`);
          beamGrad.addColorStop(1, `rgba(99, 102, 241, ${(beamAlpha * 0.6).toFixed(3)})`);

          ctx.strokeStyle = beamGrad;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(mouse.currX, mouse.currY);
          ctx.lineTo(targetNode.x, targetNode.y);
          ctx.stroke();
        }

        // Precision Crosshair HUD at cursor
        const hudAlpha = 0.5 * mouse.intensity;
        ctx.strokeStyle = `rgba(56, 189, 248, ${hudAlpha.toFixed(3)})`;
        ctx.lineWidth = 1;

        // Outer targeting ring
        ctx.beginPath();
        ctx.arc(mouse.currX, mouse.currY, 18, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshair reticle
        ctx.beginPath();
        ctx.moveTo(mouse.currX - 24, mouse.currY);
        ctx.lineTo(mouse.currX - 12, mouse.currY);
        ctx.moveTo(mouse.currX + 12, mouse.currY);
        ctx.lineTo(mouse.currX + 24, mouse.currY);
        ctx.moveTo(mouse.currX, mouse.currY - 24);
        ctx.lineTo(mouse.currX, mouse.currY - 12);
        ctx.moveTo(mouse.currX, mouse.currY + 12);
        ctx.lineTo(mouse.currX, mouse.currY + 24);
        ctx.stroke();

        // Small telemetry readout beside cursor
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.font = '9px "JetBrains Mono", ui-monospace, monospace';
        ctx.fillStyle = `rgba(186, 230, 253, ${(hudAlpha * 0.85).toFixed(3)})`;
        ctx.fillText(
          `PROBE :: ${Math.round(mouse.currX)},${Math.round(mouse.currY)}`,
          mouse.currX + 26,
          mouse.currY - 8
        );
        ctx.fillStyle = `rgba(52, 211, 153, ${(hudAlpha * 0.85).toFixed(3)})`;
        ctx.fillText("QPS 52.4K · 3.8ms", mouse.currX + 26, mouse.currY + 4);
      }

      // 6. Draw Nodes (Gateways, Compute Services, Caches, Databases)
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = Math.sin(node.pulsePhase) * 0.5 + 0.5;
        const totalGlow = Math.min(1, node.alpha + pulse * 0.2 + node.glowIntensity * 0.55);

        if (node.type === "gateway") {
          // Double beacon ring for Ingress Gateways
          const ringR = node.baseRadius + 5 + pulse * 3;
          ctx.strokeStyle = `rgba(56, 189, 248, ${(totalGlow * 0.35).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
          ctx.stroke();

          // Core node
          ctx.fillStyle = `rgba(186, 230, 253, ${totalGlow.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.baseRadius + node.glowIntensity * 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (node.type === "cache") {
          // Cache Node: Emerald glow
          const ringR = node.baseRadius + 3.5 + pulse * 2;
          ctx.strokeStyle = `rgba(52, 211, 153, ${(totalGlow * 0.35).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(110, 231, 183, ${totalGlow.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.baseRadius + node.glowIntensity * 1.5, 0, Math.PI * 2);
          ctx.fill();
        } else if (node.type === "database") {
          // Database Node: Amber / Orange
          const ringR = node.baseRadius + 4 + pulse * 2;
          ctx.strokeStyle = `rgba(245, 158, 11, ${(totalGlow * 0.3).toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(node.x, node.y, ringR, 0, Math.PI * 2);
          ctx.stroke();

          ctx.fillStyle = `rgba(253, 230, 138, ${totalGlow.toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.baseRadius + node.glowIntensity * 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else {
          // Worker / Microservice Node: Slate / Violet
          ctx.fillStyle = `rgba(165, 180, 252, ${(totalGlow * 0.9).toFixed(3)})`;
          ctx.beginPath();
          ctx.arc(node.x, node.y, node.baseRadius + node.glowIntensity * 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        // Subtle micro-labels for primary cluster nodes (on desktop viewports)
        if (config.enableLabels && (node.type === "gateway" || node.type === "cache" || node.type === "database" || i % 4 === 0)) {
          ctx.font = '8px "JetBrains Mono", ui-monospace, monospace';
          ctx.fillStyle = "rgba(148, 163, 184, 0.45)";
          ctx.textAlign = "center";
          ctx.textBaseline = "alphabetic";
          ctx.fillText(node.label, node.x, node.y + node.baseRadius + 11);
        }
      }

      // 7. Draw Telemetry Packets (Flowing Traffic Pulses)
      if (!isReducedMotion) {
        for (let p = 0; p < packets.length; p++) {
          const pkt = packets[p];
          if (!pkt) continue;

          pkt.progress += pkt.speed * dt;

          const from = nodes[pkt.fromIdx];
          const to = nodes[pkt.toIdx];

          if (!from || !to) {
            spawnPacket(p);
            continue;
          }

          if (pkt.progress >= 1) {
            // Packet arrival: shockwave ripple and glow burst
            to.glowIntensity = 1.0;
            triggerRipple(to.x, to.y, pkt.color, 24);

            // Re-route along next neighbor hop
            if (to.neighbors.length > 0) {
              const eligible = to.neighbors.filter((nIdx) => nIdx !== pkt.fromIdx);
              const nextIdx =
                eligible.length > 0
                  ? eligible[Math.floor(Math.random() * eligible.length)]
                  : to.neighbors[Math.floor(Math.random() * to.neighbors.length)];

              pkt.fromIdx = pkt.toIdx;
              pkt.toIdx = nextIdx;
              pkt.progress = 0;
            } else {
              spawnPacket(p);
            }
            continue;
          }

          // Quadratic curve interpolation matching connection lines
          const t = pkt.progress;
          const midX = (from.x + to.x) / 2;
          const midY = (from.y + to.y) / 2 + (from.x > to.x ? 8 : -8);

          // Bezier position formula: (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
          const currX = (1 - t) * (1 - t) * from.x + 2 * (1 - t) * t * midX + t * t * to.x;
          const currY = (1 - t) * (1 - t) * from.y + 2 * (1 - t) * t * midY + t * t * to.y;

          // Packet glow head
          ctx.fillStyle = pkt.color;
          ctx.beginPath();
          ctx.arc(currX, currY, pkt.size, 0, Math.PI * 2);
          ctx.fill();

          // Packet trail behind head
          const tTrail = Math.max(0, t - 0.12);
          const trailX = (1 - tTrail) * (1 - tTrail) * from.x + 2 * (1 - tTrail) * tTrail * midX + tTrail * tTrail * to.x;
          const trailY = (1 - tTrail) * (1 - tTrail) * from.y + 2 * (1 - tTrail) * tTrail * midY + tTrail * tTrail * to.y;

          const trailGrad = ctx.createLinearGradient(trailX, trailY, currX, currY);
          trailGrad.addColorStop(0, "transparent");
          trailGrad.addColorStop(1, pkt.color);

          ctx.strokeStyle = trailGrad;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.moveTo(trailX, trailY);
          ctx.lineTo(currX, currY);
          ctx.stroke();
        }
      }
    };

    // Animation Loop
    const tick = (time: number) => {
      if (!isIntersecting || !isVisible) {
        animFrameId = null;
        return;
      }

      const rawDt = (time - lastTime) / 1000;
      const dt = Math.min(Math.max(rawDt, 0.008), 0.08);
      lastTime = time;

      drawFrame(dt, time);
      animFrameId = requestAnimationFrame(tick);
    };

    const startAnimation = () => {
      if (isReducedMotion) {
        drawFrame(0.016, performance.now());
        return;
      }
      if (!animFrameId && isIntersecting && isVisible) {
        lastTime = performance.now();
        animFrameId = requestAnimationFrame(tick);
      }
    };

    const stopAnimation = () => {
      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }
    };

    startAnimation();

    // 1. Intersection Observer: Pause when out of screen
    const observer = new IntersectionObserver(
      ([entry]) => {
        isIntersecting = entry.isIntersecting;
        if (isIntersecting) {
          startAnimation();
        } else {
          stopAnimation();
        }
      },
      { threshold: 0, rootMargin: "100px" }
    );
    observer.observe(container);

    // 2. Tab Visibility Listener
    const handleVisibilityChange = () => {
      isVisible = !document.hidden;
      if (isVisible) {
        startAnimation();
      } else {
        stopAnimation();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // 3. Motion Preference Change Listener
    const handleMotionQueryChange = (e: MediaQueryListEvent) => {
      isReducedMotion = e.matches;
      if (isReducedMotion) {
        stopAnimation();
        drawFrame(0.016, performance.now());
      } else {
        startAnimation();
      }
    };
    reducedMotionQuery.addEventListener("change", handleMotionQueryChange);

    // 4. Resize Observer for fluid responsiveness
    let resizeTimer: number;
    const handleResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        setupCanvasSize();
        seedNodes();
        updateNeighbors();
        for (let i = 0; i < config.packetCount; i++) {
          spawnPacket(i);
        }
        if (isReducedMotion) {
          drawFrame(0.016, performance.now());
        }
      }, 150);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    return () => {
      stopAnimation();
      observer.disconnect();
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      reducedMotionQuery.removeEventListener("change", handleMotionQueryChange);
      if (config.enableMouse) {
        window.removeEventListener("mousemove", handlePointerMove);
        container.removeEventListener("mouseleave", handlePointerLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none overflow-hidden z-0 select-none"
      style={{
        maskImage:
          "radial-gradient(ellipse 85% 70% at 50% 45%, black 25%, transparent 85%)",
        WebkitMaskImage:
          "radial-gradient(ellipse 85% 70% at 50% 45%, black 25%, transparent 85%)",
      }}
    >
      {/* Ambient Breathing Dual-Aurora Backdrop */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-blue-600/10 blur-[120px] pointer-events-none animate-pulse-slow transform-gpu" />
      <div className="absolute top-1/3 right-1/4 w-[28rem] h-[28rem] rounded-full bg-indigo-600/10 blur-[140px] pointer-events-none animate-pulse-slow [animation-delay:2.5s] transform-gpu" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full bg-emerald-500/5 blur-[100px] pointer-events-none transform-gpu" />

      <canvas
        ref={canvasRef}
        className="w-full h-full block"
      />
    </div>
  );
}
