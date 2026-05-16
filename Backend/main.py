import os
import json
import fitz  # PyMuPDF
import docx
import google.generativeai as genai
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict

import vector.config
from vector.db import init_vec_table
from vector.vector_store import embed_entity, embed_campaign, embed_all_entities, embed_all_campaigns, match_for_entity

app = FastAPI(title="MyHack Engine AI Ingestion")

# Enable CORS for the frontend
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
    "investor": {
        "firm_name": "What is the name of your investment firm or fund?",
        "investment_stage": "Which specific funding stages do you primarily target (e.g., Seed, Series A)? (Return as an array of strings)",
        "ticket_size": "What is your typical investment ticket size (minimum and maximum capital deployed)?",
        "focus_areas": "What are your primary industry or technology focus areas (e.g., Fintech, AI, HealthTech)? (Return as an array of strings)",
        "value_add": "What non-financial benefits or strategic value do you provide to your portfolio companies? (Return as an array of strings)",
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
        raise HTTPException(status_code=500, detail="Gemini API Key not configured on server.")

    # Save temp file
    temp_path = f"temp_{file.filename}"
    with open(temp_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        # Extract text
        print(f"DEBUG: Processing file {file.filename} for role {role}")
        raw_text = ""
        if file.filename.lower().endswith(".pdf"):
            raw_text = extract_text_from_pdf(temp_path)
        elif file.filename.lower().endswith(".docx"):
            raw_text = extract_text_from_docx(temp_path)
        else:
            # Fallback for txt or other formats
            try:
                with open(temp_path, "r", encoding="utf-8", errors="ignore") as f:
                    raw_text = f.read()
            except Exception as e:
                print(f"DEBUG: Error reading fallback file: {e}")
                raise HTTPException(status_code=400, detail=f"Unsupported file format or read error: {e}")

        if not raw_text.strip():
            print("DEBUG: Extracted text is empty")
            raise HTTPException(status_code=400, detail="Could not extract text from document.")

        print(f"DEBUG: Extracted {len(raw_text)} characters of text")

        # AI Extraction Matrix
        questions = ROLE_QUESTIONS[role]
        
        system_instruction = f"""
        You are an automated data-entry assistant for the MyHack Engine ecosystem.
        Your task is to extract information from the provided document text for the role: {role}.
        
        You must return a JSON object with the following keys:
        {json.dumps(list(questions.keys()))}
        
        For each key, follow these rules:
        1. If the information is found in the text, populate the field with the extracted data.
        2. If the field hint says "(Return as an array of strings)", provide an array. Otherwise, provide a string.
        3. If the information is NOT found or is highly ambiguous, set the field to null.
        
        Additionally, include a key 'follow_up_questions' which is an array of strings.
        For every field that is null, add the corresponding tracking question (WITHOUT the array hint) to this array.
        
        Tracking Questions for reference:
        {json.dumps(questions, indent=2)}
        
        Output ONLY valid JSON.
        """

        print("DEBUG: Calling Gemini API...")
        try:
            # Using models/ prefix for more robust model resolution
            model = genai.GenerativeModel('models/gemini-2.5-flash')
            response = model.generate_content(f"System Instruction: {system_instruction}\n\nDocument Text:\n{raw_text}")
            print(f"DEBUG: Gemini response received. Status: SUCCESS")
        except Exception as e:
            print(f"DEBUG: Gemini API Call Error: {e}")
            raise HTTPException(status_code=500, detail=f"Gemini API error: {str(e)}")
        
        # Parse AI response
        try:
            clean_text = response.text.strip()
            print(f"DEBUG: Raw AI response: {clean_text[:200]}...") # Log first 200 chars
            
            # Remove markdown code blocks if present
            if "```json" in clean_text:
                clean_text = clean_text.split("```json")[1].split("```")[0].strip()
            elif "```" in clean_text:
                clean_text = clean_text.split("```")[1].split("```")[0].strip()
            
            result = json.loads(clean_text)
            
            # Post-process to ensure follow_up_questions is correct and hints are removed from questions
            extracted_follow_ups = []
            for key, question in questions.items():
                clean_question = question.split(" (Return as")[0].strip()
                if result.get(key) is None or (isinstance(result.get(key), list) and len(result.get(key)) == 0):
                    result[key] = None # Normalize empty arrays to null for the frontend logic
                    extracted_follow_ups.append(clean_question)
            
            result["follow_up_questions"] = extracted_follow_ups
            
            print("DEBUG: Successfully parsed and post-processed result")
            return result
        except Exception as e:
            print(f"DEBUG: AI Response Parsing Error: {e}")
            print(f"DEBUG: Raw Response was: {response.text}")
            raise HTTPException(status_code=500, detail=f"Failed to parse AI response: {str(e)}")

    except HTTPException as he:
        # Re-raise HTTPExceptions
        raise he
    except Exception as e:
        print(f"DEBUG: Unexpected Error: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {str(e)}")
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.get("/health")
async def health():
    return {"status": "ok", "api_key_configured": GOOGLE_API_KEY is not None}

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
