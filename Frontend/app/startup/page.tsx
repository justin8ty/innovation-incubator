"use client"

import { useState, useRef } from "react"
import { Rocket, Lock, ChevronDown, ChevronUp, Sparkles, Video, Mic, StopCircle, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { UploadZone } from "@/components/shared/upload-zone"
import { FormField } from "@/components/shared/form-field"
import { MatchCard } from "@/components/shared/match-card"
import { cn } from "@/lib/utils"

interface FormData {
  startup_name: string
  industry: string
  funding_stage: string
  problem_statement: string
  current_ask: string
}

const mockMatches = [
  {
    name: "Sarah Chen",
    type: "mentor" as const,
    score: 94,
    tags: ["Fintech Expert", "Ex-Stripe", "Series A"],
    reasoning: "Sarah&apos;s deep fintech experience at Stripe and track record advising 12+ startups through Series A aligns perfectly with your current funding stage and payment infrastructure focus.",
  },
  {
    name: "AWS Activate",
    type: "service-provider" as const,
    score: 91,
    tags: ["Cloud Credits", "$100K Package", "AI/ML"],
    reasoning: "Your ML-heavy tech stack and early-stage status qualifies for AWS Activate&apos;s $100K cloud credit package, specifically designed for AI-focused startups.",
  },
  {
    name: "TechStars Chicago",
    type: "mentor" as const,
    score: 88,
    tags: ["Accelerator", "B2B Focus", "Demo Day"],
    reasoning: "TechStars Chicago&apos;s B2B enterprise focus matches your target market. Their demo day connections could fast-track your Series A timeline.",
  },
  {
    name: "Google Cloud for Startups",
    type: "service-provider" as const,
    score: 85,
    tags: ["GCP Credits", "AI APIs", "BigQuery"],
    reasoning: "Your data analytics requirements align with Google Cloud&apos;s BigQuery and Vertex AI offerings. The startup program offers $200K in credits over 2 years.",
  },
  {
    name: "Marcus Rivera",
    type: "mentor" as const,
    score: 82,
    tags: ["Growth Expert", "Ex-Uber", "Marketplace"],
    reasoning: "Marcus scaled Uber&apos;s marketplace in LATAM. His growth playbook could help optimize your two-sided marketplace dynamics.",
  },
]

const StartupTemplateQuestions = {
  startup_name: "What is the name of your startup?",
  industry: "What industry or market vertical does your startup operate in?",
  funding_stage: "What is your current development or funding stage (e.g., MVP, Pre-Seed, Seed)?",
  problem_statement: "In one or two sentences, what specific problem does your product solve?",
  current_ask: "What is your biggest immediate need right now from the ecosystem (e.g., cloud credits, mentorship, funding)?",
}

export default function StartupPage() {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [accordionOpen, setAccordionOpen] = useState(true)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    startup_name: "",
    industry: "",
    funding_stage: "",
    problem_statement: "",
    current_ask: "",
  })

  // NEW: Pitch Recording State
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [pitchReport, setPitchReport] = useState<any>(null)
  const [isAnalyzingPitch, setIsAnalyzingPitch] = useState(false)

  const startRecording = async () => {
    setPitchReport(null)
    const chunks: Blob[] = []
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      streamRef.current = stream
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()
      }

      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" })
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: "video/webm" })
        await uploadPitch(blob)
      }

      setMediaRecorder(recorder)
      recorder.start()
      setIsRecording(true)
    } catch (err) {
      console.error("Error accessing media devices:", err)
      alert("Could not access camera/microphone. Please ensure permissions are granted.")
    }
  }

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop()
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    
    setIsRecording(false)
  }

  const uploadPitch = async (blob: Blob) => {
    setIsAnalyzingPitch(true)
    const formDataObj = new FormData()
    formDataObj.append("file", blob, "pitch.webm")

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/pitch-analyze", {
        method: "POST",
        body: formDataObj,
      })

      if (!response.ok) throw new Error("Pitch analysis failed")
      
      const data = await response.json()
      setPitchReport(data)
    } catch (error) {
      console.error("Error analyzing pitch:", error)
      alert("Failed to analyze pitch. Please check if the backend is running.")
    } finally {
      setIsAnalyzingPitch(false)
    }
  }

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    
    const formDataObj = new FormData()
    formDataObj.append("file", file)
    formDataObj.append("role", "startup")

    try {
      const response = await fetch("http://127.0.0.1:8000/api/v1/upload", {
        method: "POST",
        body: formDataObj,
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: "Unknown server error" }))
        console.error("Upload failed with status:", response.status, errorData)
        throw new Error(errorData.detail || `Upload failed with status ${response.status}`)
      }

      const data = await response.json()
      
      setFileUploaded(true)
      setFollowUpQuestions(data.follow_up_questions || [])
      setFormData({
        startup_name: data.startup_name || "",
        industry: data.industry || "",
        funding_stage: data.funding_stage || "",
        problem_statement: data.problem_statement || "",
        current_ask: Array.isArray(data.current_ask) ? data.current_ask.join(", ") : (data.current_ask || ""),
      })
    } catch (error: any) {
      console.error("Error uploading file:", error)
      alert(`Failed to extract data: ${error.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleFieldChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const hasAutoFilled = fileUploaded && formData.startup_name
  const hasMissingFields = fileUploaded && followUpQuestions.length > 0

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <span className="text-sm text-emerald-400 font-medium">Startup Matrix</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">
              Founder Dashboard
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Upload your pitch deck and let AI match you with mentors, resources, and opportunities.
            </p>
          </div>

          <div className="grid lg:grid-cols-5 gap-8">
            {/* Left Column: Upload + Form */}
            <div className="lg:col-span-2 space-y-6">
              {/* NEW: Live Pitching Card */}
              <div className="p-6 rounded-2xl bg-gradient-to-br from-indigo-500/15 to-purple-500/15 border border-indigo-500/30 shadow-lg shadow-indigo-500/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    <Video className="w-5 h-5 text-indigo-400" />
                    Live AI Pitching
                  </h2>
                  {isRecording && (
                    <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold animate-pulse ring-1 ring-red-500/50">
                      REC
                    </span>
                  )}
                </div>
                
                <div className="relative aspect-video rounded-xl bg-black/60 border border-white/10 overflow-hidden mb-4 shadow-inner flex items-center justify-center group">
                  {/* Live Camera Feed (Mirrored) */}
                  <video 
                    ref={videoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                      "absolute inset-0 w-full h-full object-cover transition-all duration-500 scale-x-[-1]",
                      isRecording ? "opacity-100 scale-100" : "opacity-0 pointer-events-none scale-105"
                    )}
                  />

                  {/* Recorded Video Playback */}
                  {pitchReport && !isRecording && !isAnalyzingPitch && (
                    <video 
                      src={`http://127.0.0.1:8000${pitchReport.video_url}`}
                      controls
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  )}

                  {!isRecording && !isAnalyzingPitch && !pitchReport && (
                    <div className="text-center p-6 transition-all duration-300 group-hover:scale-110">
                      <div className="w-14 h-14 rounded-full bg-indigo-500/20 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-500/20">
                        <Mic className="w-7 h-7 text-indigo-400" />
                      </div>
                      <p className="text-sm text-muted-foreground font-medium">
                        Ready to pitch? Click below to start.
                      </p>
                    </div>
                  )}

                  {isRecording && (
                    <div className="absolute top-4 left-4 flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/90 text-white text-[10px] font-bold animate-pulse z-20 shadow-lg">
                      LIVE STREAM
                    </div>
                  )}

                  {isAnalyzingPitch && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-30">
                      <div className="text-center">
                        <Sparkles className="w-12 h-12 text-indigo-400 mx-auto mb-3 animate-bounce" />
                        <p className="text-sm font-bold text-white tracking-tight">Chirp 3 Transcribing & Summarizing...</p>
                        <p className="text-[10px] text-indigo-300/70 mt-1 uppercase tracking-widest">Processing Audio Vectors</p>
                      </div>
                    </div>
                  )}
                </div>

                {!isRecording ? (
                  <Button 
                    onClick={startRecording}
                    disabled={isAnalyzingPitch}
                    className="w-full bg-indigo-500 hover:bg-indigo-600 text-white gap-2 h-12 shadow-lg shadow-indigo-500/20 transition-all active:scale-95"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    Start Live Pitch Session
                  </Button>
                ) : (
                  <Button 
                    onClick={stopRecording}
                    variant="destructive"
                    className="w-full gap-2 h-12 shadow-lg shadow-red-500/20 transition-all active:scale-95"
                  >
                    <StopCircle className="w-4 h-4" />
                    Stop & Analyze Recording
                  </Button>
                )}

                {pitchReport && (
                  <div className="mt-6 p-4 rounded-xl bg-white/5 border border-white/10 animate-in fade-in slide-in-from-bottom-4 shadow-xl">
                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      AI Pitch Analysis
                    </h3>
                    <p className="text-sm leading-relaxed mb-4 italic text-foreground/90 border-l-2 border-indigo-500/50 pl-3 py-1 bg-indigo-500/5">
                      &quot;{pitchReport.analysis.summary}&quot;
                    </p>
                    
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1">Key Strengths</p>
                        <ul className="text-[11px] text-muted-foreground list-disc pl-3">
                          {pitchReport.analysis.key_strengths.map((s: string, i: number) => (
                            <li key={i}>{s}</li>
                          ))}
                        </ul>
                      </div>
                      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                        <p className="text-[10px] text-amber-400 font-bold uppercase mb-1">Ecosystem Fit</p>
                        <div className="flex items-end gap-1">
                          <p className="text-2xl font-black text-foreground leading-none">{pitchReport.analysis.ecosystem_fit}</p>
                          <p className="text-[10px] text-muted-foreground pb-0.5">/ 10</p>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4 p-3 rounded-lg bg-indigo-500/5 border border-indigo-500/10">
                      <p className="text-[10px] text-indigo-400 font-bold uppercase mb-1">Raw Transcript</p>
                      <p className="text-[11px] text-muted-foreground line-clamp-3 italic">
                        &quot;{pitchReport.transcript || "No transcript returned from server."}&quot;
                      </p>
                    </div>

                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full text-xs h-8 border-white/10 hover:bg-white/5 transition-colors"
                      onClick={() => alert(pitchReport.transcript)}
                    >
                      View Full Transcription Report
                    </Button>
                  </div>
                )}
              </div>

              {/* Upload Zone */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  Pitch Deck Dropzone
                </h2>
                <UploadZone
                  title="Drop Your Pitch Deck"
                  subtitle="AI will extract startup data for ecosystem matching"
                  acceptedTypes={[".pdf", ".ppt", ".pptx"]}
                  onFileUpload={handleFileUpload}
                  isProcessing={isProcessing}
                  className="min-h-[200px]"
                />
              </div>

              {/* Verification Form */}
              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
                <h2 className="text-lg font-semibold mb-5">
                  AI-Extracted Form Validation
                </h2>

                <div className="space-y-4">
                  <FormField
                    label="Startup Name"
                    value={formData.startup_name}
                    placeholder="Your startup name"
                    status={hasAutoFilled && !followUpQuestions.includes(StartupTemplateQuestions.startup_name) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("startup_name", v)}
                  />

                  <FormField
                    label="Target Industry Vertical"
                    value={formData.industry}
                    type="select"
                    options={[
                      "Fintech",
                      "Healthcare",
                      "EdTech",
                      "E-Commerce",
                      "SaaS",
                      "AI/ML",
                      "CleanTech",
                      "Other",
                    ]}
                    status={hasAutoFilled && !followUpQuestions.includes(StartupTemplateQuestions.industry) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("industry", v)}
                  />

                  <FormField
                    label="Current Funding Stage"
                    value={formData.funding_stage}
                    type="select"
                    options={[
                      "Pre-Seed",
                      "Seed",
                      "Series A",
                      "Series B+",
                      "Bootstrapped",
                    ]}
                    status={hasAutoFilled && !followUpQuestions.includes(StartupTemplateQuestions.funding_stage) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("funding_stage", v)}
                  />

                  <FormField
                    label="Problem/Solution Summary"
                    value={formData.problem_statement}
                    type="textarea"
                    placeholder="Describe the problem and your solution"
                    status={hasAutoFilled && !followUpQuestions.includes(StartupTemplateQuestions.problem_statement) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("problem_statement", v)}
                  />
                </div>
              </div>

              {/* Contextual Fallback Accordion */}
              {hasMissingFields && (
                <div className="rounded-2xl bg-amber-500/5 border border-amber-500/30 overflow-hidden shadow-sm">
                  <button
                    onClick={() => setAccordionOpen(!accordionOpen)}
                    className="w-full p-4 flex items-center justify-between text-left"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                      <span className="text-sm font-medium text-amber-400">
                        Ecosystem Matching Parameters
                      </span>
                    </div>
                    {accordionOpen ? (
                      <ChevronUp className="w-5 h-5 text-amber-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-amber-400" />
                    )}
                  </button>
                  
                  {accordionOpen && (
                    <div className="px-4 pb-4">
                      <div className="space-y-4">
                        {followUpQuestions.map((question, index) => {
                          const fieldKey = Object.keys(StartupTemplateQuestions).find(
                            (key) => StartupTemplateQuestions[key as keyof typeof StartupTemplateQuestions] === question
                          ) as keyof FormData;
                          
                          if (!fieldKey) return null;

                          return (
                            <FormField
                              key={index}
                              label={question}
                              value={formData[fieldKey]}
                              type={fieldKey === "problem_statement" || fieldKey === "current_ask" ? "textarea" : "text"}
                              placeholder="Please provide this information"
                              status="required"
                              onChange={(v) => handleFieldChange(fieldKey, v)}
                            />
                          );
                        })}

                        {/* Explicitly show current_ask if it's not in followUpQuestions but still needed as part of the form */}
                        {followUpQuestions.length > 0 && !followUpQuestions.includes(StartupTemplateQuestions.current_ask) && (
                          <FormField
                            label="What is your biggest immediate need right now from the ecosystem?"
                            value={formData.current_ask}
                            type="textarea"
                            placeholder="e.g., Cloud credits, technical mentorship, funding connections, hiring support..."
                            status={hasAutoFilled ? "auto-filled" : "optional"}
                            onChange={(v) => handleFieldChange("current_ask", v)}
                          />
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Action Button */}
              <Button
                size="lg"
                className={cn(
                  "w-full h-14 gap-3 text-base font-bold transition-all duration-300 shadow-lg",
                  fileUploaded
                    ? "bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-500/90 hover:to-cyan-500/90 text-white scale-[1.02]"
                    : "bg-secondary text-muted-foreground cursor-not-allowed opacity-50"
                )}
                disabled={!fileUploaded}
              >
                <Lock className="w-5 h-5" />
                Activate Startup Vector Profile
              </Button>
            </div>

            {/* Right Column: Match Pipeline */}
            <div className="lg:col-span-3">
              <div className="p-6 rounded-2xl bg-card border border-border shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold">
                    Live Pipeline Matcher
                  </h2>
                  <span className="text-xs text-muted-foreground font-mono">
                    TOP 5 MATH-MATCHED VECTORS
                  </span>
                </div>

                {fileUploaded ? (
                  <div className="space-y-4">
                    {mockMatches.map((match, index) => (
                      <MatchCard
                        key={index}
                        name={match.name}
                        type={match.type}
                        score={match.score}
                        tags={match.tags}
                        reasoning={match.reasoning}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 shadow-inner">
                      <Rocket className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No Matches Yet
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Upload your pitch deck or complete a live session to activate AI-powered matching.
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
