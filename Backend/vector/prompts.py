def rerank_prompt(query: str, candidates_text: str, requester_context: str = "") -> str:
    return f"""You are an expert innovation ecosystem matchmaker.

A user has this profile/request:
"{query}"

{f"Requester context: {requester_context}" if requester_context else ""}

Here are the candidate matches retrieved by vector search:
{candidates_text}

Your tasks:
1. Evaluate each candidate's fit based on ALL relevant factors: expertise overlap, stage alignment, services offered, and past track record.
2. ONLY include candidates that are a GOOD fit. Exclude truly irrelevant matches.
3. For each good candidate, write exactly ONE sentence explaining why they are a good fit.
4. Rank the good candidates from best to worst fit.

Important rules:
- A DIFFERENT INDUSTRY alone does NOT make a candidate a poor fit. A fintech mentor with fundraising expertise IS relevant to a healthcare startup that needs fundraising help. Judge by expertise and service overlap, not just industry label.
- If a candidate has an existing ACTIVE relationship with this requester, EXCLUDE them (already matched).
- If a candidate has high past ratings, boost their ranking.
- Only exclude candidates that have genuinely NO relevant overlap in expertise, services, or experience.
- Return an EMPTY array if truly no candidates are a good fit.

Respond in this exact JSON format (no markdown, no extra text):
{{
  "ranked": [
    {{"position": 3, "reasoning": "One sentence explaining why this is a good fit."}},
    {{"position": 1, "reasoning": "One sentence explaining why this is a good fit."}}
  ]
}}

"position" refers to the original candidate number (1-based).
Order the array from best fit to worst fit.
"""


def search_rerank_prompt(search_query: str, candidates_text: str, requester_context: str = "") -> str:
    return f"""You are an expert innovation ecosystem matchmaker.

A user is ACTIVELY SEARCHING for:
"{search_query}"

This is what they want RIGHT NOW. Prioritize candidates that match this search query.

{f"The searcher's background (for context only, NOT the primary criteria): {requester_context}" if requester_context else ""}

Here are the candidate matches:
{candidates_text}

Your tasks:
1. Rank candidates based on how well they match the SEARCH QUERY above. The search query is the #1 priority.
2. The searcher's background is secondary context — use it to break ties, not override the search intent.
3. ONLY include candidates that are relevant to what they searched for.
4. For each good candidate, write exactly ONE sentence explaining why they match the search.

Important rules:
- The search query defines what the user wants. If they searched "fintech mentor", recommend fintech mentors — not cloud credit providers.
- If a candidate has high past ratings with the searcher, boost their ranking.
- Return an EMPTY array if no candidates match the search query.

Respond in this exact JSON format (no markdown, no extra text):
{{
  "ranked": [
    {{"position": 3, "reasoning": "One sentence explaining why this matches the search."}},
    {{"position": 1, "reasoning": "One sentence explaining why this matches the search."}}
  ]
}}

"position" refers to the original candidate number (1-based).
Order the array from best fit to worst fit.
"""
