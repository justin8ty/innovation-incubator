"use client"

import { useState } from "react"
import { User, Lock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { UploadZone } from "@/components/shared/upload-zone"
import { FormField } from "@/components/shared/form-field"
import { cn } from "@/lib/utils"

interface FormData {
  name: string
  contact_email: string
  skills: string
  experience_level: string
  core_projects: string
  aspirations: string
}

const InnovatorTemplateQuestions = {
  name: "What is your full name?",
  contact_email: "What is your preferred contact email address?",
  skills: "What are your top 3 strongest technical or business skills?",
  experience_level: "What is your current professional experience level (e.g., Student, Junior, Senior)?",
  core_projects: "Could you briefly list or describe one or two past projects you have worked on?",
  aspirations: "What are you looking to achieve from this ecosystem (e.g., find a co-founder, join a startup)?",
}

export default function InnovatorPage() {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    name: "",
    contact_email: "",
    skills: "",
    experience_level: "",
    core_projects: "",
    aspirations: "",
  })

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    
    const formDataObj = new FormData()
    formDataObj.append("file", file)
    formDataObj.append("role", "innovator")

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
        name: data.name || "",
        contact_email: data.contact_email || "",
        skills: Array.isArray(data.skills) ? data.skills.join(", ") : "",
        experience_level: data.experience_level || "",
        core_projects: Array.isArray(data.core_projects) ? data.core_projects.join("\n") : "",
        aspirations: data.aspirations || "",
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
              <User className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Innovator Portal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Individual Talent Workspace
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Upload your credentials and let AI verify your profile metrics for seamless ecosystem matching.
            </p>
          </div>

          {/* Split Pane Layout */}
          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Upload Zone */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Document Ingestion
                </h2>
                <UploadZone
                  title="Drop Your CV / Resume"
                  subtitle="AI will extract and structure your professional profile"
                  acceptedTypes={[".pdf", ".doc", ".docx"]}
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
                      <h3 className="font-semibold text-foreground">Extraction Complete</h3>
                      <p className="text-sm text-muted-foreground">AI successfully parsed your document</p>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Fields extracted</span>
                      <span className="text-foreground font-medium">{6 - followUpQuestions.length} of 6</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Confidence score</span>
                      <span className="text-emerald-400 font-medium">94%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Manual input needed</span>
                      <span className="text-amber-400 font-medium">{followUpQuestions.length} fields</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Verification Form */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-xl font-semibold text-foreground mb-6">
                  Profile Verification Matrix
                </h2>

                <div className="space-y-5">
                  <FormField
                    label="Full Name"
                    value={formData.name}
                    placeholder="Your full name"
                    status={hasAutoFilled && !followUpQuestions.includes(InnovatorTemplateQuestions.name) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("name", v)}
                  />

                  <FormField
                    label="Contact Email"
                    value={formData.contact_email}
                    type="email"
                    placeholder="your@email.com"
                    status={hasAutoFilled && !followUpQuestions.includes(InnovatorTemplateQuestions.contact_email) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("contact_email", v)}
                  />

                  <FormField
                    label="Technical/Business Skills"
                    value={formData.skills}
                    type="textarea"
                    placeholder="List your key skills"
                    status={hasAutoFilled && !followUpQuestions.includes(InnovatorTemplateQuestions.skills) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("skills", v)}
                  />

                  <FormField
                    label="Experience Level"
                    value={formData.experience_level}
                    type="select"
                    options={[
                      "Student",
                      "Junior",
                      "Senior",
                      "Expert",
                    ]}
                    status={hasAutoFilled && !followUpQuestions.includes(InnovatorTemplateQuestions.experience_level) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("experience_level", v)}
                  />

                  <FormField
                    label="Core Projects"
                    value={formData.core_projects}
                    type="textarea"
                    placeholder="Describe your most impactful projects"
                    status={hasAutoFilled && !followUpQuestions.includes(InnovatorTemplateQuestions.core_projects) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("core_projects", v)}
                  />
                </div>
              </div>

              {/* Missing Context Alert */}
              {hasMissingFields && (
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium text-amber-400">
                      Additional Context Required
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mb-5">
                    The following information could not be extracted from your document. Please provide manually.
                  </p>

                  <div className="space-y-5">
                    {followUpQuestions.map((question, index) => {
                      const fieldKey = Object.keys(InnovatorTemplateQuestions).find(
                        (key) => InnovatorTemplateQuestions[key as keyof typeof InnovatorTemplateQuestions] === question
                      ) as keyof FormData;
                      
                      if (!fieldKey) return null;

                      return (
                        <FormField
                          key={index}
                          label={question}
                          value={formData[fieldKey]}
                          type={fieldKey === "skills" || fieldKey === "core_projects" || fieldKey === "aspirations" ? "textarea" : "text"}
                          placeholder="Please provide this information"
                          status="required"
                          onChange={(v) => handleFieldChange(fieldKey, v)}
                        />
                      );
                    })}
                    
                    {/* Explicitly show aspirations if it's not in followUpQuestions but still needed as part of the form */}
                    {followUpQuestions.length > 0 && !followUpQuestions.includes(InnovatorTemplateQuestions.aspirations) && (
                      <FormField
                        label="What are you looking to achieve from this ecosystem?"
                        value={formData.aspirations}
                        type="textarea"
                        placeholder="e.g., Find a co-founder, join an early-stage startup, mentor others..."
                        status={hasAutoFilled ? "auto-filled" : "optional"}
                        onChange={(v) => handleFieldChange("aspirations", v)}
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
                    ? "bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
                disabled={!fileUploaded}
              >
                <Lock className="w-5 h-5" />
                Lock Profile Into Vector Space
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
