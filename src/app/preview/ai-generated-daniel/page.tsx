"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import {
  Sun,
  Moon,
  ArrowRight,
  Check,
  RotateCcw,
  Play,
  Pause,
  Sliders,
  Cpu,
  Activity,
  Terminal,
  ArrowUpRight,
  Layers,
  Zap,
  ShieldCheck,
  ChevronRight,
  Info,
  Maximize2,
  RefreshCw,
  Database,
  Crosshair
} from "lucide-react";
import { LiveAgentInspector } from "@/components/preview/LiveAgentInspector";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  ax: number;
  ay: number;
  mass: number;
  density: number;
}

type PhysicsMode = "EULER_TURBULENCE" | "GRAVITATIONAL_N_BODY" | "COUPLED_WAVE";
type SolverType = "LATTICE_BOLTZMANN" | "NAVIER_STOKES_FEA" | "SPECTRAL_DNS";

interface EstimatorState {
  meshNodes: number; // 100k to 50M
  timeSteps: number; // 1,000 to 500,000
  gpuCount: number;  // 1 to 128
  solver: SolverType;
  doublePrecision: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function LandingPagePreview() {
  // --- Global Theme State ---
  const [isDark, setIsDark] = useState<boolean>(true);

  // --- Interactive Workbench State ---
  const [particleCount, setParticleCount] = useState<number>(350);
  const [viscosity, setViscosity] = useState<number>(0.98);
  const [gravity, setGravity] = useState<number>(0.15);
  const [physicsMode, setPhysicsMode] = useState<PhysicsMode>("EULER_TURBULENCE");
  const [isRunning, setIsRunning] = useState<boolean>(true);
  const [fps, setFps] = useState<number>(60);
  const [kineticEnergy, setKineticEnergy] = useState<number>(0);

  // --- Estimator State ---
  const [estimator, setEstimator] = useState<EstimatorState>({
    meshNodes: 2500000,
    timeSteps: 50000,
    gpuCount: 8,
    solver: "NAVIER_STOKES_FEA",
    doublePrecision: true,
  });

  // --- Contact Form State ---
  const [formSubmitted, setFormSubmitted] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    organization: "",
    domain: "Computational Fluid Dynamics",
    budget: "$25,000 - $50,000",
    message: "",
  });

  // Canvas Reference
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameId = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const mousePosRef = useRef<{ x: number; y: number; active: boolean }>({
    x: 0,
    y: 0,
    active: false,
  });

  // --------------------------------------------------------------------------
  // PHYSICS SIMULATION ENGINE
  // --------------------------------------------------------------------------
  const initParticles = useCallback(
    (width: number, height: number, count: number) => {
      const arr: Particle[] = [];
      for (let i = 0; i < count; i++) {
        arr.push({
          x: Math.random() * width,
          y: Math.random() * height,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          ax: 0,
          ay: 0,
          mass: 1 + Math.random() * 0.5,
          density: 1.0,
        });
      }
      particlesRef.current = arr;
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width;
        canvas.height = rect.height;
        if (particlesRef.current.length === 0) {
          initParticles(rect.width, rect.height, particleCount);
        }
      }
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => window.removeEventListener("resize", handleResize);
  }, [initParticles, particleCount]);

  // Handle count slider changes dynamically
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      initParticles(canvas.width, canvas.height, particleCount);
    }
  }, [particleCount, initParticles]);

  // Main Physics Loop
  useEffect(() => {
    let frameCount = 0;
    let lastFpsCheck = performance.now();

    const render = (now: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const dt = Math.min((now - lastTimeRef.current) / 1000, 0.033);
      lastTimeRef.current = now;

      // FPS Calculation
      frameCount++;
      if (now - lastFpsCheck >= 500) {
        setFps(Math.round((frameCount * 1000) / (now - lastFpsCheck)));
        frameCount = 0;
        lastFpsCheck = now;
      }

      if (isRunning) {
        const width = canvas.width;
        const height = canvas.height;
        const pts = particlesRef.current;
        let totalEnergy = 0;

        const mx = mousePosRef.current.x;
        const my = mousePosRef.current.y;
        const mouseActive = mousePosRef.current.active;

        for (let i = 0; i < pts.length; i++) {
          const p = pts[i];

          // Reset accelerations
          p.ax = 0;
          p.ay = gravity * 40;

          // Mouse Interactivity Force
          if (mouseActive) {
            const dx = mx - p.x;
            const dy = my - p.y;
            const distSq = dx * dx + dy * dy + 100;
            const dist = Math.sqrt(distSq);
            if (dist < 220) {
              const force = (1800 / distSq) * (physicsMode === "COUPLED_WAVE" ? -1 : 1);
              p.ax += (dx / dist) * force * 100;
              p.ay += (dy / dist) * force * 100;
            }
          }

          // Mode-specific Dynamics
          if (physicsMode === "EULER_TURBULENCE") {
            // Pseudo Vector Field Turbulence
            const scale = 0.005;
            const angle = Math.sin(p.x * scale) * Math.cos(p.y * scale) * Math.PI * 4;
            p.ax += Math.cos(angle) * 35;
            p.ay += Math.sin(angle) * 35;
          } else if (physicsMode === "GRAVITATIONAL_N_BODY") {
            // Central attractor force
            const cx = width / 2;
            const cy = height / 2;
            const dx = cx - p.x;
            const dy = cy - p.y;
            const dist = Math.sqrt(dx * dx + dy * dy) + 1;
            p.ax += (dx / dist) * 25;
            p.ay += (dy / dist) * 25;
          }

          // Velocity Verlet integration
          p.vx += p.ax * dt;
          p.vy += p.ay * dt;
          p.vx *= viscosity;
          p.vy *= viscosity;

          p.x += p.vx * dt * 60;
          p.y += p.vy * dt * 60;

          // Boundary Reflection with Energy Loss
          const damping = 0.7;
          if (p.x < 0) {
            p.x = 0;
            p.vx = -p.vx * damping;
          } else if (p.x > width) {
            p.x = width;
            p.vx = -p.vx * damping;
          }
          if (p.y < 0) {
            p.y = 0;
            p.vy = -p.vy * damping;
          } else if (p.y > height) {
            p.y = height;
            p.vy = -p.vy * damping;
          }

          // Kinetic Energy accumulator
          const vSq = p.vx * p.vx + p.vy * p.vy;
          totalEnergy += 0.5 * p.mass * vSq;
        }

        setKineticEnergy(Math.round(totalEnergy));
      }

      // Render Clear Canvas (Strict Light/Dark Palette)
      ctx.fillStyle = isDark ? "#000000" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Render Grid Lines
      ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.04)" : "rgba(0, 0, 0, 0.04)";
      ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Draw Particles & Velocity Vectors
      const pts = particlesRef.current;
      const strokeColor = isDark ? "rgba(255, 255, 255, 0.85)" : "rgba(10, 10, 10, 0.85)";
      const vectorColor = isDark ? "rgba(255, 255, 255, 0.25)" : "rgba(0, 0, 0, 0.25)";

      for (let i = 0; i < pts.length; i++) {
        const p = pts[i];

        // Draw Velocity Vector Segment
        ctx.strokeStyle = vectorColor;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + p.vx * 3, p.y + p.vy * 3);
        ctx.stroke();

        // Draw Solid Particle Node
        ctx.fillStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fill();
      }

      animFrameId.current = requestAnimationFrame(render);
    };

    animFrameId.current = requestAnimationFrame(render);
    return () => {
      if (animFrameId.current) cancelAnimationFrame(animFrameId.current);
    };
  }, [isRunning, viscosity, gravity, physicsMode, isDark]);

  // Mouse Handlers for Physics Interaction
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mousePosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      active: true,
    };
  };

  const handleMouseLeave = () => {
    mousePosRef.current.active = false;
  };

  // --------------------------------------------------------------------------
  // COMPUTE BUDGET ESTIMATOR CALCULATIONS
  // --------------------------------------------------------------------------
  const calculatedMetrics = useMemo(() => {
    const { meshNodes, timeSteps, gpuCount, solver, doublePrecision } = estimator;

    let solverMultiplier = 1.0;
    if (solver === "LATTICE_BOLTZMANN") solverMultiplier = 1.25;
    if (solver === "NAVIER_STOKES_FEA") solverMultiplier = 1.85;
    if (solver === "SPECTRAL_DNS") solverMultiplier = 2.90;

    const precisionMult = doublePrecision ? 2.0 : 1.0;

    // Total Floating Point Operations (Estimated FLOPs)
    // Baseline: 150 FLOPs per mesh node per timestep * complexity multiplier
    const totalFlops = meshNodes * timeSteps * 150 * solverMultiplier;

    // Memory Footprint in Gigabytes
    // ~168 bytes per node state vector in double precision
    const memoryGb = (meshNodes * 168 * precisionMult) / 1e9;

    // Execution Wall-Clock Time (Seconds)
    // Assume 1 GPU node yields approx 18.5 TFLOPS sustained numerical throughput
    const sustainedTflopsPerGpu = 18.5 * 1e12;
    const totalClusterCompute = gpuCount * sustainedTflopsPerGpu;
    const computeSeconds = totalFlops / totalClusterCompute;
    const computeHours = Math.max(0.01, computeSeconds / 3600);

    // Estimated Hourly Node Rate ($3.85 / GPU hour)
    const hourlyRate = 3.85;
    const totalCost = computeHours * gpuCount * hourlyRate;

    return {
      flopsTera: (totalFlops / 1e12).toFixed(2),
      flopsPeta: (totalFlops / 1e15).toFixed(4),
      memoryGb: memoryGb.toFixed(2),
      computeHours: computeHours.toFixed(2),
      estimatedCost: Math.ceil(totalCost).toLocaleString(),
    };
  }, [estimator]);

  // Form Submission Handler
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;
    setFormSubmitted(true);
  };

  // --------------------------------------------------------------------------
  // STYLES & THEMING UTILITIES (Strict Monochrome Light/Dark)
  // --------------------------------------------------------------------------
  const rootThemeClass = isDark ? "bg-black text-white" : "bg-white text-neutral-900";
  const borderClass = isDark ? "border-neutral-800" : "border-neutral-200";
  const mutedTextClass = isDark ? "text-neutral-400" : "text-neutral-600";
  const subCardBg = isDark ? "bg-neutral-950" : "bg-neutral-50";
  const hoverBg = isDark ? "hover:bg-neutral-900" : "hover:bg-neutral-100";
  const activeBtnBg = isDark ? "bg-white text-black" : "bg-black text-white";
  const inactiveBtnBg = isDark ? "bg-neutral-900 text-neutral-300" : "bg-neutral-100 text-neutral-700";

  return (
    <div className={`min-h-screen font-sans selection:bg-neutral-500 selection:text-white transition-colors duration-200 ${rootThemeClass}`}>
      
      {/* ==================================================================== */}
      {/* 1. HEADER / NAVIGATION BAR                                           */}
      {/* ==================================================================== */}
      <header className={`sticky top-0 z-50 backdrop-blur-md bg-opacity-90 border-b ${borderClass} transition-colors duration-200`}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          
          {/* Brand & Monospace Technical Identifier */}
          <div className="flex items-center space-x-4">
            <a href="#" className="font-bold tracking-tighter text-lg uppercase font-sans">
              Simulation With Daniel
            </a>
            <span className={`hidden sm:inline-block font-mono text-[10px] uppercase tracking-widest px-2 py-0.5 border ${borderClass} ${mutedTextClass}`}>
              [SYS.LOC: GLOBAL // LATENCY: 0.18ms]
            </span>
          </div>

          {/* Minimalist Navigation Links */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-mono uppercase tracking-widest">
            <a href="#workbench" className={`transition-colors ${mutedTextClass} hover:text-current`}>
              01. Workbench
            </a>
            <a href="#capabilities" className={`transition-colors ${mutedTextClass} hover:text-current`}>
              02. Capabilities
            </a>
            <a href="#estimator" className={`transition-colors ${mutedTextClass} hover:text-current`}>
              03. Estimator
            </a>
            <a href="#consultation" className={`transition-colors ${mutedTextClass} hover:text-current`}>
              04. Contact
            </a>
          </nav>

          {/* Stateful Light/Dark Theme Switcher */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsDark(!isDark)}
              className={`flex items-center space-x-2 text-xs font-mono border px-3 py-1.5 transition-all ${borderClass} ${hoverBg}`}
              aria-label="Toggle Theme Mode"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
              <span className="uppercase tracking-widest">{isDark ? "Light Mode" : "Dark Mode"}</span>
            </button>
            <a
              href="#consultation"
              className={`hidden sm:flex items-center space-x-1.5 text-xs font-mono uppercase tracking-widest px-4 py-1.5 border ${borderClass} ${activeBtnBg} transition-all`}
            >
              <span>Initiate Project</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* ==================================================================== */}
      {/* 2. EDITORIAL HERO SECTION                                            */}
      {/* ==================================================================== */}
      <section className={`border-b ${borderClass} py-20 md:py-32`}>
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Metadata Top Ribbon */}
          <div className="flex flex-wrap items-center gap-3 font-mono text-xs uppercase tracking-widest mb-8 text-neutral-500">
            <span className={`px-2 py-1 border ${borderClass}`}>APPLIED COMPUTATIONAL PHYSICS</span>
            <span className="hidden sm:inline">—</span>
            <span>HIGH-PERFORMANCE NUMERICAL MODELING</span>
            <span className="hidden sm:inline">—</span>
            <span>C++ / CUDA / WEBGPU RUNTIMES</span>
          </div>

          {/* Main Editorial Headline */}
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight uppercase leading-[0.95] max-w-6xl mb-8">
            Deterministic Physical Simulation & HPC Architecture.
          </h1>

          {/* Subtitle & Value Proposition */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end pt-4">
            <p className={`md:col-span-8 text-lg sm:text-xl font-normal leading-relaxed ${mutedTextClass}`}>
              Rigorous, first-principles numerical modeling, continuum mechanics, dynamic particle solvers, and custom CUDA acceleration. Built for aerospace engineering, semiconductor transport analysis, and complex fluid-structure interaction.
            </p>
            <div className="md:col-span-4 flex flex-col sm:flex-row md:flex-col gap-3">
              <a
                href="#workbench"
                className={`w-full flex items-center justify-between font-mono text-xs uppercase tracking-widest px-6 py-4 border ${borderClass} ${activeBtnBg} transition-all group`}
              >
                <span>Launch Particle Simulator</span>
                <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
              </a>
              <a
                href="#estimator"
                className={`w-full flex items-center justify-between font-mono text-xs uppercase tracking-widest px-6 py-4 border ${borderClass} ${hoverBg} transition-all`}
              >
                <span>Calculate Compute Budget</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Key Metric Strip (Tabular Monospaced Numbers) */}
          <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 pt-16 mt-16 border-t ${borderClass}`}>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">10^8+</div>
              <div className={`font-mono text-xs uppercase tracking-widest mt-1 ${mutedTextClass}`}>
                Max Mesh Resolution
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">99.98%</div>
              <div className={`font-mono text-xs uppercase tracking-widest mt-1 ${mutedTextClass}`}>
                Energy Conservation Precision
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">&lt; 0.15ms</div>
              <div className={`font-mono text-xs uppercase tracking-widest mt-1 ${mutedTextClass}`}>
                Per-Timestep Kernel Latency
              </div>
            </div>
            <div>
              <div className="font-mono text-2xl sm:text-3xl font-bold tabular-nums">FP64 / INT8</div>
              <div className={`font-mono text-xs uppercase tracking-widest mt-1 ${mutedTextClass}`}>
                Hybrid Precision Support
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 3. INTERACTIVE PHYSICS WORKBENCH SIMULATOR                             */}
      {/* ==================================================================== */}
      <section id="workbench" className={`border-b ${borderClass} py-20`}>
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Section Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 pb-6 border-b border-neutral-800">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
                [ 01 // Interactive Physics Engine ]
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight">
                Continuum Field Workbench
              </h2>
            </div>
            <p className={`mt-4 md:mt-0 font-mono text-xs uppercase tracking-wider max-w-md ${mutedTextClass}`}>
              Real-time Eulerian vector turbulence and particle dynamic simulation running in WebAssembly canvas buffer. Click and drag on canvas to apply vector field forces.
            </p>
          </div>

          {/* Simulator Canvas + Control Deck */}
          <div className={`border ${borderClass} grid grid-cols-1 lg:grid-cols-12`}>
            
            {/* Interactive Canvas Stage */}
            <div className="lg:col-span-8 relative min-h-[420px] bg-black overflow-hidden flex flex-col justify-between">
              
              {/* Telemetry Overlay */}
              <div className="absolute top-4 left-4 right-4 flex justify-between items-start pointer-events-none z-10 font-mono text-xs tracking-widest">
                <div className="bg-black/80 backdrop-blur border border-neutral-800 p-2 text-white">
                  <div>SIM.STATUS: {isRunning ? "EXECUTING_KERNEL" : "PAUSED"}</div>
                  <div>FPS: <span className="tabular-nums text-white font-bold">{fps}</span></div>
                  <div>PARTICLES: <span className="tabular-nums text-white font-bold">{particleCount}</span></div>
                </div>
                <div className="bg-black/80 backdrop-blur border border-neutral-800 p-2 text-white text-right">
                  <div>SYSTEM_MODE: {physicsMode}</div>
                  <div>KINETIC_E: <span className="tabular-nums text-white font-bold">{kineticEnergy.toLocaleString()} J</span></div>
                  <div>PRECISION: IEEE-754 FP32</div>
                </div>
              </div>

              {/* Main Dynamic Canvas */}
              <canvas
                ref={canvasRef}
                onMouseMove={handleMouseMove}
                onMouseLeave={handleMouseLeave}
                className="w-full h-full min-h-[420px] cursor-crosshair block"
              />

              {/* Canvas Bottom Instruction Strip */}
              <div className={`border-t ${borderClass} p-3 font-mono text-[11px] uppercase tracking-widest flex items-center justify-between ${isDark ? 'bg-neutral-950 text-neutral-400' : 'bg-neutral-100 text-neutral-600'}`}>
                <span className="flex items-center space-x-2">
                  <Crosshair className="w-3.5 h-3.5" />
                  <span>Interactive Vector Input: Active</span>
                </span>
                <span>Canvas Resolution: Dynamic 1:1</span>
              </div>
            </div>

            {/* Workbench Parameter Controls */}
            <div className={`lg:col-span-4 border-t lg:border-t-0 lg:border-l ${borderClass} p-6 flex flex-col justify-between ${subCardBg}`}>
              
              <div className="space-y-6">
                <div className="flex items-center justify-between pb-3 border-b border-neutral-800">
                  <span className="font-mono text-xs font-bold uppercase tracking-widest flex items-center space-x-2">
                    <Sliders className="w-4 h-4" />
                    <span>Solver Parameters</span>
                  </span>
                  <button
                    onClick={() => {
                      const canvas = canvasRef.current;
                      if (canvas) initParticles(canvas.width, canvas.height, particleCount);
                    }}
                    className={`font-mono text-[10px] uppercase tracking-widest border px-2 py-1 flex items-center space-x-1 ${borderClass} ${hoverBg}`}
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset Field</span>
                  </button>
                </div>

                {/* Physics Mode Selector */}
                <div>
                  <label className={`block font-mono text-xs uppercase tracking-widest mb-2 ${mutedTextClass}`}>
                    Field Dynamic Model
                  </label>
                  <div className="grid grid-cols-1 gap-2 font-mono text-xs">
                    {(["EULER_TURBULENCE", "GRAVITATIONAL_N_BODY", "COUPLED_WAVE"] as PhysicsMode[]).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => setPhysicsMode(mode)}
                        className={`text-left px-3 py-2 border uppercase tracking-wider transition-all text-xs ${
                          physicsMode === mode ? `${activeBtnBg} ${borderClass}` : `${borderClass} ${hoverBg}`
                        }`}
                      >
                        {mode.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Particle Density Slider */}
                <div>
                  <div className="flex justify-between font-mono text-xs uppercase tracking-widest mb-2">
                    <span className={mutedTextClass}>Particle Count</span>
                    <span className="tabular-nums font-bold">{particleCount}</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={particleCount}
                    onChange={(e) => setParticleCount(Number(e.target.value))}
                    className="w-full accent-current bg-neutral-700 h-1 cursor-pointer"
                  />
                </div>

                {/* Viscosity Damping Slider */}
                <div>
                  <div className="flex justify-between font-mono text-xs uppercase tracking-widest mb-2">
                    <span className={mutedTextClass}>Viscous Damping Factor</span>
                    <span className="tabular-nums font-bold">{viscosity.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.90"
                    max="0.999"
                    step="0.005"
                    value={viscosity}
                    onChange={(e) => setViscosity(Number(e.target.value))}
                    className="w-full accent-current bg-neutral-700 h-1 cursor-pointer"
                  />
                </div>

                {/* Gravity Vector Magnitude Slider */}
                <div>
                  <div className="flex justify-between font-mono text-xs uppercase tracking-widest mb-2">
                    <span className={mutedTextClass}>External Field Force</span>
                    <span className="tabular-nums font-bold">{gravity.toFixed(2)} G</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="0.5"
                    step="0.02"
                    value={gravity}
                    onChange={(e) => setGravity(Number(e.target.value))}
                    className="w-full accent-current bg-neutral-700 h-1 cursor-pointer"
                  />
                </div>
              </div>

              {/* Execution Toggle Control */}
              <div className="pt-6 border-t border-neutral-800 mt-6">
                <button
                  onClick={() => setIsRunning(!isRunning)}
                  className={`w-full py-3 border font-mono text-xs uppercase tracking-widest flex items-center justify-center space-x-2 transition-all ${
                    isRunning ? `${inactiveBtnBg} ${borderClass}` : `${activeBtnBg} ${borderClass}`
                  }`}
                >
                  {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isRunning ? "Halt Integrator" : "Execute Integrator"}</span>
                </button>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 4. CORE CAPABILITIES GRID SECTION                                   */}
      {/* ==================================================================== */}
      <section id="capabilities" className={`border-b ${borderClass} py-20`}>
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 pb-6 border-b border-neutral-800">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
                [ 02 // Core Competencies ]
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight">
                Domain Architecture & Numerical Specializations
              </h2>
            </div>
            <div className={`font-mono text-xs uppercase tracking-widest ${mutedTextClass} mt-4 md:mt-0`}>
              SYNAPSE NUMERICAL KERNELS V4.8
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            
            {/* Capability 1 */}
            <div className={`border ${borderClass} p-8 flex flex-col justify-between ${subCardBg} ${hoverBg} transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
                  <span>[ CAPABILITY_01 ]</span>
                  <span>CFD / NS</span>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  Computational Fluid Dynamics
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${mutedTextClass}`}>
                  Navier-Stokes solvers for compressible, incompressible, and hypersonic regimes. Boundary layer discretization, LES turbulence modeling, and shock-capturing schemes.
                </p>
              </div>
              <div className={`pt-4 border-t ${borderClass} font-mono text-[11px] text-neutral-500`}>
                <code>FORMULA: ∂ρ/∂t + ∇·(ρu) = 0</code>
              </div>
            </div>

            {/* Capability 2 */}
            <div className={`border ${borderClass} p-8 flex flex-col justify-between ${subCardBg} ${hoverBg} transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
                  <span>[ CAPABILITY_02 ]</span>
                  <span>FEA / SOLID</span>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  Finite Element Mechanics
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${mutedTextClass}`}>
                  Nonlinear structural analysis, hyperelastic strain formulations, dynamic contact algorithms, and multi-axis fatigue life prognosis under stochastic load profiles.
                </p>
              </div>
              <div className={`pt-4 border-t ${borderClass} font-mono text-[11px] text-neutral-500`}>
                <code>FORMULA: [K]{"{u}"} = {"{F_ext}"} - {"{F_int}"}</code>
              </div>
            </div>

            {/* Capability 3 */}
            <div className={`border ${borderClass} p-8 flex flex-col justify-between ${subCardBg} ${hoverBg} transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
                  <span>[ CAPABILITY_03 ]</span>
                  <span>MD / MOLECULAR</span>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  Molecular Dynamics & Transport
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${mutedTextClass}`}>
                  Atomistic particle trajectories, Lennard-Jones potential evaluations, quantum thermal conductivity, and electronic band transport modeling in nanoscale semiconductors.
                </p>
              </div>
              <div className={`pt-4 border-t ${borderClass} font-mono text-[11px] text-neutral-500`}>
                <code>FORMULA: m_i (d²r_i/dt²) = -∇_i V</code>
              </div>
            </div>

            {/* Capability 4 */}
            <div className={`border ${borderClass} p-8 flex flex-col justify-between ${subCardBg} ${hoverBg} transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
                  <span>[ CAPABILITY_04 ]</span>
                  <span>CUDA / HPC</span>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  Custom CUDA & C++ Kernels
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${mutedTextClass}`}>
                  Bespoke GPU acceleration routines bypassing commercial off-the-shelf software bottlenecks. Custom memory layout optimization, warp shuffling, and MPI clustering.
                </p>
              </div>
              <div className={`pt-4 border-t ${borderClass} font-mono text-[11px] text-neutral-500`}>
                <code>TARGET: NVIDIA H100 / B200 SXM</code>
              </div>
            </div>

            {/* Capability 5 */}
            <div className={`border ${borderClass} p-8 flex flex-col justify-between ${subCardBg} ${hoverBg} transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
                  <span>[ CAPABILITY_05 ]</span>
                  <span>THERMAL / COUPLED</span>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  Thermal-Structural Conjugate
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${mutedTextClass}`}>
                  Fully coupled thermal-mechanical and fluid-structure interaction (FSI) solvers for high-temperature aerospace turbines, battery thermal runaway, and optics.
                </p>
              </div>
              <div className={`pt-4 border-t ${borderClass} font-mono text-[11px] text-neutral-500`}>
                <code>COUPLING: Implicit Monolithic</code>
              </div>
            </div>

            {/* Capability 6 */}
            <div className={`border ${borderClass} p-8 flex flex-col justify-between ${subCardBg} ${hoverBg} transition-all`}>
              <div>
                <div className="flex justify-between items-start mb-6 font-mono text-xs uppercase tracking-widest text-neutral-500">
                  <span>[ CAPABILITY_06 ]</span>
                  <span>VERIFICATION</span>
                </div>
                <h3 className="text-xl font-bold uppercase tracking-tight mb-3">
                  Verification & Validation (V&V)
                </h3>
                <p className={`text-sm leading-relaxed mb-6 ${mutedTextClass}`}>
                  Rigorous grid convergence testing using Richardson extrapolation, code verification against analytical benchmarks, and physical wind-tunnel correlation.
                </p>
              </div>
              <div className={`pt-4 border-t ${borderClass} font-mono text-[11px] text-neutral-500`}>
                <code>STANDARD: ASME V&V 20-2009</code>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 5. TABULAR COMPUTE BUDGET ESTIMATOR & CALCULATOR                    */}
      {/* ==================================================================== */}
      <section id="estimator" className={`border-b ${borderClass} py-20`}>
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 pb-6 border-b border-neutral-800">
            <div>
              <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
                [ 03 // Compute Cost & Scaling Model ]
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold uppercase tracking-tight">
                Tabular Compute Budget Estimator
              </h2>
            </div>
            <p className={`mt-4 md:mt-0 font-mono text-xs uppercase tracking-wider max-w-md ${mutedTextClass}`}>
              Deterministic hardware allocation model based on grid node density, time-stepping integration schemes, and parallel cluster topology.
            </p>
          </div>

          <div className={`border ${borderClass} grid grid-cols-1 lg:grid-cols-12`}>
            
            {/* Interactive Form Controls (Left Side) */}
            <div className="lg:col-span-7 p-8 space-y-8">
              
              {/* Mesh Resolution Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-mono text-xs uppercase tracking-widest font-bold">
                    Spatial Mesh Resolution (Grid Nodes $N$)
                  </label>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {(estimator.meshNodes / 1e6).toFixed(2)} M Nodes
                  </span>
                </div>
                <input
                  type="range"
                  min="100000"
                  max="20000000"
                  step="100000"
                  value={estimator.meshNodes}
                  onChange={(e) => setEstimator({ ...estimator, meshNodes: Number(e.target.value) })}
                  className="w-full accent-current bg-neutral-700 h-1.5 cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[10px] text-neutral-500 mt-1">
                  <span>100K Nodes (Coarse)</span>
                  <span>5M Nodes (Detailed)</span>
                  <span>20M Nodes (Direct Numerical)</span>
                </div>
              </div>

              {/* Timesteps Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-mono text-xs uppercase tracking-widest font-bold">
                    Temporal Duration (Integration Steps $T$)
                  </label>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {estimator.timeSteps.toLocaleString()} Steps
                  </span>
                </div>
                <input
                  type="range"
                  min="1000"
                  max="250000"
                  step="1000"
                  value={estimator.timeSteps}
                  onChange={(e) => setEstimator({ ...estimator, timeSteps: Number(e.target.value) })}
                  className="w-full accent-current bg-neutral-700 h-1.5 cursor-pointer"
                />
                <div className="flex justify-between font-mono text-[10px] text-neutral-500 mt-1">
                  <span>1,000 (Transient)</span>
                  <span>100,000 (Cyclic)</span>
                  <span>250,000 (Steady State Convergence)</span>
                </div>
              </div>

              {/* Hardware GPU Node Allocation */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="font-mono text-xs uppercase tracking-widest font-bold">
                    Parallel Compute Nodes (H100 80GB Tensor Core)
                  </label>
                  <span className="font-mono text-sm font-bold tabular-nums">
                    {estimator.gpuCount} GPU Nodes
                  </span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="64"
                  step="1"
                  value={estimator.gpuCount}
                  onChange={(e) => setEstimator({ ...estimator, gpuCount: Number(e.target.value) })}
                  className="w-full accent-current bg-neutral-700 h-1.5 cursor-pointer"
                />
              </div>

              {/* Solver Algorithm Selection */}
              <div>
                <label className={`block font-mono text-xs uppercase tracking-widest mb-3 ${mutedTextClass}`}>
                  Numerical Integration Kernel
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: "LATTICE_BOLTZMANN", label: "Lattice Boltzmann", mult: "1.2x" },
                    { id: "NAVIER_STOKES_FEA", label: "Implicit FEA / NS", mult: "1.85x" },
                    { id: "SPECTRAL_DNS", label: "Spectral Direct DNS", mult: "2.90x" },
                  ].map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setEstimator({ ...estimator, solver: s.id as SolverType })}
                      className={`p-3 text-left border font-mono text-xs flex flex-col justify-between transition-all ${
                        estimator.solver === s.id ? `${activeBtnBg} ${borderClass}` : `${borderClass} ${hoverBg}`
                      }`}
                    >
                      <span className="font-bold">{s.label}</span>
                      <span className="text-[10px] opacity-70 mt-2">Complexity: {s.mult}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Precision Mode Toggle */}
              <div className="flex items-center justify-between pt-4 border-t border-neutral-800">
                <div>
                  <div className="font-mono text-xs uppercase tracking-widest font-bold">
                    IEEE-754 FP64 Double Precision
                  </div>
                  <div className={`font-mono text-[11px] ${mutedTextClass}`}>
                    Enforce strict 64-bit floating point precision (Doubles memory requirements)
                  </div>
                </div>
                <button
                  onClick={() => setEstimator({ ...estimator, doublePrecision: !estimator.doublePrecision })}
                  className={`px-4 py-2 font-mono text-xs border uppercase tracking-widest transition-all ${
                    estimator.doublePrecision ? activeBtnBg : hoverBg
                  } ${borderClass}`}
                >
                  {estimator.doublePrecision ? "ENABLED" : "DISABLED"}
                </button>
              </div>

            </div>

            {/* Calculated Output Summary Card (Right Side) */}
            <div className={`lg:col-span-5 border-t lg:border-t-0 lg:border-l ${borderClass} p-8 flex flex-col justify-between ${subCardBg}`}>
              <div>
                <div className="flex items-center space-x-2 font-mono text-xs font-bold uppercase tracking-widest pb-4 border-b border-neutral-800">
                  <Cpu className="w-4 h-4" />
                  <span>Estimated Execution Telemetry</span>
                </div>

                <div className="space-y-6 pt-6">
                  {/* Metric 1 */}
                  <div className="flex justify-between items-baseline">
                    <span className={`font-mono text-xs uppercase tracking-widest ${mutedTextClass}`}>
                      Total Workload (FLOPs)
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums">
                      {calculatedMetrics.flopsPeta} PFLOPs
                    </span>
                  </div>

                  {/* Metric 2 */}
                  <div className="flex justify-between items-baseline">
                    <span className={`font-mono text-xs uppercase tracking-widest ${mutedTextClass}`}>
                      RAM / VRAM Footprint
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums">
                      {calculatedMetrics.memoryGb} GB
                    </span>
                  </div>

                  {/* Metric 3 */}
                  <div className="flex justify-between items-baseline">
                    <span className={`font-mono text-xs uppercase tracking-widest ${mutedTextClass}`}>
                      Est. Cluster Execution Time
                    </span>
                    <span className="font-mono text-xl font-bold tabular-nums">
                      {calculatedMetrics.computeHours} Hours
                    </span>
                  </div>

                  {/* Line Separator */}
                  <div className="border-t border-neutral-800 pt-6">
                    <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-1">
                      Estimated Compute Cost Breakdown
                    </div>
                    <div className="text-4xl sm:text-5xl font-bold font-mono tracking-tight tabular-nums">
                      ${calculatedMetrics.estimatedCost}
                    </div>
                    <div className={`font-mono text-[11px] mt-2 ${mutedTextClass}`}>
                      *Calculated at standard cluster compute rate of $3.85 / GPU Node / Hour. Excludes data ingress/egress setup fee.
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-8 mt-8 border-t border-neutral-800">
                <a
                  href="#consultation"
                  className={`w-full py-4 border font-mono text-xs uppercase tracking-widest flex items-center justify-center space-x-2 ${activeBtnBg} transition-all`}
                >
                  <span>Reserve Cluster Capacity</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 6. TECHNICAL METRIC COMPARISON TABLE                                */}
      {/* ==================================================================== */}
      <section className={`border-b ${borderClass} py-20`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="mb-12">
            <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
              [ 04 // Benchmark Metrics ]
            </div>
            <h2 className="text-3xl font-bold uppercase tracking-tight">
              Solver Performance vs Standard Off-The-Shelf Tools
            </h2>
          </div>

          <div className={`border ${borderClass} overflow-x-auto`}>
            <table className="w-full text-left font-mono text-xs border-collapse">
              <thead>
                <tr className={`border-b ${borderClass} ${subCardBg} uppercase tracking-widest`}>
                  <th className="p-4 border-r border-neutral-800">Evaluation Metric</th>
                  <th className="p-4 border-r border-neutral-800">Standard Legacy Solvers</th>
                  <th className="p-4 bg-neutral-900 text-white font-bold">Synapse Engine (Daniel)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800">
                <tr>
                  <td className="p-4 font-bold border-r border-neutral-800">Parallel Scaling Efficiency</td>
                  <td className={`p-4 border-r border-neutral-800 ${mutedTextClass}`}>Degrades at &gt; 128 Cores (~45%)</td>
                  <td className="p-4 font-bold">Linear Scaling to 2,048 CUDA Nodes (94.2%)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold border-r border-neutral-800">Grid Memory Overhead</td>
                  <td className={`p-4 border-r border-neutral-800 ${mutedTextClass}`}>~450 Bytes / Mesh Node</td>
                  <td className="p-4 font-bold">168 Bytes / Node (Custom Compact Struct)</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold border-r border-neutral-800">Custom Kernel Injectability</td>
                  <td className={`p-4 border-r border-neutral-800 ${mutedTextClass}`}>Restricted API / Black-box DLL</td>
                  <td className="p-4 font-bold">Full Native C++/CUDA Source Access</td>
                </tr>
                <tr>
                  <td className="p-4 font-bold border-r border-neutral-800">Precision Verification</td>
                  <td className={`p-4 border-r border-neutral-800 ${mutedTextClass}`}>Single-precision default</td>
                  <td className="p-4 font-bold">IEEE-754 Strict FP64 / Mixed FP16 Tensor</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ==================================================================== */}
      {/* 7. CONSULTATION INQUIRY FORM                                         */}
      {/* ==================================================================== */}
      <section id="consultation" className={`border-b ${borderClass} py-20`}>
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
            
            {/* Left Info Column */}
            <div className="lg:col-span-5 flex flex-col justify-between">
              <div>
                <div className="font-mono text-xs uppercase tracking-widest text-neutral-500 mb-2">
                  [ 05 // Technical Engagement ]
                </div>
                <h2 className="text-3xl sm:text-5xl font-bold uppercase tracking-tight mb-6">
                  Initiate Physics Simulation Project.
                </h2>
                <p className={`text-base leading-relaxed mb-8 ${mutedTextClass}`}>
                  Direct technical consultation for custom physics engine development, high-density mesh generation, or HPC runtime optimization.
                </p>

                <div className="space-y-4 font-mono text-xs uppercase tracking-widest">
                  <div className="flex items-center space-x-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Direct NDA & Proprietary Code Retention</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Source Code Delivery with Full License</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Check className="w-4 h-4 text-emerald-500" />
                    <span>Comprehensive Verification & Validation Report</span>
                  </div>
                </div>
              </div>

              <div className={`mt-12 p-6 border ${borderClass} font-mono text-xs ${subCardBg}`}>
                <div className="text-neutral-500 mb-1 uppercase tracking-widest">DIRECT COMMUNICATOR</div>
                <div className="font-bold text-sm">daniel@simulationwithdaniel.com</div>
                <div className="text-neutral-500 mt-3 uppercase tracking-widest">SERVER TIMESTAMP</div>
                <div className="tabular-nums">{new Date().toISOString()}</div>
              </div>
            </div>

            {/* Right Form Column */}
            <div className="lg:col-span-7">
              <div className={`border ${borderClass} p-8 ${subCardBg}`}>
                
                {formSubmitted ? (
                  <div className="py-16 text-center space-y-4 font-mono">
                    <div className="inline-flex p-3 border border-neutral-800 rounded-full mb-2">
                      <Check className="w-8 h-8 text-emerald-500" />
                    </div>
                    <h3 className="text-2xl font-bold uppercase tracking-tight">INQUIRY DISPATCHED</h3>
                    <p className={`text-xs uppercase tracking-widest max-w-md mx-auto ${mutedTextClass}`}>
                      Reference ID: SIM-{(Math.random() * 89999 + 10000).toFixed(0)} // Technical response window: 24 Hours.
                    </p>
                    <button
                      onClick={() => setFormSubmitted(false)}
                      className={`mt-6 px-6 py-3 border font-mono text-xs uppercase tracking-widest ${activeBtnBg}`}
                    >
                      Submit Secondary Spec
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className={`block font-mono text-xs uppercase tracking-widest mb-2 ${mutedTextClass}`}>
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          placeholder="Dr. Evelyn Vance"
                          className={`w-full p-3 font-mono text-xs bg-transparent border ${borderClass} focus:outline-none focus:border-neutral-400`}
                        />
                      </div>
                      <div>
                        <label className={`block font-mono text-xs uppercase tracking-widest mb-2 ${mutedTextClass}`}>
                          Institutional Email *
                        </label>
                        <input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          placeholder="e.vance@blackmesa.org"
                          className={`w-full p-3 font-mono text-xs bg-transparent border ${borderClass} focus:outline-none focus:border-neutral-400`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div>
                        <label className={`block font-mono text-xs uppercase tracking-widest mb-2 ${mutedTextClass}`}>
                          Organization / Enterprise
                        </label>
                        <input
                          type="text"
                          value={formData.organization}
                          onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                          placeholder="Aerospace Propulsion Dynamics"
                          className={`w-full p-3 font-mono text-xs bg-transparent border ${borderClass} focus:outline-none focus:border-neutral-400`}
                        />
                      </div>
                      <div>
                        <label className={`block font-mono text-xs uppercase tracking-widest mb-2 ${mutedTextClass}`}>
                          Primary Modeling Domain
                        </label>
                        <select
                          value={formData.domain}
                          onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                          className={`w-full p-3 font-mono text-xs bg-transparent border ${borderClass} focus:outline-none focus:border-neutral-400 ${isDark ? 'bg-black text-white' : 'bg-white text-black'}`}
                        >
                          <option>Computational Fluid Dynamics</option>
                          <option>Finite Element Mechanics</option>
                          <option>Molecular Dynamics</option>
                          <option>Custom CUDA Engine Architecture</option>
                          <option>Thermal-Structural Coupling</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className={`block font-mono text-xs uppercase tracking-widest mb-2 ${mutedTextClass}`}>
                        Project Specification / Governing Equations Brief
                      </label>
                      <textarea
                        rows={4}
                        value={formData.message}
                        onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                        placeholder="Detail simulation scale, boundary conditions, target mesh resolution, and deadline..."
                        className={`w-full p-3 font-mono text-xs bg-transparent border ${borderClass} focus:outline-none focus:border-neutral-400`}
                      />
                    </div>

                    <button
                      type="submit"
                      className={`w-full py-4 border font-mono text-xs uppercase tracking-widest flex items-center justify-center space-x-2 ${activeBtnBg} transition-all`}
                    >
                      <span>Transmit Project Specification</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </form>
                )}

              </div>
            </div>

          </div>

        </div>
      </section>

      {/* ==================================================================== */}
      {/* 8. MINIMALIST SWISS FOOTER                                           */}
      {/* ==================================================================== */}
      <footer className="py-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between font-mono text-xs text-neutral-500 uppercase tracking-widest">
          <div>
            © {new Date().getFullYear()} SIMULATION WITH DANIEL. ALL RIGHTS RESERVED.
          </div>
          <div className="mt-4 md:mt-0 flex items-center space-x-6">
            <span>SWISS MINIMALISM // ARCHITECTURE</span>
            <span>https://simulationwithdaniel.com</span>
          </div>
        </div>
      </footer>

    </div>
  );
}