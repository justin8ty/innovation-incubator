"use client"

import { useState } from "react"
import Link from "next/link"
import { 
  Calendar, 
  MapPin, 
  Users, 
  Trophy, 
  ChevronRight, 
  Sparkles, 
  Search,
  BookOpen,
  ArrowUpRight,
  Zap,
  Globe,
  Star
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { cn } from "@/lib/utils"

const CAMPAIGNS = [
  {
    id: 1,
    title: "Global AI Frontiers 2026",
    organizer: "Google Cloud",
    type: "Hackathon",
    date: "Sept 12 - 14, 2026",
    location: "Virtual / San Francisco",
    prize: "$250,000 Pool",
    description: "Pushing the boundaries of agentic workflows and large-scale vector processing.",
    color: "from-blue-500 to-cyan-400",
    image: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&q=80&w=800",
    participants: 1240,
    tags: ["AI/ML", "Cloud", "Agentic"]
  },
  {
    id: 2,
    title: "Fintech Revolution Lab",
    organizer: "Stripe",
    type: "Accelerator",
    date: "Starting Oct 2026",
    location: "London Hub",
    prize: "Series A Fast-track",
    description: "Join the next generation of global payment infrastructure builders.",
    color: "from-indigo-600 to-purple-500",
    image: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&q=80&w=800",
    participants: 45,
    tags: ["Payments", "Infrastructure", "B2B"]
  },
  {
    id: 3,
    title: "Sustain-Tech Challenge",
    organizer: "AWS",
    type: "Innovation Call",
    date: "Submission Closes Nov 1",
    location: "Global",
    prize: "$100K AWS Credits",
    description: "Developing high-impact solutions for carbon tracking and energy optimization.",
    color: "from-emerald-500 to-teal-400",
    image: "https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&q=80&w=800",
    participants: 890,
    tags: ["Climate", "Energy", "Analytics"]
  },
  {
    id: 4,
    title: "Cyber Shield 2026",
    organizer: "Microsoft Security",
    type: "Capture The Flag",
    date: "Dec 5, 2026",
    location: "Virtual",
    prize: "$50,000 Reward",
    description: "The ultimate test of defensive and offensive security skills in the age of LLMs.",
    color: "from-red-500 to-orange-400",
    image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800",
    participants: 2100,
    tags: ["Security", "Cyber", "LLM-Defense"]
  }
]

export default function CampaignsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
                <BookOpen className="w-4 h-4 text-primary" />
                <span className="text-sm text-primary font-medium uppercase tracking-widest text-[10px]">Campaign Catalogue</span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tight mb-2 uppercase">
                The Event <span className="text-primary italic">Grimoire</span>
              </h1>
              <p className="text-muted-foreground text-lg max-w-xl">
                A futuristic index of active accelerators, hackathons, and high-stakes innovation challenges.
              </p>
            </div>
            
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input 
                type="text"
                placeholder="Scan for campaigns..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-secondary border border-border focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all text-sm font-medium"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Featured Ribbon */}
          <div className="mb-16 relative overflow-hidden rounded-[2rem] bg-secondary border border-border p-1">
             <div className="flex items-center gap-8 py-4 px-6 animate-marquee whitespace-nowrap">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-4 text-xs font-black uppercase tracking-tighter opacity-50">
                    <Zap className="w-3 h-3 text-amber-400" />
                    <span>New Campaign Dropped: Vector World 2026</span>
                    <Globe className="w-3 h-3 text-blue-400" />
                    <span>Global Submissions Open</span>
                  </div>
                ))}
             </div>
          </div>

          {/* Campaigns "Book" Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {CAMPAIGNS.map((campaign) => (
              <div key={campaign.id} className="group relative">
                {/* Book Spine Decorative Element */}
                <div className="absolute -left-2 top-4 bottom-4 w-4 rounded-l-xl bg-primary/20 border-l border-primary/30 z-0 transition-all group-hover:-translate-x-1" />
                
                <div className="relative z-10 h-full flex flex-col bg-card border border-border rounded-2xl overflow-hidden transition-all duration-500 group-hover:-translate-y-2 group-hover:shadow-2xl group-hover:shadow-primary/20 group-hover:border-primary/50">
                  {/* Cover Image Area */}
                  <div className="relative h-48 overflow-hidden">
                    <img 
                      src={campaign.image} 
                      alt={campaign.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                    <div className={cn("absolute inset-0 bg-gradient-to-t opacity-60", campaign.color)} />
                    
                    <div className="absolute top-4 left-4">
                      <div className="px-2 py-1 rounded-md bg-black/40 backdrop-blur-md border border-white/10">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white">
                          {campaign.type}
                        </span>
                      </div>
                    </div>

                    <div className="absolute bottom-4 left-4 right-4">
                      <h3 className="text-xl font-black text-white leading-tight mb-1 group-hover:text-amber-300 transition-colors">
                        {campaign.title}
                      </h3>
                      <p className="text-[10px] font-bold text-white/80 uppercase tracking-tight flex items-center gap-1">
                        <Globe className="w-3 h-3" />
                        {campaign.organizer}
                      </p>
                    </div>
                  </div>

                  {/* Details Area */}
                  <div className="p-6 flex-1 flex flex-col">
                    <p className="text-sm text-muted-foreground mb-6 line-clamp-3 leading-relaxed">
                      {campaign.description}
                    </p>

                    <div className="space-y-3 mb-8">
                      <div className="flex items-center gap-3 text-xs font-medium text-foreground/70">
                        <Calendar className="w-4 h-4 text-primary" />
                        {campaign.date}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-medium text-foreground/70">
                        <MapPin className="w-4 h-4 text-primary" />
                        {campaign.location}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-black text-amber-400">
                        <Trophy className="w-4 h-4" />
                        {campaign.prize}
                      </div>
                    </div>

                    <div className="mt-auto flex items-center justify-between pt-6 border-t border-border">
                      <div className="flex -space-x-2">
                        {[...Array(3)].map((_, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border-2 border-card bg-secondary flex items-center justify-center overflow-hidden">
                            <Users className="w-3 h-3 text-muted-foreground" />
                          </div>
                        ))}
                        <div className="pl-4 text-[10px] font-bold text-muted-foreground self-center">
                          +{campaign.participants} Registered
                        </div>
                      </div>
                      
                      <button className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary hover:text-white transition-all group/btn">
                        <ChevronRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                      </button>
                    </div>
                  </div>

                  {/* Hover Scanline Effect */}
                  <div className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-10 transition-opacity">
                     <div className="h-1/2 w-full bg-gradient-to-b from-primary to-transparent animate-scan" />
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Futuristic Footer Note */}
          <div className="mt-20 text-center">
            <div className="inline-flex items-center gap-4 px-8 py-4 rounded-3xl bg-secondary border border-border shadow-inner">
               <Star className="w-5 h-5 text-amber-400 animate-spin-slow" />
               <p className="text-sm font-medium text-muted-foreground">
                 More campaigns are being synthesized via the <span className="text-primary font-bold">Vector Pipeline</span>
               </p>
               <Star className="w-5 h-5 text-amber-400 animate-spin-slow" />
            </div>
          </div>
        </div>
      </main>

      <style jsx global>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 20s linear infinite;
        }
        @keyframes scan {
          0% { transform: translateY(-100%); }
          100% { transform: translateY(200%); }
        }
        .animate-scan {
          animation: scan 3s linear infinite;
        }
        .animate-spin-slow {
          animation: spin 6s linear infinite;
        }
      `}</style>
    </div>
  )
}
