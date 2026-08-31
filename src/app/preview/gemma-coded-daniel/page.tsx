"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  ArrowRight,
  Check,
  Sun,
  Moon,
  Play,
  Pause,
  RotateCcw,
  Sliders,
  Cpu,
  Activity,
  Terminal,
  ChevronRight,
} from "lucide-react";
import { LiveAgentInspector } from "@/components/preview/LiveAgentInspector";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type ThemeMode = "light" | "dark";

export type PrecisionTier = "fp32" | "fp64" | "tensor_fp8";

export interface SimulationParams {
  particleCount: number; // 100 - 2000
  damping: number; // 0.900 - 0.999
  gravity: number; // 0.0 - 2.0
  speed: number; // 0.5 - 5.0
}

export interface SimulationMetrics {
  fps: number;
  stepTimeMs: number;
  activeParticles: number;
  kineticEnergy: number;
}

export interface ComputeEstimateInput {
  nodes: number; // 1 - 128
  hours: number; // 1 - 720
  precision: PrecisionTier;
}

export interface ComputeEstimateResult {
  baseCost: number;
  discountRate: number;
  discountAmount: number;
  finalCost: number;
  tflops: number;
  memoryAllocatedGB: number;
}

export interface ConsultationFormData {
  fullName: string;
  email: string;
  organization: string;
  computeDomain: string;
  projectSummary: string;
  estimatedBudgetTier: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

// ============================================================================
// CONSTANTS & SPECIFICATIONS
// ============================================================================

const TIER_SPECS: Record<
  PrecisionTier,
  { name: string; rate: number; tflops: number; vram: number }
> = {
  tensor_fp8: { name: "Tensor FP8", rate: 1.75, tflops: 312.0, vram: 80 },
  fp32: { name: "IEEE FP32", rate: 2.5, tflops: 78.4, vram: 80 },
  fp64: { name: "Double FP64", rate: 4.8, tflops: 19.5, vram: 96 },
};

// ============================================================================
// COMPUTATION ENGINE & HELPERS
// ============================================================================

function calculateComputeEstimate(
  input: ComputeEstimateInput
): ComputeEstimateResult {
  const spec = TIER_SPECS[input.precision];
  const baseCost = input.nodes * input.hours * spec.rate;

  let discountRate = 0.0;
  if (input.nodes >= 64) {
    discountRate = 0.2;
  } else if (input.nodes >= 32) {
    discountRate = 0.15;
  } else if (input.nodes >= 16) {
    discountRate = 0.1;
  }

  const discountAmount = baseCost * discountRate;
  const finalCost = baseCost - discountAmount;
  const tflops = input.nodes * spec.tflops;
  const memoryAllocatedGB = input.nodes * spec.vram;

  return {
    baseCost,
    discountRate,
    discountAmount,
    finalCost,
    tflops,
    memoryAllocatedGB,
  };
}

// ============================================================================
// MAIN COMPONENT EXPORT
// ============================================================================

export default function LandingPagePreview() {
  // --------------------------------------------------------------------------
  // THEME MANAGEMENT
  // --------------------------------------------------------------------------
  const [theme, setTheme] = useState<ThemeMode>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("synapse_theme") as ThemeMode | null;
    if (stored === "light" || stored === "dark") {
      setTheme(stored);
    } else {
      setTheme("dark");
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    localStorage.setItem("synapse_theme", next);
  };

  // --------------------------------------------------------------------------
  // PHYSICS WORKBENCH STATE & ENGINE
  // --------------------------------------------------------------------------
  const [simParams, setSimParams] = useState<SimulationParams>({
    particleCount: 600,
    damping: 0.985,
    gravity: 0.4,
    speed: 1.5,
  });

  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [metrics, setMetrics] = useState<SimulationMetrics>({
    fps: 60,
    stepTimeMs: 1.2,
    activeParticles: 600,
    kineticEnergy: 0,
  });

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const frameCountRef = useRef<number>(0);
  const fpsTimerRef = useRef<number>(performance.now());

  // Initialize Particles
  const initParticles = useCallback((count: number, width: number, height: number) => {
    const arr: Particle[] = [];
    const safeWidth = width || 800;
    const safeHeight = height || 450;
    for (let i = 0; i < count; i++) {
      arr.push({
        x: Math.random() * safeWidth,
        y: Math.random() * (safeHeight * 0.5),
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 2,
      });
    }
    particlesRef.current = arr;
  }, []);

  // Draw background grid & particles
  const drawFrame = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
    // Clear background
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines
    ctx.strokeStyle = "#171717";
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Render particles
    ctx.fillStyle = "#ffffff";
    const pts = particlesRef.current;
    for (let i = 0; i < pts.length; i++) {
      ctx.fillRect(pts[i].x, pts[i].y, 1.5, 1.5);
    }
  }, []);

  // Re-init when particle count changes and re-render static view if paused
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const width = canvas.width || 800;
      const height = canvas.height || 450;
      initParticles(simParams.particleCount, width, height);

      if (!isRunning) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawFrame(ctx, width, height);
        }
      }
    }
  }, [simParams.particleCount, isRunning, initParticles, drawFrame]);

  // Main Canvas Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    const handleResize = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        width = rect.width;
        height = rect.height;
        if (!isRunning) {
          drawFrame(ctx, width, height);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    if (particlesRef.current.length === 0) {
      initParticles(simParams.particleCount, width, height);
    }

    if (!isRunning) {
      drawFrame(ctx, width, height);
      return () => {
        window.removeEventListener("resize", handleResize);
      };
    }

    const render = () => {
      const now = performance.now();
      const dt = now - lastTimeRef.current;
      lastTimeRef.current = now;

      // Clear & Draw Grid
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, width, height);

      ctx.strokeStyle = "#171717";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      const g = simParams.gravity;
      const d = simParams.damping;
      const s = simParams.speed;

      let totalEk = 0;
      const pts = particlesRef.current;

      ctx.fillStyle = "#ffffff";

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        // Euler Integration
        const ay = g;
        p.vx = p.vx * d;
        p.vy = (p.vy + ay) * d;

        p.x = p.x + p.vx * s;
        p.y = p.y + p.vy * s;

        // Floor collision
        if (p.y >= height - 2) {
          p.y = height - 2;
          p.vy = -p.vy * d;
        }
        // Ceiling collision
        if (p.y <= 2) {
          p.y = 2;
          p.vy = -p.vy * d;
        }
        // Wall collisions
        if (p.x <= 2) {
          p.x = 2;
          p.vx = -p.vx * d;
        } else if (p.x >= width - 2) {
          p.x = width - 2;
          p.vx = -p.vx * d;
        }

        // Kinetic Energy sum (m=1.0)
        const vSq = p.vx * p.vx + p.vy * p.vy;
        totalEk += 0.5 * vSq;

        // Render particle
        ctx.fillRect(p.x, p.y, 1.5, 1.5);
      }

      // Metrics update frequency throttling
      frameCountRef.current += 1;
      if (now - fpsTimerRef.current >= 250) {
        const currentFps = Math.round(
          (frameCountRef.current * 1000) / (now - fpsTimerRef.current)
        );
        setMetrics({
          fps: currentFps,
          stepTimeMs: parseFloat(dt.toFixed(2)),
          activeParticles: pts.length,
          kineticEnergy: Math.round(totalEk),
        });
        frameCountRef.current = 0;
        fpsTimerRef.current = now;
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener("resize", handleResize);
    };
  }, [simParams, isRunning, initParticles, drawFrame]);

  const resetSimulation = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const width = canvas.width || 800;
      const height = canvas.height || 450;
      initParticles(simParams.particleCount, width, height);
      if (!isRunning) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          drawFrame(ctx, width, height);
        }
      }
    }
  };

  // --------------------------------------------------------------------------
  // COMPUTE ESTIMATOR STATE
  // --------------------------------------------------------------------------
  const [estimateInput, setEstimateInput] = useState<ComputeEstimateInput>({
    nodes: 16,
    hours: 72,
    precision: "fp64",
  });

  const estimateResult = useMemo(
    () => calculateComputeEstimate(estimateInput),
    [estimateInput]
  );

  // --------------------------------------------------------------------------
  // CONSULTATION FORM STATE
  // --------------------------------------------------------------------------
  const [formData, setFormData] = useState<ConsultationFormData>({
    fullName: "",
    email: "",
    organization: "",
    computeDomain: "Computational Fluid Dynamics",
    projectSummary: "",
    estimatedBudgetTier: "$25k - $50k",
  });

  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitted(true);
  };

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------
  return (
    <div className={theme === "dark" ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-black text-neutral-950 dark:text-neutral-100 font-sans antialiased transition-colors duration-200">
        
        {/* ==================================================================== */}
        {/* HEADER                                                               */}
        {/* ==================================================================== */}
        <header className="sticky top-0 z-50 w-full border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-black/80 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm tracking-widest uppercase font-semibold text-neutral-950 dark:text-white">
                SIMULATION WITH DANIEL
              </span>
              <span className="hidden sm:inline-block border border-neutral-200 dark:border-neutral-800 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                STATUS: OPTIMAL [NODE_CLUSTER_ONLINE]
              </span>
            </div>

            <nav className="flex items-center gap-6">
              <a
                href="#workbench"
                className="text-xs font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Workbench
              </a>
              <a
                href="#capabilities"
                className="text-xs font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Capabilities
              </a>
              <a
                href="#estimator"
                className="text-xs font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Estimator
              </a>
              <a
                href="#consultation"
                className="text-xs font-mono uppercase tracking-wider text-neutral-600 dark:text-neutral-400 hover:text-neutral-950 dark:hover:text-white transition-colors"
              >
                Contact
              </a>

              <button
                onClick={toggleTheme}
                aria-label="Toggle Color Theme"
                className="p-2 border border-neutral-200 dark:border-neutral-800 rounded-none bg-neutral-50 dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                {theme === "dark" ? (
                  <Sun className="w-4 h-4" />
                ) : (
                  <Moon className="w-4 h-4" />
                )}
              </button>
            </nav>
          </div>
        </header>

        {/* ==================================================================== */}
        {/* HERO SECTION                                                         */}
        {/* ==================================================================== */}
        <section className="border-b border-neutral-200 dark:border-neutral-800 py-24 px-6 max-w-7xl mx-auto">
          <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-4 flex items-center gap-2">
            <Terminal className="w-3.5 h-3.5" />
            <span>High-Throughput Numerical Engineering</span>
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-medium tracking-tight text-neutral-950 dark:text-white max-w-4xl mb-6 leading-[1.05]">
            Custom physics engines built for extreme cluster scale.
          </h1>

          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl font-normal leading-relaxed mb-10">
            We architect deterministic multi-physics models, sparse dynamic matrix solvers, and high-performance HPC pipelines tailored for aerospace, computational fluid dynamics, and micro-scale material dynamics.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#consultation"
              className="py-4 px-8 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-mono text-xs uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center gap-2 rounded-none"
            >
              <span>Schedule Architecture Review</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <a
              href="#workbench"
              className="py-4 px-8 border border-neutral-300 dark:border-neutral-700 font-mono text-xs uppercase tracking-widest hover:border-neutral-950 dark:hover:border-white transition-colors flex items-center gap-2 rounded-none"
            >
              <span>Launch Kinematic Canvas</span>
              <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Metadata Spec Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 mt-16 border-t border-neutral-200 dark:border-neutral-800 font-mono text-xs">
            <div>
              <div className="text-neutral-500 dark:text-neutral-400 uppercase text-[10px]">
                SOLVER BANDWIDTH
              </div>
              <div className="text-neutral-950 dark:text-white font-medium text-sm mt-1">
                4.8 TB/s Memory Bus
              </div>
            </div>
            <div>
              <div className="text-neutral-500 dark:text-neutral-400 uppercase text-[10px]">
                LATENCY GUARANTEE
              </div>
              <div className="text-neutral-950 dark:text-white font-medium text-sm mt-1">
                Sub-Millisecond Step
              </div>
            </div>
            <div>
              <div className="text-neutral-500 dark:text-neutral-400 uppercase text-[10px]">
                PRECISION SUPPORT
              </div>
              <div className="text-neutral-950 dark:text-white font-medium text-sm mt-1">
                IEEE FP32 / FP64 / FP8
              </div>
            </div>
            <div>
              <div className="text-neutral-500 dark:text-neutral-400 uppercase text-[10px]">
                CLUSTER EFFICIENT
              </div>
              <div className="text-neutral-950 dark:text-white font-medium text-sm mt-1">
                99.8% Scaling Metric
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* PHYSICS WORKBENCH SECTION                                            */}
        {/* ==================================================================== */}
        <section id="workbench" className="py-24 px-6 max-w-7xl mx-auto border-b border-neutral-200 dark:border-neutral-800">
          <div className="mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" />
              <span>Interactive Numerical Model</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-950 dark:text-white">
              2D Kinematic Vector Engine
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-xl mt-2">
              Real-time Euler integration simulation running in browser execution loop. Adjust parameters to inspect convergence stability and kinetic energy dissipation.
            </p>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              
              {/* Controls Panel */}
              <div className="lg:col-span-4 space-y-6 lg:border-r border-neutral-200 dark:border-neutral-800 lg:pr-6">
                <div className="flex items-center justify-between border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <span className="font-mono text-xs uppercase tracking-widest font-semibold flex items-center gap-2">
                    <Sliders className="w-4 h-4" /> Parameter Controls
                  </span>
                  <button
                    onClick={resetSimulation}
                    className="p-1 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-950 dark:hover:border-white transition-colors"
                    aria-label="Reset Simulation Particles"
                    title="Reset Particles"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Particle Count Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <label htmlFor="particle-count-slider" className="text-neutral-500 dark:text-neutral-400 uppercase cursor-pointer">
                      Particle Count (N)
                    </label>
                    <span className="tabular-nums font-medium">
                      {simParams.particleCount}
                    </span>
                  </div>
                  <input
                    id="particle-count-slider"
                    type="range"
                    min="100"
                    max="2000"
                    step="50"
                    value={simParams.particleCount}
                    onChange={(e) =>
                      setSimParams((prev) => ({
                        ...prev,
                        particleCount: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 appearance-none cursor-pointer accent-neutral-950 dark:accent-white"
                  />
                </div>

                {/* Damping Coefficient Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <label htmlFor="damping-slider" className="text-neutral-500 dark:text-neutral-400 uppercase cursor-pointer">
                      Damping (d)
                    </label>
                    <span className="tabular-nums font-medium">
                      {simParams.damping.toFixed(3)}
                    </span>
                  </div>
                  <input
                    id="damping-slider"
                    type="range"
                    min="0.900"
                    max="0.999"
                    step="0.001"
                    value={simParams.damping}
                    onChange={(e) =>
                      setSimParams((prev) => ({
                        ...prev,
                        damping: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 appearance-none cursor-pointer accent-neutral-950 dark:accent-white"
                  />
                </div>

                {/* Gravity Vector Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <label htmlFor="gravity-slider" className="text-neutral-500 dark:text-neutral-400 uppercase cursor-pointer">
                      Gravity Accel (g)
                    </label>
                    <span className="tabular-nums font-medium">
                      {simParams.gravity.toFixed(2)}
                    </span>
                  </div>
                  <input
                    id="gravity-slider"
                    type="range"
                    min="0.0"
                    max="2.0"
                    step="0.05"
                    value={simParams.gravity}
                    onChange={(e) =>
                      setSimParams((prev) => ({
                        ...prev,
                        gravity: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 appearance-none cursor-pointer accent-neutral-950 dark:accent-white"
                  />
                </div>

                {/* Speed Multiplier Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <label htmlFor="speed-slider" className="text-neutral-500 dark:text-neutral-400 uppercase cursor-pointer">
                      Time Step Multiplier (s)
                    </label>
                    <span className="tabular-nums font-medium">
                      {simParams.speed.toFixed(1)}x
                    </span>
                  </div>
                  <input
                    id="speed-slider"
                    type="range"
                    min="0.5"
                    max="5.0"
                    step="0.1"
                    value={simParams.speed}
                    onChange={(e) =>
                      setSimParams((prev) => ({
                        ...prev,
                        speed: parseFloat(e.target.value),
                      }))
                    }
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 appearance-none cursor-pointer accent-neutral-950 dark:accent-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => setIsRunning(!isRunning)}
                    className="w-full py-3 border border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-black font-mono text-xs uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2"
                  >
                    {isRunning ? (
                      <>
                        <Pause className="w-3.5 h-3.5" /> Pause Execution
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5" /> Resume Integration
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Canvas & Metrics Viewport */}
              <div className="lg:col-span-8 space-y-4">
                <div className="relative border border-neutral-800 overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    className="w-full h-[450px] bg-black block"
                  />
                  <div className="absolute top-3 left-3 bg-black/80 border border-neutral-800 px-3 py-1 font-mono text-[10px] text-neutral-400 uppercase tracking-widest pointer-events-none">
                    EULER_SOLVER_RUNNING [2D_VECTOR_FIELD]
                  </div>
                </div>

                {/* Live Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-4 font-mono">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      FRAME RATE
                    </div>
                    <div className="text-xl font-medium text-neutral-950 dark:text-white tabular-nums">
                      {metrics.fps} FPS
                    </div>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-4 font-mono">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      STEP DELTA
                    </div>
                    <div className="text-xl font-medium text-neutral-950 dark:text-white tabular-nums">
                      {metrics.stepTimeMs} ms
                    </div>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-4 font-mono">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      ACTIVE BODIES
                    </div>
                    <div className="text-xl font-medium text-neutral-950 dark:text-white tabular-nums">
                      {metrics.activeParticles}
                    </div>
                  </div>

                  <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-4 font-mono">
                    <div className="text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                      KINETIC ENERGY (Ek)
                    </div>
                    <div className="text-xl font-medium text-neutral-950 dark:text-white tabular-nums">
                      {metrics.kineticEnergy.toLocaleString()} J
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* CORE CAPABILITIES GRID                                              */}
        {/* ==================================================================== */}
        <section id="capabilities" className="py-24 px-6 max-w-7xl mx-auto border-b border-neutral-200 dark:border-neutral-800">
          <div className="mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
              <Cpu className="w-3.5 h-3.5" />
              <span>Architectural Expertise</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-950 dark:text-white">
              Engineering Domain Specializations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-neutral-200 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-800">
            {/* Capability 1 */}
            <div className="bg-white dark:bg-black p-8 flex flex-col justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div>
                <div className="font-mono text-xs text-neutral-400 dark:text-neutral-600 mb-6">
                  // 01 ARCHITECTURE
                </div>
                <h3 className="text-xl font-medium tracking-tight text-neutral-950 dark:text-white mb-3">
                  High-Throughput Numerical Modeling
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Design and acceleration of custom partial differential equation (PDE) solvers, finite-element analysis (FEA) pipelines, and continuous wave propagators.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-900 font-mono text-[11px] text-neutral-500 uppercase tracking-wider">
                MPI / CUDA / OpenCL Implementation
              </div>
            </div>

            {/* Capability 2 */}
            <div className="bg-white dark:bg-black p-8 flex flex-col justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div>
                <div className="font-mono text-xs text-neutral-400 dark:text-neutral-600 mb-6">
                  // 02 OPTIMIZATION
                </div>
                <h3 className="text-xl font-medium tracking-tight text-neutral-950 dark:text-white mb-3">
                  HPC Cluster Scaling & Distributed Memory
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Refactoring legacy numerical codebases for multi-node GPU clusters, eliminating InfiniBand communication bottlenecks, and optimizing SIMD vectorization.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-900 font-mono text-[11px] text-neutral-500 uppercase tracking-wider">
                InfiniBand / NCCL / RDMA Architecture
              </div>
            </div>

            {/* Capability 3 */}
            <div className="bg-white dark:bg-black p-8 flex flex-col justify-between hover:bg-neutral-50/50 dark:hover:bg-neutral-900/50 transition-colors">
              <div>
                <div className="font-mono text-xs text-neutral-400 dark:text-neutral-600 mb-6">
                  // 03 COMPUTATIONAL DYNAMICS
                </div>
                <h3 className="text-xl font-medium tracking-tight text-neutral-950 dark:text-white mb-3">
                  Custom Physics Engine Development
                </h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Bespoke deterministic physics kernels for hardware-in-the-loop (HIL) testing, trajectory prediction, dynamic structural stress response, and fluid-structure interaction.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-neutral-100 dark:border-neutral-900 font-mono text-[11px] text-neutral-500 uppercase tracking-wider">
                C++20 / Rust Native Integration
              </div>
            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* TABULAR COMPUTE ESTIMATOR SECTION                                    */}
        {/* ==================================================================== */}
        <section id="estimator" className="py-24 px-6 max-w-7xl mx-auto border-b border-neutral-200 dark:border-neutral-800">
          <div className="mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5" />
              <span>Financial & Capacity Planner</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-950 dark:text-white">
              Compute Resource Estimator
            </h2>
            <p className="text-neutral-600 dark:text-neutral-400 text-sm max-w-xl mt-2">
              Calculate projected hardware allocation, theoretical peak TFLOPS, memory footprint, and tier-based volume discounts for compute cluster deployments.
            </p>
          </div>

          <div className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
              
              {/* Configuration Inputs */}
              <div className="lg:col-span-6 space-y-8">
                {/* Precision Selection */}
                <div>
                  <span className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-3">
                    01 // Precision & Floating-Point Architecture
                  </span>
                  <div className="grid grid-cols-3 gap-2">
                    {(["tensor_fp8", "fp32", "fp64"] as PrecisionTier[]).map(
                      (tier) => {
                        const active = estimateInput.precision === tier;
                        return (
                          <button
                            key={tier}
                            type="button"
                            onClick={() =>
                              setEstimateInput((prev) => ({
                                ...prev,
                                precision: tier,
                              }))
                            }
                            className={`px-4 py-3 border font-mono text-xs uppercase tracking-wider transition-colors text-center ${
                              active
                                ? "border-neutral-950 dark:border-white bg-neutral-950 text-white dark:bg-white dark:text-black font-semibold"
                                : "border-neutral-200 dark:border-neutral-800 text-neutral-500 hover:text-neutral-950 dark:hover:text-white"
                            }`}
                          >
                            {TIER_SPECS[tier].name}
                          </button>
                        );
                      }
                    )}
                  </div>
                </div>

                {/* Node Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <label htmlFor="nodes-slider" className="text-neutral-500 dark:text-neutral-400 uppercase cursor-pointer">
                      02 // Cluster Node Count (N_nodes)
                    </label>
                    <span className="tabular-nums font-medium text-neutral-950 dark:text-white">
                      {estimateInput.nodes} Dedicated Nodes
                    </span>
                  </div>
                  <input
                    id="nodes-slider"
                    type="range"
                    min="1"
                    max="128"
                    step="1"
                    value={estimateInput.nodes}
                    onChange={(e) =>
                      setEstimateInput((prev) => ({
                        ...prev,
                        nodes: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 appearance-none cursor-pointer accent-neutral-950 dark:accent-white"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-neutral-400 mt-1">
                    <span>1 Node</span>
                    <span>16 Nodes (10% Off)</span>
                    <span>32 Nodes (15% Off)</span>
                    <span>64+ Nodes (20% Off)</span>
                  </div>
                </div>

                {/* Hours Slider */}
                <div>
                  <div className="flex justify-between text-xs font-mono mb-2">
                    <label htmlFor="hours-slider" className="text-neutral-500 dark:text-neutral-400 uppercase cursor-pointer">
                      03 // Execution Duration (H_hours)
                    </label>
                    <span className="tabular-nums font-medium text-neutral-950 dark:text-white">
                      {estimateInput.hours} Hours ({Math.round((estimateInput.hours / 24) * 10) / 10} Days)
                    </span>
                  </div>
                  <input
                    id="hours-slider"
                    type="range"
                    min="1"
                    max="720"
                    step="1"
                    value={estimateInput.hours}
                    onChange={(e) =>
                      setEstimateInput((prev) => ({
                        ...prev,
                        hours: parseInt(e.target.value, 10),
                      }))
                    }
                    className="w-full h-1 bg-neutral-300 dark:bg-neutral-700 appearance-none cursor-pointer accent-neutral-950 dark:accent-white"
                  />
                </div>
              </div>

              {/* Output Results Summary */}
              <div className="lg:col-span-6 border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-6 flex flex-col justify-between">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 border-b border-neutral-200 dark:border-neutral-800 pb-3 mb-4">
                    Calculation Breakdown Output
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 font-mono text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Base Node Hourly Rate
                      </span>
                      <span className="tabular-nums text-neutral-950 dark:text-white">
                        ${TIER_SPECS[estimateInput.precision].rate.toFixed(2)} / node-hr
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 font-mono text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Gross Compute Base Cost
                      </span>
                      <span className="tabular-nums text-neutral-950 dark:text-white">
                        ${estimateResult.baseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 font-mono text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Volume Tier Discount ({(estimateResult.discountRate * 100).toFixed(0)}%)
                      </span>
                      <span className="tabular-nums text-neutral-950 dark:text-white">
                        -${estimateResult.discountAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 font-mono text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Peak Theoretical Cluster Throughput
                      </span>
                      <span className="tabular-nums text-neutral-950 dark:text-white">
                        {estimateResult.tflops.toLocaleString(undefined, { maximumFractionDigits: 1 })} TFLOPS
                      </span>
                    </div>

                    <div className="flex justify-between items-center py-2.5 border-b border-neutral-200/60 dark:border-neutral-800/60 font-mono text-xs">
                      <span className="text-neutral-500 dark:text-neutral-400">
                        Total Allocated Unified VRAM
                      </span>
                      <span className="tabular-nums text-neutral-950 dark:text-white">
                        {estimateResult.memoryAllocatedGB.toLocaleString()} GB
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-1">
                    Estimated Net Cost
                  </div>
                  <div className="text-4xl font-mono font-medium text-neutral-950 dark:text-white tabular-nums tracking-tight">
                    ${estimateResult.finalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ==================================================================== */}
        {/* CONSULTATION FORM SECTION                                            */}
        {/* ==================================================================== */}
        <section id="consultation" className="py-24 px-6 max-w-7xl mx-auto border-b border-neutral-200 dark:border-neutral-800">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            <div className="lg:col-span-5">
              <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 flex items-center gap-2">
                <Terminal className="w-3.5 h-3.5" />
                <span>Technical Engagement</span>
              </div>
              <h2 className="text-3xl sm:text-4xl font-medium tracking-tight text-neutral-950 dark:text-white mb-4">
                Initiate Engineering Consultation
              </h2>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed mb-6">
                Direct engagement with Lead Principal Architect Daniel. We review core mathematical specs, memory bandwidth requirements, target hardware constraints, and dynamic simulation milestones.
              </p>

              <div className="space-y-4 font-mono text-xs">
                <div className="flex items-start gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <Check className="w-4 h-4 text-neutral-950 dark:text-white shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-950 dark:text-white font-semibold uppercase block">
                      Direct Principal Code Audit
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Line-by-line review of your CUDA / SIMD acceleration bottlenecks.
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 border-b border-neutral-200 dark:border-neutral-800 pb-3">
                  <Check className="w-4 h-4 text-neutral-950 dark:text-white shrink-0 mt-0.5" />
                  <div>
                    <span className="text-neutral-950 dark:text-white font-semibold uppercase block">
                      Deterministic Verification
                    </span>
                    <span className="text-neutral-500 dark:text-neutral-400">
                      Rigorous proof of convergence for highly nonlinear dynamic solvers.
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-7">
              {formSubmitted ? (
                <div className="border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-950 p-8 font-mono text-center">
                  <div className="inline-flex p-3 border border-neutral-950 dark:border-white mb-4">
                    <Check className="w-6 h-6" />
                  </div>
                  <h3 className="text-lg font-semibold uppercase text-neutral-950 dark:text-white mb-2">
                    TRANSMISSION RECEIVED [ENGAGEMENT_LOGGED]
                  </h3>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 max-w-md mx-auto mb-6">
                    Your parameters have been logged into our queue. Principal Architect Daniel will respond within 12 standard execution hours.
                  </p>
                  <button
                    onClick={() => setFormSubmitted(false)}
                    className="py-3 px-6 border border-neutral-950 dark:border-white text-xs uppercase tracking-widest hover:bg-neutral-950 hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors"
                  >
                    Submit Additional Specification
                  </button>
                </div>
              ) : (
                <form
                  onSubmit={handleFormSubmit}
                  className="border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-black p-8 space-y-6"
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="field-fullname" className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 cursor-pointer">
                        Full Name *
                      </label>
                      <input
                        id="field-fullname"
                        type="text"
                        required
                        placeholder="Dr. Alex Vance"
                        value={formData.fullName}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            fullName: e.target.value,
                          }))
                        }
                        className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-sans rounded-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="field-email" className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 cursor-pointer">
                        Corporate / Institutional Email *
                      </label>
                      <input
                        id="field-email"
                        type="email"
                        required
                        placeholder="a.vance@lab.org"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-sans rounded-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="field-org" className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 cursor-pointer">
                        Organization / Enterprise
                      </label>
                      <input
                        id="field-org"
                        type="text"
                        placeholder="AeroDynamics Research Ltd"
                        value={formData.organization}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            organization: e.target.value,
                          }))
                        }
                        className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-sans rounded-none"
                      />
                    </div>

                    <div>
                      <label htmlFor="field-domain" className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 cursor-pointer">
                        Primary Computational Domain
                      </label>
                      <select
                        id="field-domain"
                        value={formData.computeDomain}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            computeDomain: e.target.value,
                          }))
                        }
                        className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-sans rounded-none"
                      >
                        <option>Computational Fluid Dynamics</option>
                        <option>Quantum Chemistry Dynamics</option>
                        <option>Finite Element Stress Solver</option>
                        <option>Astrophysical N-Body Simulation</option>
                        <option>Custom Engine Porting / GPU</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="field-budget" className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 cursor-pointer">
                      Estimated Project Allocation Tier
                    </label>
                    <select
                      id="field-budget"
                      value={formData.estimatedBudgetTier}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          estimatedBudgetTier: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-950 dark:text-white focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-sans rounded-none"
                    >
                      <option>$10k - $25k (Proof-of-Concept Solver)</option>
                      <option>$25k - $50k (Cluster Optimization)</option>
                      <option>$50k - $150k (Custom Architecture)</option>
                      <option>$150k+ (Enterprise Infrastructure)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="field-summary" className="block font-mono text-xs uppercase tracking-widest text-neutral-500 dark:text-neutral-400 mb-2 cursor-pointer">
                      Technical Problem Specification & Constraints *
                    </label>
                    <textarea
                      id="field-summary"
                      required
                      rows={4}
                      placeholder="Outline target PDE equations, dynamic mesh sizes, current bottleneck metrics..."
                      value={formData.projectSummary}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          projectSummary: e.target.value,
                        }))
                      }
                      className="w-full bg-white dark:bg-black border border-neutral-300 dark:border-neutral-700 px-4 py-3 text-sm text-neutral-950 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-neutral-950 dark:focus:border-white transition-colors font-sans rounded-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-4 bg-neutral-950 dark:bg-white text-white dark:text-neutral-950 font-mono text-xs uppercase tracking-widest hover:bg-neutral-800 dark:hover:bg-neutral-200 transition-colors flex items-center justify-center gap-2 rounded-none"
                  >
                    <span>Transmit Engineering Inquiry</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </form>
              )}
            </div>

          </div>
        </section>

        {/* ==================================================================== */}
        {/* FOOTER                                                               */}
        {/* ==================================================================== */}
        <footer className="py-12 px-6 max-w-7xl mx-auto font-mono text-xs text-neutral-500 dark:text-neutral-400">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-neutral-200 dark:border-neutral-800 pt-8">
            <div className="flex items-center gap-4">
              <span className="font-semibold uppercase text-neutral-950 dark:text-white">
                SIMULATION WITH DANIEL
              </span>
              <span>// REVISION 1.0.0</span>
            </div>

            <div className="flex items-center gap-6 text-[11px] uppercase tracking-wider">
              <span>LATENCY: 0.2ms</span>
              <span>ENCRYPTION: AES-256</span>
              <span>SYSTEM: ONLINE</span>
            </div>
          </div>

          <div className="mt-6 text-[10px] text-neutral-400 dark:text-neutral-600 uppercase tracking-widest text-center sm:text-left">
            Strict monochrome technical interface. All calculations deterministic under standard IEEE 754 precision norms.
          </div>
        </footer>

      </div>
    </div>
  );
}