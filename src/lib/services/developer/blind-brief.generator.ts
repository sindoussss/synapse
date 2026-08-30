import { BlindBenchmarkBriefRecord } from "../../repositories/blind-benchmark.repository";

export class BlindBriefGenerator {
  getBlindBenchmarkSuite(): BlindBenchmarkBriefRecord[] {
    return [
  {
    "id": "BLIND-01",
    "industry": "Boutique Luxury Hotel",
    "companyName": "The Luminary Grand Historic Hotel",
    "targetAudience": "Luxury travelers, heritage tourists, high-end weekend escapists",
    "primaryConversionGoal": "Drive direct luxury suite bookings and bespoke dining reservations",
    "brandPersonality": "Opulent heritage, refined quiet luxury, intimate hospitality",
    "requiredSections": [
      "Suites & Heritage Chambers",
      "Fine Dining & Hearth",
      "Concierge Curations",
      "Direct Reservation"
    ],
    "functionalRequirements": [
      "Suite availability picker",
      "Direct reservation rate calculator",
      "Concierge inquiry form"
    ],
    "contentConstraints": [
      "Do not invent fake Michelin stars or false celebrity endorsements"
    ],
    "accessibilityRequirements": [
      "High contrast ratios against dark velvet tones",
      "Explicit calendar aria-labels"
    ],
    "responsiveRequirements": [
      "Fluid mobile stack with fixed quick-book drawer"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'heritage yet cutting-edge modern'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#c5a880",
      "secondary": "#533e2d",
      "background": "#1a1614",
      "accent": "#e2c9a5"
    },
    "typographyStyle": "Classic editorial serif with subtle tracking and understated metadata",
    "layoutArchetype": "Bespoke hospitality showcase with staggered full-bleed editorial imagery"
  },
  {
    "id": "BLIND-02",
    "industry": "Independent Maritime Law Firm",
    "companyName": "Vanguard & Sterling Maritime Law",
    "targetAudience": "Shipowners, marine insurers, port operators, cargo charterers",
    "primaryConversionGoal": "Initiate emergency maritime dispute consults and arbitration intake",
    "brandPersonality": "Authoritative, unflinching, sovereign legal precision, maritime expertise",
    "requiredSections": [
      "Admiralty & Marine Claims",
      "Arbitration Precedents",
      "Attorneys & Proctors",
      "Emergency Legal Hotline"
    ],
    "functionalRequirements": [
      "Jurisdiction emergency triage selector",
      "Arbitration intake form",
      "Legal practice area filter"
    ],
    "contentConstraints": [
      "Do not invent non-existent precedent settlements or win-rate percentages"
    ],
    "accessibilityRequirements": [
      "WCAG AAA compliant text contrast",
      "Fully keyboard navigable consultation forms"
    ],
    "responsiveRequirements": [
      "Dense multi-column layout collapsing into scannable emergency contact cards on mobile"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must display dense legal disclaimers and maritime statutes without cluttering the initial consultation funnel.",
    "hasIncompleteData": true,
    "incompleteDataFields": [
      "Exact historical settlement dollar amounts",
      "Private client list"
    ],
    "colorPalette": {
      "primary": "#0369a1",
      "secondary": "#1e293b",
      "background": "#082f49",
      "accent": "#38bdf8"
    },
    "typographyStyle": "Authoritative transitional serif headings with highly legible sans-serif legal body",
    "layoutArchetype": "Structured 2-column legal dossier layout with prominent 24/7 admiralty dispatch callout"
  },
  {
    "id": "BLIND-03",
    "industry": "Specialty Coffee Roaster",
    "companyName": "Blackwood Artisanal Coffee Roasters",
    "targetAudience": "Coffee connoisseurs, specialty cafes, wholesale subscription buyers",
    "primaryConversionGoal": "Sell small-batch origin subscriptions and wholesale cafe partner beans",
    "brandPersonality": "Earth-toned, craft-obsessed, direct-trade transparent, sensory",
    "requiredSections": [
      "Single-Origin Offerings",
      "Roast Elevation & Processing",
      "Subscription Builder",
      "Wholesale Inquiries"
    ],
    "functionalRequirements": [
      "Interactive flavor profile radar filter",
      "Subscription delivery cadence selector",
      "Wholesale bean calculator"
    ],
    "contentConstraints": [
      "Accurately declare farm micro-lots without fabricating non-existent elevation claims"
    ],
    "accessibilityRequirements": [
      "Screen reader labels on sensory flavor slider",
      "Semantic list markup on bag selections"
    ],
    "responsiveRequirements": [
      "Horizontal product scroller on mobile, 4-column card grid on desktop"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'deeply artisanal but effortlessly high-volume scalable'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#d97706",
      "secondary": "#78350f",
      "background": "#1c1917",
      "accent": "#f59e0b"
    },
    "typographyStyle": "Craft-oriented humanist grotesque with expressive roast-level numbers",
    "layoutArchetype": "Sensory coffee catalog grid with interactive subscription checkout builder"
  },
  {
    "id": "BLIND-04",
    "industry": "Naval & Marine Engineering",
    "companyName": "Triton Marine Propulsion Systems",
    "targetAudience": "Shipyard directors, naval architects, defense procurement officers",
    "primaryConversionGoal": "Generate custom vessel propulsion RFQs and CAD engineering downloads",
    "brandPersonality": "Hydrodynamic, sub-sea industrial, heavy metallurgy, Lloyd's Register grade",
    "requiredSections": [
      "Propulsion Architecture",
      "Cavitation Benchmarks",
      "Vessel Type Integration",
      "Request Engineering Spec"
    ],
    "functionalRequirements": [
      "Knot/BHP power requirement estimator",
      "Spec sheet download gate",
      "Engineering CAD submission form"
    ],
    "contentConstraints": [
      "Do not invent classified naval defense contracts or false efficiency percentages"
    ],
    "accessibilityRequirements": [
      "High contrast engineering charts",
      "Keyboard accessible technical spec tables"
    ],
    "responsiveRequirements": [
      "Complex power curve tables scrollable horizontally on mobile with frozen row headers"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must balance deep naval engineering blueprints with an instant 30-second RFQ generation flow.",
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#0ea5e9",
      "secondary": "#334155",
      "background": "#020617",
      "accent": "#38bdf8"
    },
    "typographyStyle": "Technical DIN-inspired sans-serif with monospace metric readouts",
    "layoutArchetype": "High-density technical blueprint grid with sticky specification estimator"
  },
  {
    "id": "BLIND-05",
    "industry": "Classical Private Preparatory Academy",
    "companyName": "Oakridge Classical Preparatory Academy",
    "targetAudience": "Prospective parents, gifted scholars, academic benefactors",
    "primaryConversionGoal": "Book private headmaster campus tours and submit admissions applications",
    "brandPersonality": "Academic rigor, storied tradition, moral cultivation, distinguished legacy",
    "requiredSections": [
      "Classical Quadrivium Curriculum",
      "Faculty & House System",
      "Admissions & Tuition Estimator",
      "Schedule Campus Tour"
    ],
    "functionalRequirements": [
      "Grade-level curriculum accordion",
      "Tuition & financial aid calculator",
      "Campus tour scheduling form"
    ],
    "contentConstraints": [
      "Do not claim non-existent Ivy League admission guarantee percentages"
    ],
    "accessibilityRequirements": [
      "Clear focus rings on admissions intake steps",
      "Accessible calendar inputs"
    ],
    "responsiveRequirements": [
      "Balanced classical column grid on desktop collapsing to stepped admission steps on mobile"
    ],
    "isAmbiguous": false,
    "hasDesignTension": false,
    "hasIncompleteData": true,
    "incompleteDataFields": [
      "Exact endowment size",
      "Alumni private giving figures"
    ],
    "colorPalette": {
      "primary": "#15803d",
      "secondary": "#1e3a8a",
      "background": "#052e16",
      "accent": "#4ade80"
    },
    "typographyStyle": "Distinguished academic serif titles with clean bookish proportions",
    "layoutArchetype": "Stately collegiate 2-column layout with admissions application sidebar"
  },
  {
    "id": "BLIND-06",
    "industry": "Heavy Agricultural Equipment",
    "companyName": "Titan Ag Machinery & Harvesters",
    "targetAudience": "Commercial grain farmers, ranch operators, agricultural cooperatives",
    "primaryConversionGoal": "Drive combine harvester demo bookings and equipment lease financing inquiries",
    "brandPersonality": "Rugged durability, high-acreage productivity, soil-tested resilience",
    "requiredSections": [
      "Harvesters & Tractors",
      "Acreage Throughput Specs",
      "Financing & Lease Calculator",
      "Dealer Service Locator"
    ],
    "functionalRequirements": [
      "HP and crop type machinery filter",
      "Monthly harvest lease estimator",
      "Demo request intake"
    ],
    "contentConstraints": [
      "Declare real engine specifications without fabricating false yield increases"
    ],
    "accessibilityRequirements": [
      "Large touch targets for outdoor tablet use (minimum 48px)",
      "High contrast under sunlight"
    ],
    "responsiveRequirements": [
      "Mobile-first dealer map locator with sticky quote action button"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'heavy-duty dirt-ready yet software-connected high tech'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#eab308",
      "secondary": "#3f6212",
      "background": "#14532d",
      "accent": "#facc15"
    },
    "typographyStyle": "Heavy industrial slab-serif headings paired with clean mechanical sans",
    "layoutArchetype": "High-contrast rugged machinery grid with dynamic equipment spec comparison"
  },
  {
    "id": "BLIND-07",
    "industry": "Electronic Music & Arts Festival",
    "companyName": "Solaris Sonic Arts & Electronic Music Festival",
    "targetAudience": "Electronic music lovers, avant-garde art attendees, festival travelers",
    "primaryConversionGoal": "Sell tiered multi-day festival passes and VIP camping packages",
    "brandPersonality": "Cinematic, neon nocturnal, sonic energy, boundary-pushing audiovisual",
    "requiredSections": [
      "Artist Lineup & Stages",
      "Immersive Art Pavilions",
      "Tiered Pass Selector",
      "Travel & Camping Guide"
    ],
    "functionalRequirements": [
      "Stage timetable interactive switcher",
      "Tiered ticket checkout modal",
      "Camping package cost calculator"
    ],
    "contentConstraints": [
      "Do not list unconfirmed headliners or fake artist endorsements"
    ],
    "accessibilityRequirements": [
      "Color contrast safe neon accents",
      "Aria live regions for schedule updates"
    ],
    "responsiveRequirements": [
      "Swipeable stage timetable on mobile with persistent cart bar"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must convey high-voltage festival energy without causing visual clutter or breaking ticket purchase clarity.",
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#a855f7",
      "secondary": "#ec4899",
      "background": "#09090b",
      "accent": "#c084fc"
    },
    "typographyStyle": "Expressive futuristic display typography with tight geometric tracking",
    "layoutArchetype": "High-energy staggered grid with live timetable tabs and interactive ticket tier selector"
  },
  {
    "id": "BLIND-08",
    "industry": "Solid Hardwood Furniture Manufacturer",
    "companyName": "Heritage Oak Woodcraft & Fine Furniture",
    "targetAudience": "Interior designers, homeowners, luxury hospitality furnishers",
    "primaryConversionGoal": "Generate custom dining table commission quotes and catalog requests",
    "brandPersonality": "Generational craftsmanship, natural wood grains, mortise-and-tenon permanence",
    "requiredSections": [
      "Masterwork Tables",
      "Wood Species & Live-Edge Slabs",
      "Custom Commission Builder",
      "Wood Care & Warranty"
    ],
    "functionalRequirements": [
      "Wood species visualizer (Walnut, Oak, Maple)",
      "Dimension & seating capacity estimator",
      "Custom build inquiry form"
    ],
    "contentConstraints": [
      "State true wood origin without claiming non-existent sustainability badges"
    ],
    "accessibilityRequirements": [
      "Descriptive alt tags for wood grain textures",
      "Keyboard navigable custom table builder"
    ],
    "responsiveRequirements": [
      "Fluid visual gallery with responsive dimension slider"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'warm and deeply traditional, yet minimal enough for modern architect clients'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#b45309",
      "secondary": "#451a03",
      "background": "#1c1917",
      "accent": "#d97706"
    },
    "typographyStyle": "Warm humanist serif paired with generous whitespace",
    "layoutArchetype": "Editorial craftsmanship portfolio with interactive table configuration tool"
  },
  {
    "id": "BLIND-09",
    "industry": "Enterprise Cybersecurity & Threat Intel",
    "companyName": "CipherGuard Threat Intelligence Lab",
    "targetAudience": "CISOs, Security Operations Leads, DevSecOps Directors",
    "primaryConversionGoal": "Book zero-trust threat audits and schedule red-team adversary simulations",
    "brandPersonality": "Zero-trust vigilance, cryptographic precision, tactical resilience",
    "requiredSections": [
      "Threat Vectors & Zero-Day Defense",
      "Red-Team Exercises",
      "Breach Exposure Calculator",
      "Emergency Incident Response"
    ],
    "functionalRequirements": [
      "Enterprise breach risk assessment calculator",
      "Threat vector filter",
      "24/7 SOC incident escalation form"
    ],
    "contentConstraints": [
      "Do not invent fake government security clearance accreditations"
    ],
    "accessibilityRequirements": [
      "High contrast dark mode",
      "Accessible incident escalation forms with clear error boundaries"
    ],
    "responsiveRequirements": [
      "Terminal diagnostic displays optimized for mobile viewing without horizontal overflow"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must convey serious tactical cybersecurity rigor without resorting to clichéd matrix green text or fake hacking animations.",
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#10b981",
      "secondary": "#064e3b",
      "background": "#022c22",
      "accent": "#34d399"
    },
    "typographyStyle": "Technical monospace data headers combined with crisp corporate sans",
    "layoutArchetype": "Tactical telemetry dashboard with interactive breach assessment tool"
  },
  {
    "id": "BLIND-10",
    "industry": "Memorial & Funeral Planning Services",
    "companyName": "Serenity Haven Memorials & Cremation Services",
    "targetAudience": "Grieving families, advance-planning individuals, estate executors",
    "primaryConversionGoal": "Provide transparent advance planning estimates and 24/7 bereavement support",
    "brandPersonality": "Deeply respectful, dignified, transparent pricing, tranquil solace",
    "requiredSections": [
      "Traditional Memorials & Solace",
      "Advance Care Planning",
      "Transparent Cost Calculator",
      "24/7 Family Care Intake"
    ],
    "functionalRequirements": [
      "Memorial package cost estimator with itemized breakdown",
      "Advance planning guide download",
      "Immediate bereavement intake form"
    ],
    "contentConstraints": [
      "Ensure 100% price transparency without hiding mandatory disclaimers"
    ],
    "accessibilityRequirements": [
      "High legibility for elderly family members (minimum 16px body, 1.6 line height)",
      "Calm low-motion interface"
    ],
    "responsiveRequirements": [
      "Prominent, non-intrusive 24/7 call button accessible across all mobile screens"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to be 'peaceful and deeply comforting, but straightforward about financial costs'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#64748b",
      "secondary": "#334155",
      "background": "#0f172a",
      "accent": "#94a3b8"
    },
    "typographyStyle": "Tranquil book serif typography with generous line height and gentle contrast",
    "layoutArchetype": "Calming single-column flow with transparent memorial planning calculator"
  },
  {
    "id": "BLIND-11",
    "industry": "Contemporary Regional Art Museum",
    "companyName": "The Modernist Arts Pavilion",
    "targetAudience": "Art patrons, regional visitors, educators, museum members",
    "primaryConversionGoal": "Sell timed-entry exhibition tickets and museum annual memberships",
    "brandPersonality": "Avant-garde, curatorial clarity, institutional prestige, cultural dialogue",
    "requiredSections": [
      "Current Exhibitions",
      "Permanent Collections",
      "Timed Entry Ticketing",
      "Museum Membership Tiers"
    ],
    "functionalRequirements": [
      "Exhibition date filter & calendar",
      "Timed-entry ticket booking widget",
      "Membership level selector"
    ],
    "contentConstraints": [
      "Do not list unacquired artworks or fake donor names"
    ],
    "accessibilityRequirements": [
      "Screen reader descriptions for artwork media",
      "High contrast exhibition schedules"
    ],
    "responsiveRequirements": [
      "Fluid masonry exhibition grid with sticky booking bar on mobile"
    ],
    "isAmbiguous": false,
    "hasDesignTension": false,
    "hasIncompleteData": true,
    "incompleteDataFields": [
      "Exact museum annual visitor headcount",
      "Private benefactor list"
    ],
    "colorPalette": {
      "primary": "#ffffff",
      "secondary": "#71717a",
      "background": "#09090b",
      "accent": "#e4e4e7"
    },
    "typographyStyle": "Minimalist neo-grotesque with expansive tracking and asymmetric headlines",
    "layoutArchetype": "Curatorial white-space grid with interactive exhibition schedule tabs"
  },
  {
    "id": "BLIND-12",
    "industry": "Commercial Solar & Renewable Energy",
    "companyName": "AeroSun Commercial Solar Grid",
    "targetAudience": "Industrial facility managers, commercial real estate developers, sustainability officers",
    "primaryConversionGoal": "Generate rooftop solar feasibility assessments and commercial PPA quotes",
    "brandPersonality": "High-yield engineering, grid-tied reliability, corporate sustainability",
    "requiredSections": [
      "Commercial Solar Solutions",
      "Megawatt Production Specs",
      "Solar ROI & Tax Credit Calculator",
      "Feasibility Audit Request"
    ],
    "functionalRequirements": [
      "Square-footage to kWh solar yield calculator",
      "Tax credit (ITC) savings estimator",
      "Rooftop audit intake form"
    ],
    "contentConstraints": [
      "Provide real solar irradiance modeling logic without guaranteeing unrealistic 100% bill elimination"
    ],
    "accessibilityRequirements": [
      "Accessible chart labels and range sliders",
      "Keyboard-focusable audit steps"
    ],
    "responsiveRequirements": [
      "Side-by-side ROI calculator collapsing into tabbed steps on mobile"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'scientific and heavily data-driven, yet visually inspiring for sustainability leads'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#eab308",
      "secondary": "#0284c7",
      "background": "#082f49",
      "accent": "#facc15"
    },
    "typographyStyle": "Modern technical sans-serif with bold energy metric callouts",
    "layoutArchetype": "Data-forward industrial layout with interactive solar payback calculator"
  },
  {
    "id": "BLIND-13",
    "industry": "Global Freight Forwarder",
    "companyName": "TransGlobal Logistics Forwarding",
    "targetAudience": "Importers, exporters, manufacturing logistics coordinators",
    "primaryConversionGoal": "Generate instant multi-modal ocean/air freight rate quotes and customs clearance inquiries",
    "brandPersonality": "Global speed, customs certainty, intermodal logistics resilience",
    "requiredSections": [
      "Air & Ocean Freight",
      "Customs Brokerage",
      "Live Route Rate Estimator",
      "Book Cargo Dispatch"
    ],
    "functionalRequirements": [
      "Incoterm & container size rate estimator",
      "Live port-to-port route selector",
      "Customs quote intake"
    ],
    "contentConstraints": [
      "Do not guarantee impossible zero-delay customs clearance times"
    ],
    "accessibilityRequirements": [
      "Clear text labels on form inputs",
      "Table headers with explicit scope attributes"
    ],
    "responsiveRequirements": [
      "Condensed route rate comparison table with horizontal scroll indicator on mobile"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must display complex international tariff codes and customs regulations without slowing down fast quote requests.",
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#2563eb",
      "secondary": "#1e40af",
      "background": "#0f172a",
      "accent": "#60a5fa"
    },
    "typographyStyle": "High-density functional sans-serif with clear numeric data columns",
    "layoutArchetype": "Intermodal logistics dashboard with port route estimator and quick-booking form"
  },
  {
    "id": "BLIND-14",
    "industry": "Pediatric & Family Dental Studio",
    "companyName": "SmileCraft Pediatric & Family Dentistry",
    "targetAudience": "Parents, young families, children requiring gentle dental care",
    "primaryConversionGoal": "Schedule new patient cleanings and pediatric dental consultations",
    "brandPersonality": "Warm, anxiety-free, playful yet clinically rigorous, family-centered",
    "requiredSections": [
      "Pediatric Care & Cleanings",
      "Orthodontics & Braces",
      "Insurance Checker",
      "Book First Visit"
    ],
    "functionalRequirements": [
      "Child age dental milestone selector",
      "Accepted insurance network search",
      "Online appointment booking form"
    ],
    "contentConstraints": [
      "Do not promise completely pain-free procedures in absolute terms"
    ],
    "accessibilityRequirements": [
      "Warm color contrast meeting WCAG AA standards",
      "Simple language for easy reading"
    ],
    "responsiveRequirements": [
      "Direct tap-to-book floating action button on mobile screens"
    ],
    "isAmbiguous": false,
    "hasDesignTension": false,
    "hasIncompleteData": true,
    "incompleteDataFields": [
      "Exact patient lifetime count",
      "Unverified dental award rankings"
    ],
    "colorPalette": {
      "primary": "#06b6d4",
      "secondary": "#0891b2",
      "background": "#ecfeff",
      "accent": "#22d3ee"
    },
    "typographyStyle": "Friendly, rounded humanist sans-serif with large readable text",
    "layoutArchetype": "Approachable card-based layout with interactive appointment scheduler"
  },
  {
    "id": "BLIND-15",
    "industry": "Luxury Watch Restoration",
    "companyName": "Chronos Atelier Haute Horlogerie Restoration",
    "targetAudience": "Vintage watch collectors, auction houses, luxury timepiece owners",
    "primaryConversionGoal": "Solicit vintage movement overhaul inquiries and master watchmaker appraisals",
    "brandPersonality": "Sub-millimeter horological precision, museum-grade conservation, Swiss watchmaking mastery",
    "requiredSections": [
      "Movement Restoration & Overhaul",
      "Polishing & Case Conservation",
      "Restoration Cost Estimator",
      "Insured Shipping Intake"
    ],
    "functionalRequirements": [
      "Watch complication restoration cost estimator",
      "Caliber condition intake checklist",
      "Insured courier booking form"
    ],
    "contentConstraints": [
      "Do not claim official brand service center status if acting as independent master watchmaker"
    ],
    "accessibilityRequirements": [
      "High contrast macro photography presentation",
      "Accessible caliber selection dropdowns"
    ],
    "responsiveRequirements": [
      "Fluid showcase of mechanical micro-components with detailed spec tables"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'exclusive and ultra-luxury, but completely clear about technical movement services'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#d4af37",
      "secondary": "#524419",
      "background": "#121212",
      "accent": "#f3e5ab"
    },
    "typographyStyle": "Refined Swiss horological serif paired with technical caliber metadata",
    "layoutArchetype": "High-craft dark horology showcase with interactive movement restoration estimator"
  },
  {
    "id": "BLIND-16",
    "industry": "Specialty Commercial Insurance Brokerage",
    "companyName": "Ironclad Risk & Commercial Insurance Partners",
    "targetAudience": "Mid-market enterprise owners, CFOs, general contractors, tech founders",
    "primaryConversionGoal": "Request commercial general liability, D&O, and cyber insurance risk evaluations",
    "brandPersonality": "Risk-mitigating, fiduciary integrity, institutional protection",
    "requiredSections": [
      "Commercial Coverage Solutions",
      "Industry Risk Profiles",
      "Policy Premium Estimator",
      "Request Risk Assessment"
    ],
    "functionalRequirements": [
      "Industry payroll & revenue risk calculator",
      "Multi-line coverage package selector",
      "Confidential risk inquiry form"
    ],
    "contentConstraints": [
      "Do not quote exact binding premium prices before formal underwriter review"
    ],
    "accessibilityRequirements": [
      "High-contrast form controls with explicit error indicators",
      "Keyboard accessible policy selectors"
    ],
    "responsiveRequirements": [
      "Clean linear assessment flow on mobile devices with sticky help button"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must display rigorous underwriting questionnaires without overwhelming the user during initial quote requests.",
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#1e3a8a",
      "secondary": "#334155",
      "background": "#0f172a",
      "accent": "#3b82f6"
    },
    "typographyStyle": "Corporate fiduciary typography with structured financial table layouts",
    "layoutArchetype": "Institutional risk advisory layout with interactive policy estimator"
  },
  {
    "id": "BLIND-17",
    "industry": "Independent Feature Film Production",
    "companyName": "Cinematic Nexus Film Studios",
    "targetAudience": "Film distributors, streaming buyers, film festival programmers, co-producers",
    "primaryConversionGoal": "Screen feature film trailers, view production slate, and submit co-production inquiries",
    "brandPersonality": "Cinematic depth, auteur vision, narrative immersion, festival-awarded craft",
    "requiredSections": [
      "Feature Slate & Releases",
      "Director Profiles & Vision",
      "Production Capabilities",
      "Co-Production Inquiries"
    ],
    "functionalRequirements": [
      "Interactive trailer reel showcase",
      "Production slate filter by genre and stage",
      "Co-production budget intake"
    ],
    "contentConstraints": [
      "Only list verified festival selections and active production titles"
    ],
    "accessibilityRequirements": [
      "Captioned video placeholders",
      "High contrast cinematic dark theme"
    ],
    "responsiveRequirements": [
      "Full-bleed video card grid with fluid mobile playback controls"
    ],
    "isAmbiguous": true,
    "ambiguityDescription": "Wants the site to feel 'like a cinematic theatre screening room, while remaining easy for corporate distributors to navigate'.",
    "hasDesignTension": false,
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#dc2626",
      "secondary": "#7f1d1d",
      "background": "#050505",
      "accent": "#ef4444"
    },
    "typographyStyle": "Dramatic cinematic display typography paired with clean subtitle-style sans",
    "layoutArchetype": "High-contrast theatrical reel layout with interactive production slate filter"
  },
  {
    "id": "BLIND-18",
    "industry": "Elite Youth Athletics Training Academy",
    "companyName": "Apex Athletic Training Academy",
    "targetAudience": "Student athletes, high school coaches, sports parents",
    "primaryConversionGoal": "Book athlete assessment combine sessions and register for seasonal training camps",
    "brandPersonality": "High-performance, biomechanical precision, disciplined grit, athletic excellence",
    "requiredSections": [
      "Performance Combine & Biometrics",
      "Seasonal Camp Programs",
      "Training Camp Selector",
      "Book Athletic Assessment"
    ],
    "functionalRequirements": [
      "Sport and age bracket program filter",
      "Camp tuition & session schedule calculator",
      "Assessment booking intake"
    ],
    "contentConstraints": [
      "Do not promise guaranteed college scholarship recruitment in absolute terms"
    ],
    "accessibilityRequirements": [
      "High contrast sports performance schedules",
      "Accessible form inputs with large buttons"
    ],
    "responsiveRequirements": [
      "Mobile-optimized camp registration calendar with sticky reserve button"
    ],
    "isAmbiguous": false,
    "hasDesignTension": false,
    "hasIncompleteData": true,
    "incompleteDataFields": [
      "Exact collegiate scholarship dollar total",
      "Unverified athlete alumni stats"
    ],
    "colorPalette": {
      "primary": "#f97316",
      "secondary": "#c2410c",
      "background": "#0a0a0a",
      "accent": "#fb923c"
    },
    "typographyStyle": "Bold athletic condensed sans-serif with high-energy numeric stats",
    "layoutArchetype": "High-velocity sports training layout with interactive camp registration tool"
  },
  {
    "id": "BLIND-19",
    "industry": "Regional Organic Produce Wholesaler",
    "companyName": "Terra Organics Wholesale Growers",
    "targetAudience": "Grocery store purchasing agents, restaurant groups, institutional food buyers",
    "primaryConversionGoal": "Order bulk pallet produce and download weekly harvest availability sheets",
    "brandPersonality": "Farm-fresh transparency, organic soil integrity, reliable cold-chain delivery",
    "requiredSections": [
      "Seasonal Harvest Catalog",
      "Organic Farm Network",
      "Pallet Order Estimator",
      "Wholesale Buyer Account Intake"
    ],
    "functionalRequirements": [
      "Live harvest availability table with seasonal filters",
      "Pallet freight & weight calculator",
      "New wholesale buyer intake form"
    ],
    "contentConstraints": [
      "State true organic certifier bodies without inventing unsupported health claims"
    ],
    "accessibilityRequirements": [
      "Clear table row headers with scope attributes",
      "Accessible product filter badges"
    ],
    "responsiveRequirements": [
      "Dense harvest inventory table scrollable with sticky produce name column on mobile"
    ],
    "isAmbiguous": false,
    "hasDesignTension": true,
    "designTensionDescription": "Must display massive weekly agricultural inventory lists without turning into an unreadable raw spreadsheet.",
    "hasIncompleteData": false,
    "colorPalette": {
      "primary": "#16a34a",
      "secondary": "#15803d",
      "background": "#052e16",
      "accent": "#22c55e"
    },
    "typographyStyle": "Natural botanical sans-serif paired with crisp commercial data typography",
    "layoutArchetype": "Harvest inventory catalog layout with bulk pallet calculator and wholesale registration"
  },
  {
    "id": "BLIND-20",
    "industry": "Industrial Hazardous Materials Safety Training",
    "companyName": "Safeguard HAZMAT Training Institute",
    "targetAudience": "Plant safety officers, refinery managers, chemical transport coordinators",
    "primaryConversionGoal": "Enroll industrial teams in OSHA/DOT HAZMAT certification courses",
    "brandPersonality": "Life-safety rigor, regulatory compliance, zero-incident culture",
    "requiredSections": [
      "OSHA HAZMAT Certifications",
      "On-Site Chemical Response Labs",
      "Group Training Cost Estimator",
      "Enroll Corporate Team"
    ],
    "functionalRequirements": [
      "OSHA course certification selector",
      "Per-student group pricing calculator",
      "Corporate enrollment intake form"
    ],
    "contentConstraints": [
      "Ensure all OSHA standard numbers (e.g. 29 CFR 1910.120) are accurately cited"
    ],
    "accessibilityRequirements": [
      "High visibility emergency safety color accents",
      "Accessible multi-step enrollment form"
    ],
    "responsiveRequirements": [
      "Clear course syllabus collapse accordions optimized for smartphone review on the jobsite"
    ],
    "isAmbiguous": false,
    "hasDesignTension": false,
    "hasIncompleteData": true,
    "incompleteDataFields": [
      "Unverified student pass rate statistics",
      "Private client incident logs"
    ],
    "colorPalette": {
      "primary": "#f59e0b",
      "secondary": "#b45309",
      "background": "#18181b",
      "accent": "#fbbf24"
    },
    "typographyStyle": "Industrial safety DIN-inspired typography with bold hazard-compliant callouts",
    "layoutArchetype": "OSHA compliance training catalog with interactive team tuition calculator"
  }
];
  }
}

export const blindBriefGenerator = new BlindBriefGenerator();
