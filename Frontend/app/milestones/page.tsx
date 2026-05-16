"use client"

import { useState } from "react"
import { 
  Trophy, 
  Target, 
  Zap, 
  ShieldCheck, 
  ChevronRight, 
  Lock, 
  Unlock, 
  ArrowUpRight,
  BarChart3,
  Coins,
  Cpu,
  Sparkles,
  Layers,
  Activity
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { cn } from "@/lib/utils"

const TRL_LEVELS = [
  { level: 1, title: "Basic Principles", description: "Scientific research begins to be translated into applied R&D." },
  { level: 2, title: "Technology Concept", description: "Invention begins. Practical applications can be invented." },
  { level: 3, title: "Proof of Concept", description: "Active R&D is initiated. Analytical and laboratory studies." },
  { level: 4, title: "Lab Validation", description: "Design, development and lab testing of technological components." },
  { level: 5, title: "Relevant Environment Validation", description: "Reliability of technology increases significantly." },
  { level: 6, title: "Prototype Demonstration", description: "Prototype system verified in relevant environment." },
  { level: 7, title: "System Prototype", description: "System prototype demonstration in an operational environment." },
  { level: 8, title: "Actual System Completed", description: "Technology has been proven to work in its final form." },
  { level: 9, title: "Operational Deployment", description: "Actual system proven through successful mission operations." },
]

const MILESTONES = [
  {
    id: 1,
    title: "Project Initiation & Team Formation",
    status: "completed",
    trlTrigger: 1,
    date: "Jan 10, 2026",
    reward: "$5,000",
    rewardStatus: "released"
  },
  {
    id: 2,
    title: "Validated Proof of Concept",
    status: "completed",
    trlTrigger: 3,
    date: "Feb 15, 2026",
    reward: "$15,000",
    rewardStatus: "released"
  },
  {
    id: 3,
    title: "Alpha Prototype Development",
    status: "in-progress",
    trlTrigger: 5,
    date: "Target: April 2026",
    reward: "$30,000",
    rewardStatus: "pending"
  },
  {
    id: 4,
    title: "Market Pilot & User Feedback",
    status: "locked",
    trlTrigger: 7,
    date: "Target: July 2026",
    reward: "$50,000",
    rewardStatus: "locked"
  },
  {
    id: 5,
    title: "Full Scale Deployment",
    status: "locked",
    trlTrigger: 9,
    date: "Target: Oct 2026",
    reward: "$100,000",
    rewardStatus: "locked"
  }
]

export default function MilestonesPage() {
  const [currentTRL, setCurrentTRL] = useState(4)
  const [activeMilestone, setActiveMilestone] = useState(2)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <Target className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium uppercase tracking-widest text-[10px]">Progression Engine</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 uppercase italic">
                Milestone <span className="text-primary not-italic">Tracker</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                Real-time TRL mapping and automated fund disbursement pipeline for high-impact innovation.
              </p>
            </div>
            
            <div className="flex gap-4">
              <div className="p-4 rounded-2xl bg-secondary border border-border text-center min-w-[120px]">
                <p className="text-[10px] font-black uppercase text-muted-foreground mb-1">Total Funds</p>
                <p className="text-xl font-bold text-primary">$200,000</p>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center min-w-[120px]">
                <p className="text-[10px] font-black uppercase text-emerald-400 mb-1">Disbursed</p>
                <p className="text-xl font-bold text-emerald-400">$20,000</p>
              </div>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left: TRL Vertical Scale */}
            <div className="lg:col-span-4 space-y-6">
              <div className="p-6 rounded-3xl bg-card border border-border relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                  <BarChart3 className="w-32 h-32" />
                </div>
                
                <h2 className="text-xl font-black mb-8 flex items-center gap-3">
                  <Activity className="w-5 h-5 text-primary" />
                  TRL MATURITY SCALE
                </h2>

                {/* Speedometer Gauge */}
                <div className="relative flex justify-center mb-10 group/gauge">
                  <svg className="w-48 h-28" viewBox="0 0 100 55">
                    {/* Background Arc */}
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="currentColor" 
                      strokeWidth="8" 
                      className="text-secondary"
                    />
                    {/* Progress Arc */}
                    <path 
                      d="M 10 50 A 40 40 0 0 1 90 50" 
                      fill="none" 
                      stroke="url(#gauge-gradient)" 
                      strokeWidth="8" 
                      strokeDasharray="125.6" 
                      strokeDashoffset={125.6 - (125.6 * (currentTRL - 1) / 8)}
                      className="transition-all duration-1000 ease-out"
                    />
                    {/* Tick Marks */}
                    {[...Array(9)].map((_, i) => {
                      const angle = 180 + (i * 22.5);
                      const rad = (angle * Math.PI) / 180;
                      const x1 = 50 + 34 * Math.cos(rad);
                      const y1 = 50 + 34 * Math.sin(rad);
                      const x2 = 50 + 40 * Math.cos(rad);
                      const y2 = 50 + 40 * Math.sin(rad);
                      return (
                        <line 
                          key={i} 
                          x1={x1} y1={y1} x2={x2} y2={y2} 
                          stroke="currentColor" 
                          strokeWidth="1"
                          className={cn(
                            "transition-colors duration-300",
                            currentTRL > i ? "text-primary" : "text-muted-foreground/30"
                          )}
                        />
                      );
                    })}
                    {/* Needle */}
                    <g 
                      className="transition-transform duration-1000 ease-out" 
                      style={{ 
                        transform: `rotate(${((currentTRL - 1) * 22.5)}deg)`, 
                        transformOrigin: '50% 50%' 
                      }}
                    >
                      <line x1="10" y1="50" x2="50" y2="50" stroke="url(#needle-gradient)" strokeWidth="2" strokeLinecap="round" />
                      <circle cx="50" cy="50" r="3" fill="currentColor" className="text-primary" />
                    </g>
                    {/* Gradients */}
                    <defs>
                      <linearGradient id="gauge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="#22d3ee" />
                      </linearGradient>
                      <linearGradient id="needle-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#3b82f6" />
                        <stop offset="100%" stopColor="transparent" />
                      </linearGradient>
                    </defs>
                  </svg>
                  
                  {/* Digital Display */}
                  <div className="absolute bottom-2 inset-x-0 text-center">
                    <p className="text-2xl font-black text-foreground leading-none tracking-tighter">
                      {currentTRL}<span className="text-[10px] text-muted-foreground ml-1">TRL</span>
                    </p>
                    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20 mt-1">
                      <Sparkles className="w-2.5 h-2.5 text-primary" />
                      <span className="text-[8px] font-bold text-primary uppercase">Maturity: {((currentTRL / 9) * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                  
                  {/* Glow Effect */}
                  <div className="absolute inset-0 bg-primary/5 rounded-full blur-2xl opacity-0 group-hover/gauge:opacity-100 transition-opacity" />
                </div>

                <div className="relative space-y-4">
                  {/* Vertical Line */}
                  <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-border z-0" />
                  
                  {TRL_LEVELS.map((trl) => (
                    <div 
                      key={trl.level}
                      className={cn(
                        "relative z-10 flex items-start gap-6 transition-all duration-300 cursor-pointer group/item",
                        currentTRL >= trl.level ? "opacity-100" : "opacity-40 grayscale hover:grayscale-0 hover:opacity-80"
                      )}
                      onClick={() => setCurrentTRL(trl.level)}
                    >
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center font-black text-lg border-2 transition-all shrink-0",
                        currentTRL >= trl.level 
                          ? "bg-primary border-primary text-primary-foreground shadow-[0_0_15px_rgba(59,130,246,0.5)]" 
                          : "bg-secondary border-border text-muted-foreground"
                      )}>
                        {trl.level}
                      </div>
                      <div className="pt-1">
                        <h3 className={cn(
                          "text-sm font-bold mb-1 group-hover/item:text-primary transition-colors",
                          currentTRL === trl.level ? "text-primary" : "text-foreground"
                        )}>
                          {trl.title}
                        </h3>
                        {currentTRL === trl.level && (
                          <p className="text-xs text-muted-foreground leading-relaxed animate-in fade-in slide-in-from-left-2">
                            {trl.description}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* TRL Summary Card */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-primary/20 to-cyan-500/10 border border-primary/30 shadow-xl shadow-primary/5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                    <Cpu className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-black text-foreground uppercase tracking-tight">Technical Status</h3>
                    <p className="text-xs text-primary font-bold">LVL {currentTRL} Verified</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Your project is currently at <span className="text-foreground font-bold">Technology Readiness Level {currentTRL}</span>. 
                  Achieve TRL 5 to unlock the next funding tranche of <span className="text-emerald-400 font-bold">$30,000</span>.
                </p>
                <Button className="w-full bg-primary hover:bg-primary/90 text-white gap-2">
                  Submit Proof for TRL {currentTRL + 1}
                  <ArrowUpRight className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Right: Milestone Timeline & Fund Release */}
            <div className="lg:col-span-8 space-y-8">
              {/* Main Milestone Timeline */}
              <section className="p-8 rounded-[2.5rem] bg-card border border-border relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
                
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-10">
                    <h2 className="text-2xl font-black flex items-center gap-3">
                      <Trophy className="w-7 h-7 text-amber-400" />
                      CAMPAIGN ROADMAP
                    </h2>
                    <div className="px-4 py-2 rounded-full bg-secondary border border-border flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" />
                      <span className="text-xs font-bold text-muted-foreground uppercase">AI Verified Pipeline</span>
                    </div>
                  </div>

                  <div className="space-y-8 relative">
                    {/* Background Progress Bar */}
                    <div className="absolute left-8 top-0 bottom-0 w-1 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="w-full bg-primary transition-all duration-1000 ease-out"
                        style={{ height: `${(activeMilestone / (MILESTONES.length - 1)) * 100}%` }}
                      />
                    </div>

                    {MILESTONES.map((m, idx) => (
                      <div 
                        key={m.id}
                        className={cn(
                          "relative pl-20 transition-all duration-500",
                          m.status === "locked" ? "opacity-50" : "opacity-100"
                        )}
                      >
                        {/* Node */}
                        <div className={cn(
                          "absolute left-4 top-0 w-9 h-9 rounded-full border-4 border-card z-20 flex items-center justify-center transition-all duration-500",
                          m.status === "completed" ? "bg-emerald-500" : 
                          m.status === "in-progress" ? "bg-primary animate-pulse shadow-[0_0_20px_rgba(59,130,246,0.6)]" : 
                          "bg-secondary"
                        )}>
                          {m.status === "completed" ? (
                            <ShieldCheck className="w-4 h-4 text-white" />
                          ) : m.status === "in-progress" ? (
                            <Zap className="w-4 h-4 text-white fill-current" />
                          ) : (
                            <Lock className="w-4 h-4 text-muted-foreground" />
                          )}
                        </div>

                        <div className={cn(
                          "p-6 rounded-3xl border transition-all duration-300 group hover:scale-[1.02]",
                          m.status === "completed" ? "bg-emerald-500/5 border-emerald-500/20" : 
                          m.status === "in-progress" ? "bg-primary/5 border-primary/30 shadow-lg shadow-primary/5" : 
                          "bg-secondary/30 border-border"
                        )}>
                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                              <div className="flex items-center gap-3 mb-2">
                                <span className={cn(
                                  "text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded",
                                  m.status === "completed" ? "bg-emerald-500/20 text-emerald-400" : 
                                  m.status === "in-progress" ? "bg-primary/20 text-primary" : 
                                  "bg-muted text-muted-foreground"
                                )}>
                                  {m.status}
                                </span>
                                <span className="text-[10px] font-bold text-muted-foreground">
                                  {m.date}
                                </span>
                              </div>
                              <h3 className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                                {m.title}
                              </h3>
                              <p className="text-sm text-muted-foreground mt-1">
                                Requires TRL {m.trlTrigger} validation for fund release.
                              </p>
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[10px] font-black text-muted-foreground uppercase">Reward</p>
                                <p className={cn(
                                  "text-lg font-black",
                                  m.rewardStatus === "released" ? "text-emerald-400" : "text-foreground"
                                )}>
                                  {m.reward}
                                </p>
                              </div>
                              <div className={cn(
                                "w-12 h-12 rounded-2xl flex items-center justify-center border transition-all",
                                m.rewardStatus === "released" ? "bg-emerald-500/20 border-emerald-500/30 text-emerald-400" : 
                                m.rewardStatus === "pending" ? "bg-primary/20 border-primary/30 text-primary animate-bounce" : 
                                "bg-secondary border-border text-muted-foreground"
                              )}>
                                {m.rewardStatus === "released" ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {/* Fund Disbursement Log */}
              <section className="p-8 rounded-[2.5rem] bg-gradient-to-r from-secondary/50 to-transparent border border-border">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="text-xl font-black flex items-center gap-3">
                    <Coins className="w-6 h-6 text-emerald-400" />
                    DISBURSEMENT TELEMETRY
                  </h2>
                  <Button variant="ghost" size="sm" className="text-xs font-bold gap-2">
                    View Full Ledger
                    <ArrowUpRight className="w-4 h-4" />
                  </Button>
                </div>

                <div className="space-y-4">
                  {[
                    { id: 'TX-9021', milestone: "Phase 1: Project Initiation", amount: "$5,000", status: "Success", date: "2026-01-12" },
                    { id: 'TX-9045', milestone: "Phase 2: PoC Validation", amount: "$15,000", status: "Success", date: "2026-02-18" },
                  ].map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between p-4 rounded-2xl bg-background/50 border border-border group hover:border-primary/30 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Zap className="w-4 h-4 text-emerald-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-foreground">{tx.milestone}</p>
                          <p className="text-[10px] font-mono text-muted-foreground">ID: {tx.id} • {tx.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-400">{tx.amount}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase">{tx.status}</p>
                      </div>
                    </div>
                  ))}
                  
                  {/* Pending Transaction */}
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-primary/5 border border-primary/20 border-dashed relative overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-transparent animate-pulse" />
                    <div className="relative z-10 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-foreground">Next Release: Alpha Prototype</p>
                        <p className="text-[10px] font-mono text-primary/70">AWAITING TRL 5 VALIDATION</p>
                      </div>
                    </div>
                    <div className="relative z-10 text-right">
                      <p className="text-sm font-black text-primary">$30,000</p>
                      <p className="text-[10px] font-bold text-primary/70 uppercase">Escrowed</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Bottom Quick Actions */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="p-6 rounded-3xl bg-card border border-border text-center hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-secondary mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Layers className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs font-bold">Audit History</p>
                </div>
                <div className="p-6 rounded-3xl bg-card border border-border text-center hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-secondary mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <ShieldCheck className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs font-bold">Compliance Panel</p>
                </div>
                <div className="p-6 rounded-3xl bg-card border border-border text-center hover:border-primary/50 transition-all cursor-pointer group">
                  <div className="w-10 h-10 rounded-xl bg-secondary mx-auto mb-3 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                    <Coins className="w-5 h-5 text-muted-foreground group-hover:text-primary" />
                  </div>
                  <p className="text-xs font-bold">Payout Settings</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
      `}</style>
    </div>
  )
}
