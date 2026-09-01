"use client"

import { useState } from "react"
import { Building2, Lock, CheckCircle2, Clock, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/shared/navigation"
import { UploadZone } from "@/components/shared/upload-zone"
import { FormField } from "@/components/shared/form-field"
import { cn } from "@/lib/utils"
import { API_BASE_URL } from "@/lib/api"

interface FormData {
  company_name: string
  campaign_name: string
  target_audience: string
  resources_provided: string
  constraints: string
}

interface TelemetryRow {
  startup: string
  perkAsset: string
  status: "claimed" | "pending"
  date: string
}

const mockTelemetry: TelemetryRow[] = [
  { startup: "NexaPay Technologies", perkAsset: "AWS $50K Credits", status: "claimed", date: "2024-01-15" },
  { startup: "HealthSync AI", perkAsset: "Google Cloud AI APIs", status: "pending", date: "2024-01-14" },
  { startup: "EduFlow Platform", perkAsset: "Stripe Atlas Setup", status: "claimed", date: "2024-01-13" },
  { startup: "GreenRoute Logistics", perkAsset: "AWS $50K Credits", status: "pending", date: "2024-01-12" },
  { startup: "DataMesh Analytics", perkAsset: "Technical Mentorship", status: "claimed", date: "2024-01-11" },
  { startup: "CryptoGuard Security", perkAsset: "Security Audit Package", status: "pending", date: "2024-01-10" },
]

const CompanyTemplateQuestions = {
  company_name: "What is your organization's name?",
  campaign_name: "What is the official title of the campaign or initiative you are running?",
  target_audience: "What type of startup or innovator is your ideal participant for this initiative?",
  resources_provided: "What specific perks, resources, or API access are you offering to the participants?",
  constraints: "What are the eligibility constraints or limitations for this program (e.g., location, stage)?",
}

export default function CompanyPage() {
  const [fileUploaded, setFileUploaded] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([])
  const [formData, setFormData] = useState<FormData>({
    company_name: "",
    campaign_name: "",
    target_audience: "",
    resources_provided: "",
    constraints: "",
  })

  const handleFileUpload = async (file: File) => {
    setIsProcessing(true)
    
    const formDataObj = new FormData()
    formDataObj.append("file", file)
    formDataObj.append("role", "company")

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/upload`, {
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
        company_name: data.company_name || "",
        campaign_name: data.campaign_name || "",
        target_audience: data.target_audience || "",
        resources_provided: Array.isArray(data.resources_provided) ? data.resources_provided.join(", ") : (data.resources_provided || ""),
        constraints: data.constraints || "",
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

  const hasAutoFilled = fileUploaded && formData.company_name
  const hasMissingFields = fileUploaded && followUpQuestions.length > 0

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <main className="pt-24 pb-16 px-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-4">
              <Building2 className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Campaign Ops Portal</span>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-2">
              Campaign Management
            </h1>
            <p className="text-muted-foreground text-lg max-w-2xl">
              Design accelerator campaigns, manage resource perks, and track active ecosystem connections.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left Column: Upload + Form */}
            <div className="space-y-6">
              {/* Upload Zone */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Campaign Brief Ingestion
                </h2>
                <UploadZone
                  title="Drop Campaign Documents"
                  subtitle="Upload perk documents, API resource manuals, or challenge briefs"
                  acceptedTypes={[".pdf", ".doc", ".docx", ".txt"]}
                  onFileUpload={handleFileUpload}
                  isProcessing={isProcessing}
                  className="min-h-[180px]"
                />
              </div>

              {/* Structured Perks Form */}
              <div className="p-6 rounded-2xl bg-card border border-border">
                <h2 className="text-lg font-semibold text-foreground mb-5">
                  Structured Perks Form View
                </h2>

                <div className="space-y-4">
                  <FormField
                    label="Corporate Providing Entity"
                    value={formData.company_name}
                    placeholder="Your company name"
                    status={hasAutoFilled && !followUpQuestions.includes(CompanyTemplateQuestions.company_name) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("company_name", v)}
                  />

                  <FormField
                    label="Official Initiative Title"
                    value={formData.campaign_name}
                    placeholder="e.g., AWS Activate for Startups"
                    status={hasAutoFilled && !followUpQuestions.includes(CompanyTemplateQuestions.campaign_name) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("campaign_name", v)}
                  />

                  <FormField
                    label="Target Startup Audience"
                    value={formData.target_audience}
                    type="select"
                    options={[
                      "All Startups",
                      "AI/ML Startups",
                      "Fintech Startups",
                      "Healthcare Startups",
                      "Climate Tech Startups",
                      "Enterprise SaaS",
                      "Consumer Tech",
                    ]}
                    status={hasAutoFilled && !followUpQuestions.includes(CompanyTemplateQuestions.target_audience) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("target_audience", v)}
                  />

                  <FormField
                    label="Tangible Resources/Perks Provided"
                    value={formData.resources_provided}
                    type="textarea"
                    placeholder="List all resources and perks included"
                    status={hasAutoFilled && !followUpQuestions.includes(CompanyTemplateQuestions.resources_provided) ? "auto-filled" : "optional"}
                    onChange={(v) => handleFieldChange("resources_provided", v)}
                  />
                </div>
              </div>

              {/* Missing Context Section */}
              {hasMissingFields && (
                <div className="p-6 rounded-2xl bg-amber-500/5 border border-amber-500/30">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span className="text-sm font-medium text-amber-400">
                      Manual Input Required
                    </span>
                  </div>
                  
                  <div className="space-y-4">
                    {followUpQuestions.map((question, index) => {
                      const fieldKey = Object.keys(CompanyTemplateQuestions).find(
                        (key) => CompanyTemplateQuestions[key as keyof typeof CompanyTemplateQuestions] === question
                      ) as keyof FormData;
                      
                      if (!fieldKey) return null;

                      return (
                        <FormField
                          key={index}
                          label={question}
                          value={formData[fieldKey]}
                          type={fieldKey === "resources_provided" || fieldKey === "constraints" ? "textarea" : "text"}
                          placeholder="Please provide this information"
                          status="required"
                          onChange={(v) => handleFieldChange(fieldKey, v)}
                        />
                      );
                    })}
                    
                    {/* Explicitly show constraints if it's not in followUpQuestions but still needed or just as part of the form */}
                    {followUpQuestions.length > 0 && !followUpQuestions.includes(CompanyTemplateQuestions.constraints) && (
                       <FormField
                       label="Eligibility constraints or limitations"
                       value={formData.constraints}
                       type="textarea"
                       placeholder="e.g., Must be pre-Series A, less than 2 years old, US-based..."
                       status={hasAutoFilled ? "auto-filled" : "optional"}
                       onChange={(v) => handleFieldChange("constraints", v)}
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
                    ? "bg-gradient-to-r from-primary to-cyan-500 hover:from-primary/90 hover:to-cyan-500/90 text-white"
                    : "bg-secondary text-muted-foreground cursor-not-allowed"
                )}
                disabled={!fileUploaded}
              >
                <Lock className="w-5 h-5" />
                Publish Campaign to Ecosystem
              </Button>
            </div>

            {/* Right Column: Telemetry Table */}
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-card border border-border">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-semibold text-foreground">
                    Ecosystem Telemetry
                  </h2>
                  <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-secondary">
                    {mockTelemetry.length} Active Connections
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Startup
                        </th>
                        <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Matched Perk
                        </th>
                        <th className="pb-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {mockTelemetry.map((row, index) => (
                        <tr key={index} className="group hover:bg-secondary/30 transition-colors">
                          <td className="py-4">
                            <div>
                              <p className="text-sm font-medium text-foreground">{row.startup}</p>
                              <p className="text-xs text-muted-foreground">{row.date}</p>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="text-sm text-muted-foreground">{row.perkAsset}</span>
                          </td>
                          <td className="py-4">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
                                row.status === "claimed"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              )}
                            >
                              {row.status === "claimed" ? (
                                <CheckCircle2 className="w-3 h-3" />
                              ) : (
                                <Clock className="w-3 h-3" />
                              )}
                              {row.status === "claimed" ? "Perks Claimed" : "Pending Setup"}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-card border border-border text-center">
                  <p className="text-2xl font-bold text-foreground">156</p>
                  <p className="text-xs text-muted-foreground mt-1">Total Startups Reached</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border text-center">
                  <p className="text-2xl font-bold text-emerald-400">89</p>
                  <p className="text-xs text-muted-foreground mt-1">Perks Claimed</p>
                </div>
                <div className="p-4 rounded-xl bg-card border border-border text-center">
                  <p className="text-2xl font-bold text-amber-400">67</p>
                  <p className="text-xs text-muted-foreground mt-1">Pending Setup</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
