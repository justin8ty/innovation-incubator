import os
import json
import fitz  # PyMuPDF
import docx
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
import shutil
from fastapi.staticfiles import StaticFiles
from moviepy import VideoFileClip
from google.cloud import speech
from google.oauth2 import service_account

import vector.config
from vector.db import init_vec_table
from vector.vector_store import embed_entity, embed_campaign, embed_all_entities, embed_all_campaigns, match_for_entity, search

app = FastAPI(title="MyHack Engine AI Ingestion")

# GCP Credentials Configuration
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GCP_CREDS_PATH = os.path.join(ROOT_DIR, "gcp-credentials.json")

if os.path.exists(GCP_CREDS_PATH):
    try:
        credentials = service_account.Credentials.from_service_account_file(GCP_CREDS_PATH)
        speech_client = speech.SpeechClient(credentials=credentials)
        print("DEBUG: [SUCCESS] GCP Speech Client (v1) initialized")
    except Exception as e:
        print(f"DEBUG: [ERROR] GCP Speech Client failed: {e}")
        speech_client = None
else:
    speech_client = None

# Configure Gemini
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    # Key recovered from previous session
    GOOGLE_API_KEY = "AIzaSyBa5bw_wgYy8Z8BEAfIUGEwHGBRdJRs5Zk"

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    print(f"DEBUG: Gemini AI Engine Activated (Key: {GOOGLE_API_KEY[:10]}...)")
else:
    print("DEBUG: [CRITICAL] No Gemini API Key Found")

GEMINI_MODEL = "models/gemini-2.5-flash"

# Create assets directory
os.makedirs("assets/pitches", exist_ok=True)
app.mount("/assets", StaticFiles(directory="assets"), name="assets")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure Gemini
# Use standard environment variable name
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY")

if GOOGLE_API_KEY:
    genai.configure(api_key=GOOGLE_API_KEY)
    print("DEBUG: Gemini API configured successfully")
else:
    print("DEBUG: Gemini API Key NOT FOUND in environment variables")

ROLE_QUESTIONS = {
    "innovator": {
        "name": "What is your full name?",
        "contact_email": "What is your preferred contact email address?",
        "skills": "What are your top 3 strongest technical or business skills? (Return as an array of strings)",
        "experience_level": "What is your current professional experience level (e.g., Student, Junior, Senior)?",
        "core_projects": "Could you briefly list or describe one or two past projects you have worked on? (Return as an array of strings)",
        "aspirations": "What are you looking to achieve from this ecosystem (e.g., find a co-founder, join a startup)?",
    },
    "startup": {
        "startup_name": "What is the name of your startup?",
        "industry": "What industry or market vertical does your startup operate in?",
        "funding_stage": "What is your current development or funding stage (e.g., MVP, Pre-Seed, Seed)?",
        "problem_statement": "In one or two sentences, what specific problem does your product solve?",
        "current_ask": "What is your biggest immediate need right now from the ecosystem (e.g., cloud credits, mentorship, funding)? (Return as an array of strings)",
    },
    "company": {
        "company_name": "What is your organization's name?",
        "campaign_name": "What is the official title of the campaign or initiative you are running?",
        "target_audience": "What type of startup or innovator is your ideal participant for this initiative?",
        "resources_provided": "What specific perks, resources, or API access are you offering to the participants? (Return as an array of strings)",
        "constraints": "What are the eligibility constraints or limitations for this program (e.g., location, stage)?",
    },
    "mentor": {
        "name": "What is your full name?",
        "expertise_areas": "What are your primary areas of industry or technical expertise? (Return as an array of strings)",
        "engagement_preference": "Do you prefer to mentor startups 1-on-1 directly ('startup'), participate as an advisor/judge in broader corporate hackathons ('campaign'), or 'both'?",
    }
}

def extract_text_from_pdf(file_path):
    doc = fitz.open(file_path)
    text = ""
    for page in doc:
        text += page.get_text()
    return text

def extract_text_from_docx(file_path):
    doc = docx.Document(file_path)
    return "\n".join([para.text for para in doc.paragraphs])

@app.post("/api/v1/upload")
async def upload_document(
    file: UploadFile = File(...),
    role: str = Form(...)
):
    if role not in ROLE_QUESTIONS:
        raise HTTPException(status_code=400, detail=f"Invalid role: {role}")

    if not GOOGLE_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API Key missing")

    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        raw_text = ""
        if file.filename.lower().endswith(".pdf"):
            raw_text = extract_text_from_pdf(temp_path)
        elif file.filename.lower().endswith(".docx"):
            raw_text = extract_text_from_docx(temp_path)
        else:
            with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                raw_text = f.read()

        if not raw_text.strip():
            raise HTTPException(status_code=400, detail="Document is empty")

        questions = ROLE_QUESTIONS[role]
        system_instruction = f"""
        Extract data for the role: {role}.
        Return JSON object with these keys: {json.dumps(list(questions.keys()))}
        Rules: Populate found info, arrays for array-hints, null for missing.
        Include 'follow_up_questions' array of tracking questions for every null field.
        Reference: {json.dumps(questions)}
        Output ONLY valid JSON.
        """

        print(f"DEBUG: Processing {role} via Gemini...")
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(f"System: {system_instruction}\n\nText:\n{raw_text}")
        
        clean_text = response.text.strip()
        if "```json" in clean_text:
            clean_text = clean_text.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_text:
            clean_text = clean_text.split("```")[1].split("```")[0].strip()
        
        result = json.loads(clean_text)
        
        extracted_follow_ups = []
        for key, question in questions.items():
            if result.get(key) is None or (isinstance(result.get(key), list) and len(result.get(key)) == 0):
                result[key] = None
                extracted_follow_ups.append(question.split(" (Return as")[0].strip())
        
        result["follow_up_questions"] = extracted_follow_ups
        return result

    except Exception as e:
        print(f"DEBUG: Gemini Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/api/v1/pitch-analyze")
async def analyze_pitch(
    file: UploadFile = File(...)
):
    upload_dir = "assets/pitches"
    os.makedirs(upload_dir, exist_ok=True)
    file_name = file.filename if file.filename else "pitch.webm"
    file_path = os.path.join(upload_dir, file_name)
    audio_path = os.path.join(upload_dir, f"{os.path.splitext(file_name)[0]}.wav")
    
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    transcript = ""
    if speech_client:
        try:
            print("DEBUG: Extracting audio...")
            video = VideoFileClip(file_path)
            video.audio.write_audiofile(audio_path, fps=16000, nbytes=2, codec='pcm_s16le', ffmpeg_params=["-ac", "1"])
            video.close()
            
            with open(audio_path, "rb") as f:
                content = f.read()
            
            audio = speech.RecognitionAudio(content=content)
            config = speech.RecognitionConfig(
                encoding=speech.RecognitionConfig.AudioEncoding.LINEAR16,
                sample_rate_hertz=16000,
                language_code="en-US",
                enable_automatic_punctuation=True,
                model="latest_long", 
            )
            
            print("DEBUG: Transcribing via GCP...")
            response = speech_client.recognize(config=config, audio=audio)
            transcript = " ".join([r.alternatives[0].transcript for r in response.results])
            print(f"DEBUG: Transcript: {transcript}")
        except Exception as e:
            print(f"DEBUG: STT Error: {e}")
            transcript = "Could not transcribe audio."
    else:
        transcript = "GCP STT not configured."

    system_instruction = """
    Analyze startup pitch. Return JSON:
    {
      "summary": "2 sentences",
      "key_strengths": ["3 items"],
      "potential_risks": ["2 items"],
      "ecosystem_fit": 1-10
    }
    Output ONLY valid JSON.
    """

    try:
        print("DEBUG: Analyzing via Gemini...")
        model = genai.GenerativeModel(GEMINI_MODEL)
        response = model.generate_content(f"{system_instruction}\n\nTranscript: {transcript}")
        
        clean_resp = response.text.strip()
        if "```json" in clean_resp:
            clean_resp = clean_resp.split("```json")[1].split("```")[0].strip()
        elif "```" in clean_resp:
            clean_resp = clean_resp.split("```")[1].split("```")[0].strip()
            
        return {"transcript": transcript, "analysis": json.loads(clean_resp), "video_url": f"/assets/pitches/{file_name}"}
    except Exception as e:
        print(f"DEBUG: analysis Error: {e}")
        return {"transcript": transcript, "analysis": {"summary": "Error analyzing pitch.", "key_strengths": [], "potential_risks": [], "ecosystem_fit": 0}, "video_url": f"/assets/pitches/{file_name}"}

@app.get("/health")
async def health():
    return {"status": "ok", "api_key": GOOGLE_API_KEY is not None}

# -- Vector Search Endpoints --

@app.post("/api/v1/vector/embed/entity")
async def embed_one_entity(entity_id: int):
    embed_entity(entity_id)
    return {"status": "ok", "entity_id": entity_id}

@app.post("/api/v1/vector/embed/campaign")
async def embed_one_campaign(campaign_id: int):
    embed_campaign(campaign_id)
    return {"status": "ok", "campaign_id": campaign_id}

@app.post("/api/v1/vector/embed/all")
async def embed_all():
    embed_all_entities()
    embed_all_campaigns()
    return {"status": "ok", "message": "All entities and campaigns embedded"}

@app.post("/api/v1/vector/match")
async def match(entity_id: int, campaign_id: int = None, top_k: int = 3):
    """
    Universal matching endpoint.
    - entity_id: who is searching (any role)
    - campaign_id: (optional) if a company is searching for their campaign
    - top_k: how many final results per category
    """
    
    result = match_for_entity(entity_id=entity_id, campaign_id=campaign_id, top_k=top_k)
    return result

@app.post("/api/v1/vector/search")
async def search_endpoint(query: str, entity_id: int = None, top_k: int = 1):
    result = search(query=query, entity_id=entity_id, top_k=top_k)
    return result

@app.on_event("startup")
def on_startup():
    # TODO: remove this check
    if not os.path.exists("./rels.db"):
        print("rels.db not found")
        return

    init_vec_table()
    from vector.db import get_db_conn
    conn = get_db_conn()
    count = conn.execute("SELECT COUNT(*) FROM vec_entities").fetchone()[0]
    conn.close()
    if count == 0:
        embed_all_entities()
        embed_all_campaigns()

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
