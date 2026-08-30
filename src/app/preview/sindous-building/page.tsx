"use client";

import React, { useState } from "react";
import { 
  Building2, 
  ShoppingCart, 
  Calculator, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  Filter, 
  ArrowRight,
  ShieldCheck,
  Clock,
  Sparkles
} from "lucide-react";

interface CatalogItem {
  id: string;
  name: string;
  category: "Cement" | "Steel" | "Aggregates" | "Masonry" | "Roofing";
  unit: string;
  unitPrice: number;
  minOrder: number;
  inStock: boolean;
  description: string;
}

const CATALOG: CatalogItem[] = [
  {
    id: "MAT-01",
    name: "Type 1 Portland Cement (40kg Bag)",
    category: "Cement",
    unit: "bag",
    unitPrice: 245,
    minOrder: 50,
    inStock: true,
    description: "High-grade structural Portland cement for general concrete construction and paving.",
  },
  {
    id: "MAT-02",
    name: "Pozzolan Cement (40kg Bag)",
    category: "Cement",
    unit: "bag",
    unitPrice: 230,
    minOrder: 50,
    inStock: true,
    description: "Blended hydraulic cement ideal for plastering, masonry, and reinforced concrete.",
  },
  {
    id: "MAT-03",
    name: "10mm Grade 40 Deformed Steel Bar (6m)",
    category: "Steel",
    unit: "pc",
    unitPrice: 185,
    minOrder: 30,
    inStock: true,
    description: "Standard structural rebar for stirrups and light concrete reinforcement.",
  },
  {
    id: "MAT-04",
    name: "12mm Grade 40 Deformed Steel Bar (6m)",
    category: "Steel",
    unit: "pc",
    unitPrice: 265,
    minOrder: 20,
    inStock: true,
    description: "High-tensile ribbed steel rebar for beams, columns, and structural slabs.",
  },
  {
    id: "MAT-05",
    name: "16mm Grade 40 Deformed Steel Bar (6m)",
    category: "Steel",
    unit: "pc",
    unitPrice: 470,
    minOrder: 15,
    inStock: true,
    description: "Heavy structural reinforcement rebar for major commercial foundations.",
  },
  {
    id: "MAT-06",
    name: "Concrete Hollow Blocks 4-inch (Standard)",
    category: "Masonry",
    unit: "pc",
    unitPrice: 14,
    minOrder: 200,
    inStock: true,
    description: "Load-bearing cured hollow blocks for interior walls and light partitions.",
  },
  {
    id: "MAT-07",
    name: "Concrete Hollow Blocks 6-inch (Load Bearing)",
    category: "Masonry",
    unit: "pc",
    unitPrice: 19,
    minOrder: 200,
    inStock: true,
    description: "Heavy-duty exterior boundary and perimeter structural wall hollow blocks.",
  },
  {
    id: "MAT-08",
    name: "Washed Sand (Screened Concrete Grade)",
    category: "Aggregates",
    unit: "cu.m",
    unitPrice: 950,
    minOrder: 5,
    inStock: true,
    description: "Fine screened river sand for smooth plastering and structural concrete mix.",
  },
  {
    id: "MAT-09",
    name: "Crushed Gravel (3/4-inch Standard Aggregate)",
    category: "Aggregates",
    unit: "cu.m",
    unitPrice: 1250,
    minOrder: 5,
    inStock: true,
    description: "Angular crushed gravel stone for standard concrete foundations and floor slabs.",
  },
  {
    id: "MAT-10",
    name: "Rib-Type Corrugated Roofing Sheet 0.4mm (per foot)",
    category: "Roofing",
    unit: "linear ft",
    unitPrice: 88,
    minOrder: 50,
    inStock: true,
    description: "Pre-painted galvanized steel roofing panels with superior weather resistance.",
  },
];

export default function SindousPreviewPage() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [cart, setCart] = useState<Record<string, number>>({
    "MAT-01": 100,
    "MAT-04": 50,
    "MAT-06": 500,
  });
  const [submitted, setSubmitted] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const categories = ["All", "Cement", "Steel", "Masonry", "Aggregates", "Roofing"];

  const filteredItems = CATALOG.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const updateQuantity = (id: string, qty: number) => {
    setCart((prev) => {
      const next = { ...prev };
      if (qty <= 0) {
        delete next[id];
      } else {
        next[id] = qty;
      }
      return next;
    });
  };

  const calculateSubtotal = () => {
    return Object.entries(cart).reduce((total, [id, qty]) => {
      const item = CATALOG.find((c) => c.id === id);
      return total + (item ? item.unitPrice * qty : 0);
    }, 0);
  };

  const subtotal = calculateSubtotal();
  const deliveryEst = subtotal > 0 ? (subtotal > 20000 ? 1500 : 2500) : 0;
  const estimatedTotal = subtotal + deliveryEst;

  const handleSubmitQuote = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-4 py-2 text-xs md:text-sm font-medium flex items-center justify-between shadow-inner">
        <div className="flex items-center gap-2 mx-auto md:mx-0">
          <Sparkles className="w-4 h-4 text-emerald-200 animate-pulse" />
          <span><b>SYNAPSE Interactive Concept Preview</b> — Built for Sindous Building Supplies & Construction Services</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-emerald-100 text-xs">
          <span>Live Quotation Intake Engine</span>
          <span>•</span>
          <span>Mobile Ready</span>
        </div>
      </div>

      {/* Navigation */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg leading-none text-white tracking-wide">SINDOUS BUILDING</h1>
              <p className="text-xs text-slate-400">Supplies & Construction Materials</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm text-slate-300">
            <div className="hidden sm:flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-full border border-slate-700">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Certified Structural Grade</span>
            </div>
            <a 
              href="mailto:sindousbuilding@gmail.com" 
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-lg transition shadow-lg shadow-emerald-900/40 flex items-center gap-1.5"
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Contact Sales</span>
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950 py-12 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              <Clock className="w-3.5 h-3.5" /> Instant Online Pricing & Wholesale Delivery
            </div>
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Fast, Reliable Building Materials for Your Next Project.
            </h2>
            <p className="text-slate-400 text-sm md:text-base max-w-xl">
              Browse our live catalog of structural cement, deformed steel bars, concrete masonry, and aggregates. Calculate your project cost in real-time and request an instant quotation.
            </p>
          </div>

          {/* Quick Stats / Highlights */}
          <div className="lg:col-span-5 grid grid-cols-2 gap-3">
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold text-emerald-400">100%</div>
              <div className="text-xs text-slate-400 mt-1">PNS / ASTM Standard Steel & Cement</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold text-teal-400">&lt; 15 Mins</div>
              <div className="text-xs text-slate-400 mt-1">Automated Quote Turnaround</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold text-amber-400">Bulk Tier</div>
              <div className="text-xs text-slate-400 mt-1">Volume Discounts for Contractors</div>
            </div>
            <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-xl">
              <div className="text-2xl font-bold text-blue-400">Direct Delivery</div>
              <div className="text-xs text-slate-400 mt-1">Boom Truck & Dump Truck Logistics</div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content: Catalog & Quotation Estimator */}
      <main className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Interactive Materials Catalog */}
          <div className="lg:col-span-8 space-y-6">
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search materials (e.g. Portland cement, 12mm rebar, gravel)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition"
                />
              </div>

              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
                      selectedCategory === cat
                        ? "bg-emerald-600 text-white shadow-md shadow-emerald-900/40"
                        : "bg-slate-900 text-slate-400 hover:text-[#111111] border border-slate-800"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Catalog Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredItems.map((item) => {
                const qty = cart[item.id] || 0;
                return (
                  <div 
                    key={item.id}
                    className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            {item.category}
                          </span>
                          <h3 className="font-semibold text-base text-white mt-2 leading-snug">{item.name}</h3>
                        </div>
                        <div className="text-right">
                          <div className="text-emerald-400 font-bold text-lg leading-none">₱{item.unitPrice.toLocaleString()}</div>
                          <div className="text-[10px] text-slate-400">per {item.unit}</div>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">{item.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[11px] text-slate-500">Min. order: {item.minOrder} {item.unit}s</span>
                      
                      <div className="flex items-center gap-2">
                        {qty > 0 ? (
                          <div className="flex items-center bg-slate-950 border border-slate-700 rounded-lg overflow-hidden">
                            <button
                              onClick={() => updateQuantity(item.id, qty - 10)}
                              className="px-2.5 py-1 text-slate-400 hover:text-[#111111] hover:bg-slate-800 text-xs font-bold"
                            >
                              -
                            </button>
                            <span className="px-2.5 py-1 text-xs font-semibold text-emerald-400 min-w-[36px] text-center">
                              {qty}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, qty + 10)}
                              className="px-2.5 py-1 text-slate-400 hover:text-[#111111] hover:bg-slate-800 text-xs font-bold"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => updateQuantity(item.id, item.minOrder)}
                            className="bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-[#111111] border border-emerald-500/30 text-xs font-medium px-3 py-1.5 rounded-lg transition"
                          >
                            + Add to Quote
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Live Quotation Estimator & Intake */}
          <div className="lg:col-span-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 sticky top-24 shadow-2xl">
              <div className="flex items-center gap-2.5 pb-4 border-b border-slate-800">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">Live Project Estimator</h3>
                  <p className="text-xs text-slate-400">Automated Quotation Breakdown</p>
                </div>
              </div>

              {submitted ? (
                <div className="py-8 text-center space-y-4">
                  <div className="w-12 h-12 bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="font-bold text-lg text-white">Quotation Request Submitted!</h4>
                  <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                    Thank you {customerName || "Customer"}. Your materials estimation of <b>₱{estimatedTotal.toLocaleString()}</b> has been transmitted to Sindous Building Supplies sales dispatch.
                  </p>
                  <button
                    onClick={() => setSubmitted(false)}
                    className="mt-4 text-xs text-emerald-400 hover:underline font-semibold"
                  >
                    ← Modify Quotation Items
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSubmitQuote} className="mt-4 space-y-4">
                  {/* Itemized List */}
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {Object.keys(cart).length === 0 ? (
                      <p className="text-xs text-slate-500 py-4 text-center">No items added to quotation yet. Select materials from the catalog.</p>
                    ) : (
                      Object.entries(cart).map(([id, qty]) => {
                        const item = CATALOG.find((c) => c.id === id);
                        if (!item) return null;
                        const lineTotal = item.unitPrice * qty;
                        return (
                          <div key={id} className="flex items-center justify-between text-xs bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80">
                            <div className="pr-2">
                              <div className="font-medium text-white line-clamp-1">{item.name}</div>
                              <div className="text-[10px] text-slate-400">{qty} {item.unit}s @ ₱{item.unitPrice}</div>
                            </div>
                            <div className="font-bold text-emerald-400 text-right">
                              ₱{lineTotal.toLocaleString()}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* Calculations */}
                  {Object.keys(cart).length > 0 && (
                    <div className="pt-3 border-t border-slate-800 space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-400">
                        <span>Materials Subtotal:</span>
                        <span className="font-semibold text-slate-200">₱{subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Estimated Site Delivery:</span>
                        <span className="font-semibold text-slate-200">₱{deliveryEst.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm font-bold text-white pt-2 border-t border-slate-800">
                        <span>Estimated Total:</span>
                        <span className="text-emerald-400 text-base">₱{estimatedTotal.toLocaleString()}</span>
                      </div>
                    </div>
                  )}

                  {/* Contact Inputs */}
                  <div className="space-y-2 pt-2">
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name / Contractor Name"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                    <input
                      type="tel"
                      required
                      placeholder="Contact Number / WhatsApp (e.g. 0917-xxx-xxxx)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={Object.keys(cart).length === 0}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-xs py-3 rounded-xl transition shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2"
                  >
                    <span>Request Official Quotation PDF</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  <p className="text-[10px] text-slate-500 text-center leading-tight">
                    By submitting, your request is routed directly to the Sindous sales team for price confirmation and delivery scheduling.
                  </p>
                </form>
              )}
            </div>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <p>© 2026 Sindous Building Supplies & Construction Services. Prototype preview powered by SYNAPSE Engine.</p>
      </footer>
    </div>
  );
}