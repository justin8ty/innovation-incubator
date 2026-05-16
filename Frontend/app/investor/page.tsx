"use client"

import { useState } from "react"
import { TrendingUp, Lock, Terminal, DollarSign, Target, Sparkles, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { UploadZone } from "@/components/shared/upload-zone"
import { FormField } from "@/components/shared/form-field"
import { cn } from "@/lib/utils"

interface FormData {
  firm_name: string
  investment_stage: string
  ticket_size: string
  focus_areas: string
  value_add: string
}

interface StartupMatch {
  name: string
  score: number
  stage: string
  industry: string
  seeking: string
  tags: string[]
  reasoning: string
}

const mockStartupMatches: StartupMatch[] = [
  {
    name: "NexaPay Technologies",
    score: 96,
    stage: "Pre-Seed",
    industry: "Fintech",
    seeking: "$1.5M",
    tags: ["Blockchain", "Cross-border", "B2B"],
    reasoning: "Strong alignment with your fintech thesis. Team has prior exits at Stripe and PayPal. Their blockchain-based cross-border payment rails directly address the market opportunity outlined in your mandate. Pre-seed stage matches your sweet spot.",
  },
  {
    name: "HealthSync AI",
    score: 92,
    stage: "Seed",
    industry: "Healthcare",
    seeking: "$3M",
    tags: ["AI Diagnostics", "HIPAA", "Enterprise"],
    reasoning: "While slightly outside primary fintech focus, their AI diagnostic platform shows exceptional technical moat. 3 pilot customers with $200K ARR validates enterprise demand. Consider for portfolio diversification.",
  },
  {
    name: "DataMesh Analytics",
    score: 89,
    stage: "Pre-Seed",
    industry: "Enterprise SaaS",
    seeking: "$2M",
    tags: ["Data Infrastructure", "Real-time", "Series A Ready"],
    reasoning: "Data infrastructure play with strong technical founders from Google and Meta. Their real-time analytics engine could be strategic for your fintech portfolio companies. Potential synergies identified.",
  },
  {
    name: "CryptoGuard Security",
    score: 85,
    stage: "Seed",
    industry: "Cybersecurity",
    seeking: "$4M",
    tags: ["DeFi Security", "Smart Contracts", "B2B"],
    reasoning: "Perfect bridge between your fintech thesis and emerging DeFi security needs. Their smart contract auditing tools are used by 3 top-10 DeFi protocols. Strong recurring revenue model.",
  },
  {
    name: "GreenRoute Logistics",
    score: 78,
    stage: "Pre-Seed",
    industry: "Climate Tech",
    seeking: "$1M",
    tags: ["Supply Chain", "Carbon Tracking", "ESG"],
    reasoning: "Lower direct thesis alignment but represents emerging ESG investment opportunity. Their carbon tracking for logistics could complement portfolio company operations. Consider for impact allocation.",
  },
]

const InvestorTemplateQuestions = {
  firm_name: "What is the name of your investment firm or fund?",
  investment_stage: "Which specific funding stages do you primarily target (e.g., Seed, Series A)?",
  ticket_size: "What is your typical investment ticket size (minimum and maximum capital deployed)?",
  focus_areas: "What are your primary industry or technology focus areas (e.g., Fintech, AI, HealthTech)?",
  value_add: "What non-financial benefits or strategic value do you provide to your portfolio companies?",
}

export default function InvestorPage() {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    firm_name: "",
    investment_stage: "",
    ticket_size: "",
    focus_areas: "",
    value_add: "",
  })

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    
    const formDataObj = new FormData()
    formDataObj.append("file", file)
    formDataObj.append("role", "investor")

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/upload", {
        method: "POST",
        body: formDataObj,
      })

      if (!response.ok) {
        throw new Error("Upload failed")
      }

      const data = await response.json()
      
      setFileUploaded(true)
      setFollowUpQuestions(data.follow_up_questions || [])
      setFormData({
        firm_name: data.firm_name || "",
        investment_stage: Array.isArray(data.investment_stage) ? data.investment_stage.join(", ") : (data.investment_stage || ""),
        ticket_size: data.ticket_size || "",
        focus_areas: Array.isArray(data.focus_areas) ? data.focus_areas.join(", ") : (data.focus_areas || ""),
        value_add: Array.isArray(data.value_add) ? data.value_add.join(", ") : (data.value_add || ""),
      })
    } catch (error) {
      console.error("Error uploading file:", error)
      alert("Failed to extract data from document.")
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const hasAutoFilled = fileUploaded && formData.firm_name
  const hasMissingFields = fileUploaded && followUpQuestions.length > 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
              <TrendingUp className="w-4 h-4 text-amber-400" />
              <span className="text-sm text-amber-400 font-medium">Investor Terminal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Deal-Flow Intelligence
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Drop your investment mandate and instantly view matching deal-flow telemetry from the ecosystem.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Column: Upload + Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* Mandate Upload Terminal */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Terminal className="w-5 h-5 text-amber-400" />
                  Mandate Upload Terminal
                </h2>
                
                {/* Terminal-style header */}
                <div className="mb-4 p-3 rounded-t-xl bg-background border border-border border-b-0">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                    <span className="ml-2 text-xs text-muted-foreground font-mono">mandate_parser.exe</span>
                  </div>
                </div>
                
                <UploadZone
                  title="Drop Investment Mandate"
                  subtitle="Fund mandate, thesis brief, or portfolio strategy document"
                  acceptedTypes={[".pdf", ".doc", ".docx", ".txt"]}
                  onFileUpload={handleFileUpload}
                  isProcessing={isProcessing}
                  className="min-h-[160px] rounded-t-none"
                />
              </div>

              {/* Thesis Parameters Form */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-5">
                  Thesis Parameters
                </h2>

                <div className="space-y-4">
                  <FormField
                    label="Investment Firm Name"
                    value={formData.firm_name}
                    placeholder="Your firm name"
                    status={hasAutoFilled && !followUpQuestions.includes(InvestorTemplateQuestions.firm_name) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("firm_name", v)}
                  />

                  <FormField
                    label="Target Investment Stages"
                    value={formData.investment_stage}
                    type="select"
                    options={[
                      "Pre-Seed",
                      "Seed",
                      "Pre-Seed, Seed",
                      "Series A",
                      "Seed, Series A",
                      "Series B+",
                    ]}
                    status={hasAutoFilled && !followUpQuestions.includes(InvestorTemplateQuestions.investment_stage) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("investment_stage", v)}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <DollarSign className="w-4 h-4 text-muted-foreground" />
                        Ticket Size Range
                      </label>
                      <input
                        type="text"
                        value={formData.ticket_size}
                        onChange={(e) => handleFieldChange("ticket_size", e.target.value)}
                        placeholder="e.g., $500K - $3M"
                        className={cn(
                          "w-full px-4 py-3 rounded-xl bg-input border transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                          hasAutoFilled && !followUpQuestions.includes(InvestorTemplateQuestions.ticket_size) ? "border-emerald-500/30" : "border-border"
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Target className="w-4 h-4 text-muted-foreground" />
                        Focus Areas
                      </label>
                      <input
                        type="text"
                        value={formData.focus_areas}
                        onChange={(e) => handleFieldChange("focus_areas", e.target.value)}
                        placeholder="e.g., Fintech, SaaS"
                        className={cn(
                          "w-full px-4 py-3 rounded-xl bg-input border transition-all duration-200 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50",
                          hasAutoFilled && !followUpQuestions.includes(InvestorTemplateQuestions.focus_areas) ? "border-emerald-500/30" : "border-border"
                        )}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Missing Fields Alert */}
              {hasMissingFields && (
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium text-amber-400">
                      Strategic Input Required
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {followUpQuestions.map((question, index) => {
                      const fieldKey = Object.keys(InvestorTemplateQuestions).find(
                        (key) => InvestorTemplateQuestions[key as keyof typeof InvestorTemplateQuestions] === question
                      ) as keyof FormData;
                      
                      if (!fieldKey) return null;

                      return (
                        <FormField
                          key={index}
                          label={question}
                          value={formData[fieldKey]}
                          type={fieldKey === "value_add" || fieldKey === "focus_areas" ? "textarea" : "text"}
                          placeholder="Please provide this information"
                          status="required"
                          onChange={(v) => handleFieldChange(fieldKey, v)}
                        />
                      );
                    })}

                    {/* Explicitly show value_add if it's not in followUpQuestions but still needed as part of the form */}
                    {followUpQuestions.length > 0 && !followUpQuestions.includes(InvestorTemplateQuestions.value_add) && (
                      <FormField
                        label="What strategic non-financial assets can you provide to portfolio companies?"
                        value={formData.value_add}
                        type="textarea"
                        placeholder="e.g., Enterprise customer intros, technical advisors, go-to-market support, regulatory expertise..."
                        status={hasAutoFilled ? "auto-filled" : "optional"}
                        onChange={(v) => handleFieldChange("value_add", v)}
                      />
                    )}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                size="lg"
                className={cn(
                  "w-full h-14 gap-3 text-base transition-all duration-300",
                  fileUploaded
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-500/90 hover:to-orange-500/90 text-white"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
                disabled={!fileUploaded}
              >
                <Lock className="w-5 h-5" />
                Activate Deal-Flow Pipeline
              </Button>
            </div>

            {/* Right Column: Reranked Deal-Flow */}
            <div className="lg:col-span-3">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Reranked Deal-Flow Pipeline
                  </h2>
                  <span className="text-xs text-muted-foreground">
                    Sorted by Vector Proximity Score
                  </span>
                </div>

                {fileUploaded ? (
                  <div className="space-y-4">
                    {mockStartupMatches.map((startup, index) => (
                      <div
                        key={index}
                        className="p-5 rounded-2xl bg-background border border-border hover:border-amber-500/30 transition-all duration-300"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                              <Sparkles className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-foreground">{startup.name}</h4>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{startup.industry}</span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                                <span>{startup.stage}</span>
                                <span className="w-1 h-1 rounded-full bg-muted-foreground" />
                                <span className="text-amber-400">Seeking {startup.seeking}</span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground">Proximity</span>
                              <span className={cn(
                                "text-lg font-bold",
                                startup.score >= 90 ? "text-emerald-400" : 
                                startup.score >= 80 ? "text-amber-400" : "text-muted-foreground"
                              )}>
                                {startup.score}%
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2 mb-4">
                          {startup.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-1 text-xs rounded-lg bg-secondary text-secondary-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>

                        {/* AI Reasoning Summary Block */}
                        <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <MessageSquare className="w-4 h-4 text-amber-400" />
                            <span className="text-xs font-medium text-amber-400">
                              AI Reasoning Summary
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground italic leading-relaxed">
                            {startup.reasoning}
                          </p>
                        </div>

                        <div className="mt-4 flex items-center gap-2">
                          <Button
                            size="sm"
                            className="flex-1 bg-amber-500 hover:bg-amber-500/90 text-white"
                          >
                            Request Intro
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-border hover:bg-secondary"
                          >
                            View Deck
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-border hover:bg-secondary"
                          >
                            Save
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4">
                      <TrendingUp className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Deal-Flow Awaiting
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Upload your investment mandate to activate AI-powered startup matching based on your thesis parameters.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
