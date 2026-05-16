import os

import vertexai
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

GCP_PROJECT_ID = os.getenv("GCP_PROJECT_ID")
GCP_LOCATION = os.getenv("GCP_LOCATION")

# TODO: Update Path
DB_PATH = os.getenv("DB_PATH", "./rels.db")

vertexai.init(project=GCP_PROJECT_ID, location=GCP_LOCATION)
