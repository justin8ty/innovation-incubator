"use client"

import { useState } from "react"
import { Users, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { UploadZone } from "@/components/shared/upload-zone"
import { FormField } from "@/components/shared/form-field"
import { cn } from "@/lib/utils"

interface FormData {
  name: string
  expertise_areas: string
  engagement_preference: string
}

const MentorTemplateQuestions = {
  name: "What is your full name?",
  expertise_areas: "What are your primary areas of industry or technical expertise?",
  engagement_preference: "Do you prefer to mentor startups 1-on-1 directly ('startup'), participate as an advisor/judge in broader corporate hackathons ('campaign'), or 'both'?",
}

export default function MentorPage() {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    name: "",
    expertise_areas: "",
    engagement_preference: "",
  })

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    
    const formDataObj = new FormData()
    formDataObj.append("file", file)
    formDataObj.append("role", "mentor")

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
        name: data.name || "",
        expertise_areas: Array.isArray(data.expertise_areas) ? data.expertise_areas.join(", ") : (data.expertise_areas || ""),
        engagement_preference: data.engagement_preference || "",
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

  const hasAutoFilled = fileUploaded && formData.name
  const hasMissingFields = fileUploaded && followUpQuestions.length > 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Mentor Portal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Expert Advisory Space
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Upload your profile or LinkedIn PDF to verify your expertise and set your engagement preferences.
            </p>
          </div>

          {/* Split Pane Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Upload Zone */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Profile Ingestion
                </h2>
                <UploadZone
                  title="Drop Your Expert Profile"
                  subtitle="AI will extract your expertise and verification metrics"
                  acceptedTypes={[".pdf"]}
                  onFileUpload={handleFileUpload}
                  isProcessing={isProcessing}
                  className="min-h-[300px]"
                />
              </div>

              {/* Status Card */}
              {fileUploaded && (
                <div className="p-6 rounded-2xl bg-card border border-emerald-500/20">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-foreground">Verification Ready</h3>
                      <p className="text-sm text-muted-foreground">AI has structured your advisor profile</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expertise verified</span>
                      <span className="text-foreground font-medium">{formData.expertise_areas ? "Yes" : "Pending"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence level</span>
                      <span className="text-emerald-400 font-medium">92%</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Verification Form */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Expert Verification Matrix
                </h2>

                <div className="space-y-5">
                  <FormField
                    label="Full Name"
                    value={formData.name}
                    placeholder="Your full name"
                    status={hasAutoFilled && !followUpQuestions.includes(MentorTemplateQuestions.name) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("name", v)}
                  />

                  <FormField
                    label="Expertise Areas"
                    value={formData.expertise_areas}
                    type="textarea"
                    placeholder="e.g., Scaling, Product Strategy, Fundraising..."
                    status={hasAutoFilled && !followUpQuestions.includes(MentorTemplateQuestions.expertise_areas) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("expertise_areas", v)}
                  />

                  <FormField
                    label="Engagement Preference"
                    value={formData.engagement_preference}
                    type="select"
                    options={[
                      "startup",
                      "campaign",
                      "both",
                    ]}
                    status={hasAutoFilled && !followUpQuestions.includes(MentorTemplateQuestions.engagement_preference) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("engagement_preference", v)}
                  />
                </div>
              </div>

              {/* Missing Context Alert */}
              {hasMissingFields && (
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium text-amber-400">
                      Expertise Context Required
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    Please provide more specific details to finalize your advisor ranking.
                  </p>

                  <div className="space-y-5">
                    {followUpQuestions.map((question, index) => {
                      const fieldKey = Object.keys(MentorTemplateQuestions).find(
                        (key) => MentorTemplateQuestions[key as keyof typeof MentorTemplateQuestions] === question
                      ) as keyof FormData;
                      
                      if (!fieldKey) return null;

                      return (
                        <FormField
                          key={index}
                          label={question}
                          value={formData[fieldKey]}
                          type={fieldKey === "expertise_areas" ? "textarea" : fieldKey === "engagement_preference" ? "select" : "text"}
                          options={fieldKey === "engagement_preference" ? ["startup", "campaign", "both"] : undefined}
                          placeholder="Please provide this information"
                          status="required"
                          onChange={(v) => handleFieldChange(fieldKey, v)}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Action Button */}
              <Button
                size="lg"
                className={cn(
                  "w-full h-14 gap-3 text-base transition-all duration-300",
                  fileUploaded
                    ? "bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
                disabled={!fileUploaded}
              >
                <Lock className="w-5 h-5" />
                Finalize Expert Onboarding
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
