"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  User, 
  Briefcase, 
  GraduationCap, 
  ShieldCheck, 
  ExternalLink, 
  ChevronRight, 
  Award, 
  Layers,
  ArrowUpRight,
  Code2,
  Cpu,
  Globe
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { cn } from "@/lib/utils"

// Hardcoded Demo Data
const DEMO_PROFILES = {
  innovator: {
    name: "Alex Rivera",
    role: "Innovator",
    specialty: "Full Stack AI Developer",
    bio: "Passionate about building decentralized AI ecosystems and optimized vector databases.",
    projects: [
      { name: "NeuralLink Core", description: "A high-performance neural network interface.", link: "#", tags: ["Python", "Rust"] },
      { name: "EcoVector DB", description: "Efficient vector storage for sustainability apps.", link: "#", tags: ["TypeScript", "Vector Search"] }
    ],
    campaigns: [
      { name: "Google Cloud AI Hackathon 2026", status: "Winner - Most Innovative", link: "#" },
      { name: "Microsoft Build Local Pitch", status: "Finalist", link: "#" }
    ],
    mentor: {
      name: "Dr. Sarah Jenkins",
      id: "sarah-jenkins",
      bio: "20+ years in AI Research and Cloud Infrastructure."
    }
  },
  mentor: {
    name: "Dr. Sarah Jenkins",
    role: "Mentor",
    specialty: "AI Architecture & Cloud Scale",
    bio: "Helping the next generation of founders scale AI solutions from 0 to 1.",
    projects: [
      { name: "Global Cloud Grid", description: "Architected a multi-region low-latency grid.", link: "#", tags: ["Kubernetes", "GCP"] },
      { name: "Agentic Framework", description: "Foundational library for LLM agents.", link: "#", tags: ["Go", "LLM"] }
    ],
    campaigns: [
      { name: "TechStars 2026", status: "Lead Mentor", link: "#" },
      { name: "Founders Fund Accelerator", status: "Technical Advisor", link: "#" }
    ],
    mentees: [
      { name: "Alex Rivera", id: "alex-rivera" },
      { name: "John Doe", id: "john-doe" }
    ]
  }
}

export default function ProfilePage() {
  const [activeRole, setActiveRole] = useState<"innovator" | "mentor">("innovator")
  const profile = DEMO_PROFILES[activeRole]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Role Toggle for Demo */}
          <div className="flex justify-center mb-12">
            <div className="p-1 rounded-full bg-secondary border border-border flex gap-1">
              <button
                onClick={() => setActiveRole("innovator")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all",
                  activeRole === "innovator" ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-primary/10"
                )}
              >
                View Innovator Profile
              </button>
              <button
                onClick={() => setActiveRole("mentor")}
                className={cn(
                  "px-6 py-2 rounded-full text-sm font-bold transition-all",
                  activeRole === "mentor" ? "bg-primary text-primary-foreground shadow-lg" : "hover:bg-primary/10"
                )}
              >
                View Mentor Profile
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Sidebar: Hero Info */}
            <div className="lg:col-span-1 space-y-6">
              <div className="p-8 rounded-3xl bg-gradient-to-b from-primary/10 to-transparent border border-primary/20 relative overflow-hidden group shadow-xl">
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  <User className="w-24 h-24" />
                </div>
                
                <div className="relative z-10 text-center lg:text-left">
                  <div className="w-24 h-24 rounded-2xl bg-primary/20 border border-primary/30 mx-auto lg:mx-0 mb-6 flex items-center justify-center shadow-inner">
                    <User className="w-12 h-12 text-primary" />
                  </div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 border border-primary/30 mb-4">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                      {profile.role} Profile
                    </span>
                  </div>
                  <h1 className="text-3xl font-black mb-2 tracking-tight">{profile.name}</h1>
                  <p className="text-primary font-bold text-sm mb-6 flex items-center gap-2 justify-center lg:justify-start">
                    <Globe className="w-4 h-4" />
                    {profile.specialty}
                  </p>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {profile.bio}
                  </p>
                </div>
              </div>

              {/* Mentorship Link (Special Highlight) */}
              {activeRole === "innovator" && (
                <div 
                  onClick={() => setActiveRole("mentor")}
                  className="p-6 rounded-3xl bg-card border border-border hover:border-primary/50 transition-all cursor-pointer group"
                >
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Lead Mentor</p>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">
                        {profile.mentor?.name}
                      </h4>
                      <p className="text-xs text-muted-foreground line-clamp-1">{profile.mentor?.bio}</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              )}

              {activeRole === "mentor" && (
                <div className="p-6 rounded-3xl bg-card border border-border">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-4">Active Mentees</p>
                  <div className="space-y-3">
                    {(profile as any).mentees?.map((mentee: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-2 rounded-xl hover:bg-secondary/50 transition-colors cursor-pointer group">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors">{mentee.name}</span>
                        <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-all" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Main Content: Projects & Campaigns */}
            <div className="lg:col-span-2 space-y-8">
              {/* Projects Card Grid */}
              <section>
                <div className="flex items-center justify-between mb-6 px-2">
                  <h2 className="text-xl font-black flex items-center gap-3">
                    <Cpu className="w-6 h-6 text-primary" />
                    Project Portfolio
                  </h2>
                  <span className="text-xs text-muted-foreground font-mono">/00{profile.projects.length}</span>
                </div>
                <div className="grid md:grid-cols-2 gap-4">
                  {profile.projects.map((project, i) => (
                    <div key={i} className="group p-6 rounded-3xl bg-card border border-border hover:border-primary/30 hover:shadow-2xl hover:shadow-primary/5 transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                          <Code2 className="w-5 h-5 text-primary" />
                        </div>
                        <Link href={project.link} className="text-muted-foreground hover:text-primary transition-colors">
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                      <h3 className="text-lg font-bold mb-2 group-hover:text-primary transition-colors">{project.name}</h3>
                      <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                        {project.description}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {project.tags.map((tag, j) => (
                          <span key={j} className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-secondary text-secondary-foreground border border-border">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Campaign Links Section */}
              <section>
                <div className="flex items-center justify-between mb-6 px-2 text-white">
                  <h2 className="text-xl font-black flex items-center gap-3">
                    <Award className="w-6 h-6 text-amber-400" />
                    Campaign Involvement
                  </h2>
                </div>
                <div className="space-y-4">
                  {profile.campaigns.map((camp, i) => (
                    <div key={i} className="flex items-center gap-4 p-6 rounded-3xl bg-gradient-to-r from-secondary/50 to-transparent border border-border hover:border-amber-400/30 transition-all group">
                      <div className="w-12 h-12 rounded-full bg-amber-400/10 border border-amber-400/20 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                        <Layers className="w-6 h-6 text-amber-400" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-foreground group-hover:text-amber-400 transition-colors">{camp.name}</h4>
                        <p className="text-xs text-amber-400/80 font-medium uppercase tracking-tight">{camp.status}</p>
                      </div>
                      <Button variant="ghost" size="sm" className="gap-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        View Details
                        <ArrowUpRight className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Verification Badges */}
              <section className="p-8 rounded-3xl bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-4 mb-4">
                  <ShieldCheck className="w-8 h-8 text-emerald-500" />
                  <div>
                    <h3 className="font-black text-foreground uppercase tracking-tight">AI Verified Profile</h3>
                    <p className="text-xs text-muted-foreground font-medium">Synced with Ecosystem Vector Space</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                  {['Skill Proof', 'Github API', 'Pitch Deck', 'Web3 ID'].map((badge, i) => (
                    <div key={i} className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                      <p className="text-[10px] font-bold text-emerald-400 whitespace-nowrap uppercase tracking-widest">{badge}</p>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
