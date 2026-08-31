'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, RotateCcw, ArrowRight, Check, 
  Sun, Moon, Sliders, Activity, Database, GitBranch
} from 'lucide-react';

export default function SimulationWithDanielPreviewPage() {
  // Theme state: 'dark' by default, switchable to pure 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  // Interactive Simulation State
  const [isRunning, setIsRunning] = useState(true);
  const [particlesCount, setParticlesCount] = useState(75);
  const [gravity, setGravity] = useState(0.2);
  const [speed, setSpeed] = useState(1.0);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Calculator State
  const [computeHours, setComputeHours] = useState(250);
  const [nodes, setNodes] = useState(8);
  const [tier, setTier] = useState<'standard' | 'advanced' | 'enterprise'>('advanced');

  // Booking Form State
  const [bookingForm, setBookingForm] = useState({ name: 'Daniel', email: 'simulationwithdaniel784@gmail.com', brief: '' });
  const [submitted, setSubmitted] = useState(false);

  // Simulation Canvas Engine (Monochrome & High Precision)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 700);
    let height = (canvas.height = 360);

    interface Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
    }

    const particles: Particle[] = Array.from({ length: particlesCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * (height / 2),
      vx: (Math.random() - 0.5) * speed * 2.5,
      vy: (Math.random() - 0.5) * speed * 2.5,
      radius: Math.random() * 2 + 1.5,
    }));

    const isDark = theme === 'dark';

    const render = () => {
      // Clear with solid background
      ctx.fillStyle = isDark ? '#000000' : '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Subtle technical grid
      ctx.strokeStyle = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 32) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 32) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Physics update & connections
      particles.forEach((p, idx) => {
        if (isRunning) {
          p.vy += gravity * 0.08;
          p.x += p.vx;
          p.y += p.vy;

          if (p.x - p.radius < 0 || p.x + p.radius > width) p.vx *= -0.92;
          if (p.y + p.radius > height) {
            p.y = height - p.radius;
            p.vy *= -0.8;
          }
          if (p.y - p.radius < 0) {
            p.y = p.radius;
            p.vy *= -0.92;
          }
        }

        // Precision line connections
        for (let j = idx + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p.x - p2.x, p.y - p2.y);
          if (dist < 64) {
            const alpha = (1 - dist / 64) * (isDark ? 0.35 : 0.25);
            ctx.strokeStyle = isDark ? `rgba(255, 255, 255, ${alpha})` : `rgba(0, 0, 0, ${alpha})`;
            ctx.lineWidth = 0.75;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }

        // Particle nodes
        ctx.fillStyle = isDark ? '#ffffff' : '#000000';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => cancelAnimationFrame(animationFrameId);
  }, [isRunning, particlesCount, gravity, speed, theme]);

  // Pricing calculation
  const multiplier = tier === 'standard' ? 1.0 : tier === 'advanced' ? 1.4 : 2.0;
  const estimatedCost = Math.round((computeHours * 10 + nodes * 150) * multiplier);

  const isDark = theme === 'dark';

  return (
    <div className={`min-h-screen font-sans transition-colors duration-200 ${
      isDark ? 'bg-black text-white' : 'bg-white text-neutral-900'
    }`}>
      {/* Top Header */}
      <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${
        isDark ? 'bg-black/90 border-neutral-800' : 'bg-white/90 border-neutral-200'
      }`}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm tracking-widest uppercase font-bold">
              Simulation With Daniel
            </span>
            <span className={`text-[10px] font-mono px-2 py-0.5 border ${
              isDark ? 'border-neutral-800 text-neutral-400' : 'border-neutral-200 text-neutral-600'
            }`}>
              v1.0
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-mono tracking-wider uppercase">
            <a href="#simulator" className="hover:opacity-60 transition-opacity">Workbench</a>
            <a href="#capabilities" className="hover:opacity-60 transition-opacity">Capabilities</a>
            <a href="#calculator" className="hover:opacity-60 transition-opacity">Estimator</a>
            <a href="#consultation" className="hover:opacity-60 transition-opacity">Inquiry</a>
          </nav>

          <div className="flex items-center gap-4">
            {/* Minimalist Theme Toggle */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`p-2 border text-xs transition-colors ${
                isDark ? 'border-neutral-800 hover:bg-neutral-900 text-white' : 'border-neutral-200 hover:bg-neutral-100 text-black'
              }`}
              aria-label="Toggle Theme"
            >
              {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>

            <a
              href="#consultation"
              className={`text-xs font-mono uppercase tracking-wider px-4 py-2 border transition-all ${
                isDark 
                  ? 'bg-white text-black border-white hover:bg-neutral-200' 
                  : 'bg-black text-white border-black hover:bg-neutral-800'
              }`}
            >
              Contact
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20 border-b border-neutral-800/40">
        <div className="max-w-3xl space-y-6">
          <p className={`text-xs font-mono tracking-widest uppercase ${
            isDark ? 'text-neutral-400' : 'text-neutral-500'
          }`}>
            Applied Computational Modeling & Systems Engineering
          </p>

          <h1 className="text-4xl sm:text-6xl font-medium tracking-tight leading-[1.08]">
            Numerical Simulation & Interactive Physics Pipelines
          </h1>

          <p className={`text-base leading-relaxed max-w-2xl font-normal ${
            isDark ? 'text-neutral-400' : 'text-neutral-600'
          }`}>
            High-performance mathematical modeling, dynamic particle solvers, and custom digital twin architectures built for engineering research and enterprise systems.
          </p>

          <div className="pt-4 flex flex-wrap items-center gap-4">
            <a
              href="#simulator"
              className={`text-xs font-mono uppercase tracking-wider px-6 py-3 border transition-all flex items-center gap-2 ${
                isDark 
                  ? 'bg-white text-black border-white hover:bg-neutral-200' 
                  : 'bg-black text-white border-black hover:bg-neutral-800'
              }`}
            >
              <span>Explore Workbench</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </a>

            <a
              href="#calculator"
              className={`text-xs font-mono uppercase tracking-wider px-6 py-3 border transition-all ${
                isDark 
                  ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-300' 
                  : 'border-neutral-300 hover:bg-neutral-100 text-neutral-700'
              }`}
            >
              Compute Estimator
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Physics Workbench */}
      <section id="simulator" className={`py-20 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="max-w-6xl mx-auto px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p className={`text-xs font-mono tracking-widest uppercase ${
                isDark ? 'text-neutral-400' : 'text-neutral-500'
              }`}>
                Interactive Module
              </p>
              <h2 className="text-2xl sm:text-3xl font-medium tracking-tight mt-1">
                Real-Time Physics Dynamics Simulator
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsRunning(!isRunning)}
                className={`text-xs font-mono uppercase px-3 py-1.5 border flex items-center gap-1.5 transition-colors ${
                  isDark ? 'border-neutral-800 hover:bg-neutral-900' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                {isRunning ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                <span>{isRunning ? "Pause" : "Resume"}</span>
              </button>
              <button
                onClick={() => { setParticlesCount(75); setGravity(0.2); setSpeed(1.0); }}
                className={`text-xs font-mono uppercase px-3 py-1.5 border flex items-center gap-1.5 transition-colors ${
                  isDark ? 'border-neutral-800 hover:bg-neutral-900' : 'border-neutral-200 hover:bg-neutral-100'
                }`}
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          </div>

          {/* Canvas Viewport */}
          <div className={`border overflow-hidden relative ${isDark ? 'border-neutral-800 bg-black' : 'border-neutral-200 bg-white'}`}>
            <canvas ref={canvasRef} className="w-full h-[360px] block" />
            <div className={`absolute bottom-3 left-3 text-[10px] font-mono uppercase px-2.5 py-1 border ${
              isDark ? 'bg-black/90 border-neutral-800 text-neutral-400' : 'bg-white/90 border-neutral-200 text-neutral-600'
            }`}>
              Nodes: {particlesCount} | G: {gravity.toFixed(2)} | V: {speed.toFixed(1)}x
            </div>
          </div>

          {/* Sliders */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className={`border p-4 space-y-2 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex justify-between text-xs font-mono">
                <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Particle Density</span>
                <span>{particlesCount}</span>
              </div>
              <input
                type="range" min="15" max="150" value={particlesCount}
                onChange={(e) => setParticlesCount(Number(e.target.value))}
                className="w-full accent-current cursor-pointer"
              />
            </div>

            <div className={`border p-4 space-y-2 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex justify-between text-xs font-mono">
                <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Gravity Vector</span>
                <span>{gravity.toFixed(2)} G</span>
              </div>
              <input
                type="range" min="-0.4" max="1.0" step="0.05" value={gravity}
                onChange={(e) => setGravity(Number(e.target.value))}
                className="w-full accent-current cursor-pointer"
              />
            </div>

            <div className={`border p-4 space-y-2 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <div className="flex justify-between text-xs font-mono">
                <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Velocity Multiplier</span>
                <span>{speed.toFixed(1)}x</span>
              </div>
              <input
                type="range" min="0.2" max="2.5" step="0.1" value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full accent-current cursor-pointer"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Core Capabilities Section */}
      <section id="capabilities" className={`py-20 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-2">
            <p className={`text-xs font-mono tracking-widest uppercase ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              Engineering Capabilities
            </p>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
              Specialized Computational Domains
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`border p-6 space-y-4 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <span className="font-mono text-xs text-neutral-500">01 / DYNAMICS</span>
              <h3 className="text-lg font-medium tracking-tight">Fluid & Kinetic Modeling</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Navier-Stokes solvers and finite element kinetic simulations tailored for mechanical, aerospace, and civil engineering verification.
              </p>
            </div>

            <div className={`border p-6 space-y-4 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <span className="font-mono text-xs text-neutral-500">02 / TELEMETRY</span>
              <h3 className="text-lg font-medium tracking-tight">Digital Twin Architecture</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Continuous data ingestion from field sensors and IoT nodes mapped into real-time state space estimation models.
              </p>
            </div>

            <div className={`border p-6 space-y-4 ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
              <span className="font-mono text-xs text-neutral-500">03 / STOCHASTICS</span>
              <h3 className="text-lg font-medium tracking-tight">Monte Carlo Optimization</h3>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                Large-scale multi-variable stochastic distributions for uncertainty quantification and risk minimization.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compute Estimator Section */}
      <section id="calculator" className={`py-20 border-b ${isDark ? 'border-neutral-800' : 'border-neutral-200'}`}>
        <div className="max-w-6xl mx-auto px-6 space-y-12">
          <div className="max-w-2xl space-y-2">
            <p className={`text-xs font-mono tracking-widest uppercase ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              Budgeting & Sizing
            </p>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
              Simulation Compute Estimator
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Compute Hours / Month</span>
                  <span className="font-bold">{computeHours} h</span>
                </div>
                <input
                  type="range" min="50" max="1000" step="25" value={computeHours}
                  onChange={(e) => setComputeHours(Number(e.target.value))}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Cluster Node Count</span>
                  <span className="font-bold">{nodes} Nodes</span>
                </div>
                <input
                  type="range" min="2" max="32" value={nodes}
                  onChange={(e) => setNodes(Number(e.target.value))}
                  className="w-full accent-current cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <span className={`text-xs font-mono block ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Model Complexity Tier
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(['standard', 'advanced', 'enterprise'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTier(t)}
                      className={`py-2 text-xs font-mono uppercase border transition-all ${
                        tier === t
                          ? (isDark ? 'bg-white text-black border-white font-bold' : 'bg-black text-white border-black font-bold')
                          : (isDark ? 'border-neutral-800 hover:bg-neutral-900 text-neutral-400' : 'border-neutral-200 hover:bg-neutral-100 text-neutral-600')
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Price Box */}
            <div className={`border p-8 flex flex-col justify-between space-y-6 ${
              isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-neutral-50'
            }`}>
              <div className="space-y-2">
                <span className="text-xs font-mono text-neutral-500 uppercase tracking-wider block">
                  Estimated Project Baseline
                </span>
                <div className="text-3xl sm:text-4xl font-mono font-medium tracking-tight">
                  PHP {estimatedCost.toLocaleString()}
                </div>
                <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                  Includes dedicated solver runtime, source code delivery, and 30-day post-handover warranty.
                </p>
              </div>

              <a
                href="#consultation"
                className={`w-full py-3 text-xs font-mono uppercase tracking-wider text-center border block transition-all ${
                  isDark 
                    ? 'bg-white text-black border-white hover:bg-neutral-200' 
                    : 'bg-black text-white border-black hover:bg-neutral-800'
                }`}
              >
                Inquire With Specifications
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Consultation Section */}
      <section id="consultation" className="py-20 max-w-6xl mx-auto px-6">
        <div className="max-w-2xl mx-auto space-y-8">
          <div className="space-y-2 text-center">
            <p className={`text-xs font-mono tracking-widest uppercase ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}>
              Direct Contact
            </p>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight">
              Schedule a Technical Consultation
            </h2>
            <p className={`text-xs max-w-md mx-auto ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
              Discuss computational specifications, boundary conditions, and deployment targets directly with Daniel.
            </p>
          </div>

          {submitted ? (
            <div className={`border p-8 text-center space-y-2 ${
              isDark ? 'border-neutral-800 bg-neutral-950' : 'border-neutral-200 bg-neutral-50'
            }`}>
              <p className="font-mono text-sm font-bold uppercase tracking-wider">Inquiry Received</p>
              <p className={`text-xs ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                A calendar invitation and docket have been queued for simulationwithdaniel784@gmail.com.
              </p>
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); setSubmitted(true); }}
              className="space-y-4 text-xs font-mono"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Client Name</label>
                  <input
                    type="text" required defaultValue="Daniel"
                    className={`w-full border px-3 py-2.5 outline-none font-sans text-xs ${
                      isDark ? 'bg-black border-neutral-800 text-white focus:border-white' : 'bg-white border-neutral-300 text-black focus:border-black'
                    }`}
                  />
                </div>
                <div className="space-y-1">
                  <label className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Email Address</label>
                  <input
                    type="email" required defaultValue="simulationwithdaniel784@gmail.com"
                    className={`w-full border px-3 py-2.5 outline-none font-sans text-xs ${
                      isDark ? 'bg-black border-neutral-800 text-white focus:border-white' : 'bg-white border-neutral-300 text-black focus:border-black'
                    }`}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className={isDark ? 'text-neutral-400' : 'text-neutral-600'}>Simulation Scope & Notes</label>
                <textarea
                  rows={3} defaultValue="Real-time numerical simulation, interactive parameter controls, and clean minimal architecture."
                  className={`w-full border px-3 py-2.5 outline-none font-sans text-xs ${
                    isDark ? 'bg-black border-neutral-800 text-white focus:border-white' : 'bg-white border-neutral-300 text-black focus:border-black'
                  }`}
                />
              </div>

              <button
                type="submit"
                className={`w-full py-3.5 text-xs font-mono uppercase tracking-wider border transition-all ${
                  isDark 
                    ? 'bg-white text-black border-white hover:bg-neutral-200' 
                    : 'bg-black text-white border-black hover:bg-neutral-800'
                }`}
              >
                Submit Consultation Request
              </button>
            </form>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className={`border-t py-12 text-xs font-mono ${
        isDark ? 'border-neutral-800 text-neutral-500' : 'border-neutral-200 text-neutral-500'
      }`}>
        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <span>&copy; {new Date().getFullYear()} Simulation With Daniel</span>
          <span>Applied Computational Lab</span>
        </div>
      </footer>
    </div>
  );
}
