# relationship variables

strength = 
  (0.25 * industry_similarity) +
  (0.30 * expertise_alignment) +
  (0.10 * stage_match) +
  (0.05 * geo_match) +
  (0.20 * past_success_with_this_pair) +
  (0.10 * mentor_success_with_similar_companies)

pre interaction

industry - healthcare, tech?
expertise - Jaccard similarity of mentor’s keywords, eg fundraising, pitching. useful for auction, make human capital more efficient
stage - preseed, seed
geo - timezone match

during interactions

past success - good to avoid red flag companies/mentors with low reputation,  or poor fit, both ways mentor mentee
mentor success with similar sector - avg score of mentor with similar companies, used to decide which company most suitable for a mentor, irrespective of mentor preferences

optional:

recency - more recent ratings feedback on mentor/mentee prioritized, decays over time

# hackathon problem statement

Title: Automating Ecosystem Linkages Instead of Manual Coordination
Overview:
Innovation ecosystem platforms still depend on manual coordination to verify participants,
match mentors, assign companies to programmes, and manage partner linkages. As
ecosystems scale, these relationships remain ad hoc and difficult to reuse, making
operations heavy, inconsistent, and hard to extend across geographies and initiatives. How
might we build an Al-enabled platform that automates and manages ecosystem relationships
as reusable, programmable entities to improve scalability, efficiency, and outcomes?

Problem Statement:
Regional innovation ecosystems still rely on manual coordination to create and manage
relationships between key factors such as companies, mentors, partners, service providers,
and programme administrators. As a result, critical linkages like mentor-to-company,
company-to-programme, and partner-to-initiative are handled as one-off assignments rather
than structured, reusable system entities.

Context:
Across programmes, platforms, and initiatives, ecosystem owners and administrators are
responsible for verifying participants, matching mentors to companies, assigning companies
to relevant programmes, and tracking engagement outcomes over time. While this may work
in smaller cohorts, the model becomes increasingly operationally heavy, difficult to scale
across countries and programmes, and hard to reuse beyond a single initiative.

Core Problem:
The platform does not treat ecosystem relationships as first-class entities that can be
defined, automated, governed, and reused across different contexts. Because of this, there
is no consistent platform-level mechanism to determine how relationships should be formed,
how they should evolve over time, or how past engagement data can improve future
matching and coordination.

Who Is Affected:
The problem affects programme owners, ecosystem administrators, mentors, companies,
partners, and service providers who depend on timely, relevant, and well-managed
connections within the ecosystem.

Why It Matters:
Manual coordination limits scalability, creates operational bottlenecks, and reduces the
ability of ecosystem platforms to learn from previous engagements and apply those insights
across future programmes. This weakens consistency, slows ecosystem growth, and makes
relationship management less effective as participation expands.

Design Challenge / How Might We:
How might we design an Al-enabled platform system that treats ecosystem relationships as
first-class, programmable entities, so that linkages can be created, managed, reused, and
improved automatically across programmes, countries, and ecosystem actors?

# pipeline

Defined System Roles
Startups/Innovators: Upload pitch decks/resumes to find funding, mentorship, or service benefits.
Mentors: Experts who provide guidance and validate startup milestones.
Service Providers/Partners: Entities offering tangible "benefits in kind" (e.g., AWS credits, legal services, capital).
Admins (Ecosystem Owners): Oversee the system via a visual dashboard to monitor ecosystem health and AI matching accuracy.

The Complete Technical Pipeline
Phase 1: Frictionless Ingestion & Onboarding
Document Upload: A Startup, Mentor, or Service Provider drops a PDF (resume, pitch deck, or list of service perks) into the frontend.
AI Parsing (Gemini 1.5 Flash): The backend receives the raw PDF. An agent extracts the unstructured text and forces it into a structured JSON schema (Name, Industry, Expertise, Stage, Timezone, Perks).
Language Translation (Google Cloud Translation): If a foreign Service Provider uploads a document in another language, the API automatically translates the core offerings to English to ensure cross-border compatibility.
Verification & Vectorization: The frontend displays the auto-filled JSON for human verification. Upon submission, the text is sent to the text-embedding-004 model to generate a high-dimensional vector array. This vector and the JSON metadata are saved to your database.
Phase 2: Governance & The AI Interviewer
Capability Check Trigger: Before a Mentor's profile becomes "Active", they are redirected to a chat interface.
WebSocket Interrogation: A FastAPI WebSocket connects the Mentor to a Gemini agent acting as a technical screener. The AI asks one or two highly specific scenario questions based on the Mentor's uploaded resume.
Verification Flag: The AI evaluates the response. If the Mentor proves their capability, their database row is flagged as Verified_Expert, unlocking their profile for high-tier startup matching.
Phase 3: The 2-Step Matchmaking Engine
The Trigger: A Startup requests assistance (e.g., "Need server credits" or "Need financial modeling help").
Step 1: Vector Search (Speed): The system converts the request into a vector and queries the database using Approximate Nearest Neighbor (ANN) math. It applies hard metadata filters (matching Timezones or Stages) and instantly retrieves the Top 5 closest mathematical matches—which could be a mix of Mentors (for advice) and Service Providers (for in-kind benefits).
Step 2: AI Reranking (Accuracy): The Top 5 profiles are injected into a Gemini 1.5 Pro prompt. The LLM analyzes the deep context, ranks the best fit, and generates a one-sentence "Reasoning Summary" explaining why the match is perfect.
Phase 4: The Automated Handshake
FastAPI Background Task: To keep the UI lightning-fast, the backend immediately returns a "Match Found" status to the frontend.
Email Generation: In the background, an agent drafts a highly personalized email. If matched with a Service Provider, the email explains exactly which in-kind benefits the startup qualifies for.
The Dispatch: The email is sent to the respective parties containing an "Accept Match" link. Clicking this link changes the database state of the relationship to ACTIVE.
Phase 5: Telemetry & Continuous Learning
Proof-of-Work Milestones: The matched parties use the platform to track simple, binary milestones (e.g., "AWS Credits Claimed" or "Pitch Deck Reviewed").
Feedback Loop: After 30 days, both parties provide a 1-5 star rating and text feedback.
Dynamic Vectors: If a relationship is highly successful, the AI slightly adjusts their profile vectors closer together in the mathematical space, ensuring the system learns from past data to make better future matches.

Hackathon Execution Strategy (5-Person Team)
To deploy this successfully within the time limit, divide the technical stack cleanly among the five members:
Lead Backend / API Orchestration (1 Person): Focus entirely on the Python FastAPI setup. Build the REST endpoints, configure the BackgroundTasks for the automated emails, and handle the WebSocket routing for the AI Interviewer.
AI / Machine Learning Engineer (1 Person): Handle the Gemini 1.5 API prompts (forcing structured JSON outputs), generate the vector embeddings (text-embedding-004), and configure the Vector Search logic (using pgvector, FAISS, or ChromaDB).
Database & State Management (1 Person): Design the schemas for the Users, Service Providers, and Relationship Entities. Write the logic that tracks the "Proof-of-Work" milestones and the PENDING vs ACTIVE states.
Frontend Interface (1 Person): Build a clean, responsive UI (React, Next.js, or Streamlit). Focus on the frictionless drag-and-drop PDF upload and a simple dashboard to view the AI's matchmaking reasoning.
Pitch & Integration (1 Person): Wire up the external APIs (Google Cloud Translation, email providers), help build the presentation deck, and if time permits, run a dimensionality reduction script (like PCA) on the vector embeddings to create a 2D "Ecosystem Visualization" graph for the judges.
