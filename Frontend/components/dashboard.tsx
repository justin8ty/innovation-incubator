"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ArrowRight,
  Zap,
  Brain,
  Network,
  FileJson,
  Search,
  GitMerge,
  ChevronRight,
  Sparkles,
  Shield,
  Globe,
  User,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Navigation } from "@/components/shared/navigation"

const partners = [
  { name: "Cradle Fund", category: "Venture Capital" },
  { name: "AWS", category: "Cloud Infrastructure" },
  { name: "Google Cloud", category: "Cloud Infrastructure" },
  { name: "Y Combinator", category: "Accelerator" },
  { name: "Sequoia", category: "Venture Capital" },
  { name: "a]6z", category: "Venture Capital" },
]

const features = [
  {
    icon: FileJson,
    title: "Frictionless Ingestion",
    description: "Raw PDF files transform instantly into clean, validated JSON schema data using Gemini AI.",
    visual: "pdf-to-json",
  },
  {
    icon: Search,
    title: "2-Step Matchmaking",
    description: "Fast Vector/Cosine Similarity search narrows down data, followed by Gemini Pro contextual reranking.",
    visual: "matchmaking",
  },
  {
    icon: GitMerge,
    title: "Continuous Feedback",
    description: "Profile vectors dynamically adjust closer together when pairs achieve successful milestones.",
    visual: "feedback",
  },
]

export function Dashboard() {
  const [hoveredFeature, setHoveredFeature] = useState<number | null>(null)

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <Navigation />

      {/* Hero Section */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.1),transparent_50%)]" />
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">AI-Powered Ecosystem Intelligence</span>
          </div>
          
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-foreground leading-tight tracking-tight">
            Automating Ecosystem
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-cyan-400 to-primary">
              Linkages Instead of
            </span>
            <br />
            Manual Coordination
          </h1>
          
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Transforming ad-hoc, operationally heavy matching into reusable, programmable relationship entities that scale across borders effortlessly.
          </p>
          
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/innovator">
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-8 h-12 text-base">
                Start AI Onboarding
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
            <Link href="/profile">
              <Button size="lg" variant="outline" className="border-border hover:bg-secondary gap-2 px-8 h-12 text-base">
                <User className="w-5 h-5" />
                View Demo Profiles
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Problem vs Solution Section */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              The Innovation Bottleneck
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Traditional ecosystem management is broken. We fixed it.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-8">
            {/* The Bottleneck */}
            <div className="relative p-8 rounded-2xl bg-card border border-amber-500/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-xs font-medium text-amber-400 uppercase tracking-wider">The Bottleneck</span>
                </div>
                
                <h3 className="text-2xl font-semibold text-foreground mb-6">
                  Manual Operations Drain Resources
                </h3>
                
                <ul className="space-y-4">
                  {[
                    "Heavy Operations - Endless spreadsheets and manual tracking",
                    "One-Off Manual Assignments - No scalable matching logic",
                    "Lost Engagement Data - Valuable insights disappear",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                        <div className="w-2 h-2 rounded-full bg-amber-500" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* The Solution */}
            <div className="relative p-8 rounded-2xl bg-card border border-cyan-500/20 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-transparent" />
              <div className="relative">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 mb-6">
                  <Zap className="w-3 h-3 text-cyan-400" />
                  <span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">The MyHack Engine</span>
                </div>
                
                <h3 className="text-2xl font-semibold text-foreground mb-6">
                  AI-Powered Automation at Scale
                </h3>
                
                <ul className="space-y-4">
                  {[
                    "Frictionless Document Parsing - Instant data extraction",
                    "Dynamic Vector Alignment - Smart semantic matching",
                    "Automated Background Handshakes - Seamless connections",
                  ].map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <div className="mt-1 w-5 h-5 rounded-full bg-cyan-500/10 flex items-center justify-center shrink-0">
                        <Zap className="w-3 h-3 text-cyan-400" />
                      </div>
                      <span className="text-muted-foreground">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Bento Grid */}
      <section className="py-24 px-6 bg-card/30 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Intelligent Infrastructure
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Three core engines working in harmony to transform how ecosystems connect.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                onMouseEnter={() => setHoveredFeature(index)}
                onMouseLeave={() => setHoveredFeature(null)}
                className={cn(
                  "group relative p-6 rounded-2xl bg-card border border-border transition-all duration-500",
                  hoveredFeature === index && "border-primary/50 shadow-lg shadow-primary/5"
                )}
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="relative">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-all duration-300",
                    hoveredFeature === index ? "bg-primary/20" : "bg-secondary"
                  )}>
                    <feature.icon className={cn(
                      "w-6 h-6 transition-colors duration-300",
                      hoveredFeature === index ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    {feature.title}
                  </h3>
                  
                  <p className="text-muted-foreground text-sm leading-relaxed mb-4">
                    {feature.description}
                  </p>

                  {/* Visual Representation */}
                  <div className="mt-6 p-4 rounded-xl bg-background/50 border border-border/50">
                    {feature.visual === "pdf-to-json" && (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-10 rounded bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-red-400">PDF</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {[...Array(3)].map((_, i) => (
                            <ChevronRight key={i} className="w-4 h-4 text-primary/50" />
                          ))}
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-10 rounded bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                            <span className="text-[10px] font-medium text-cyan-400">{"{}"}</span>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {feature.visual === "matchmaking" && (
                      <div className="flex items-center justify-center gap-4">
                        <div className="text-center">
                          <Search className="w-5 h-5 text-primary mx-auto mb-1" />
                          <span className="text-[10px] text-muted-foreground">Vector</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <div className="text-center">
                          <Brain className="w-5 h-5 text-cyan-400 mx-auto mb-1" />
                          <span className="text-[10px] text-muted-foreground">Rerank</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        <div className="text-center">
                          <Sparkles className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                          <span className="text-[10px] text-muted-foreground">Match</span>
                        </div>
                      </div>
                    )}
                    
                    {feature.visual === "feedback" && (
                      <div className="flex items-center justify-center">
                        <div className="relative w-20 h-20">
                          <div className="absolute inset-0 rounded-full border border-dashed border-primary/30" />
                          <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-primary animate-pulse" />
                          <div className="absolute bottom-4 right-2 w-3 h-3 rounded-full bg-cyan-400 animate-pulse delay-300" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-foreground" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Partners Section */}
      <section className="py-24 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Trusted by Industry Leaders
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Global corporate sponsors and service providers powering the next generation of startups.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {partners.map((partner) => (
              <div
                key={partner.name}
                className="group p-6 rounded-xl bg-card border border-border hover:border-primary/30 transition-all duration-300"
              >
                <div className="text-center">
                  <div className="w-12 h-12 mx-auto mb-3 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                    <Globe className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <p className="font-medium text-foreground text-sm">{partner.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{partner.category}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-gradient-to-b from-card/30 to-background border-t border-border/50">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary font-medium">Enterprise Ready</span>
          </div>
          
          <h2 className="text-3xl md:text-5xl font-bold text-foreground mb-6">
            Ready to Transform Your Ecosystem?
          </h2>
          
          <p className="text-lg text-muted-foreground mb-10 max-w-2xl mx-auto">
            Join the next generation of innovation platforms. Start automating your ecosystem linkages today.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 px-8 h-12">
              Start Free Trial
              <ArrowRight className="w-5 h-5" />
            </Button>
            <Button size="lg" variant="outline" className="border-border hover:bg-secondary gap-2 px-8 h-12">
              Schedule Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 border-t border-border/50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-cyan-400 flex items-center justify-center">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <span className="font-medium text-foreground">MyHack Engine</span>
          </div>
          
          <p className="text-sm text-muted-foreground">
            2026 MyHack Engine. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
