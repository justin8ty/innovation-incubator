from __future__ import annotations

from dataclasses import dataclass

from app.db.models import Entity


@dataclass(frozen=True)
class RelationshipScore:
    industry_similarity: float
    expertise_alignment: float
    stage_match: float
    geo_match: float
    past_success_score: float
    mentor_success_score: float
    strength_score: float


def _clamp(value: float) -> float:
    return max(0.0, min(1.0, value))


def _tag_names(entity: Entity) -> set[str]:
    return {link.tag.name.lower() for link in entity.expertise if link.tag and link.tag.name}


def jaccard_similarity(left: set[str], right: set[str]) -> float:
    if not left and not right:
        return 0.0
    union = left | right
    if not union:
        return 0.0
    return len(left & right) / len(union)


def score_relationship(
    source: Entity,
    target: Entity,
    *,
    past_success_score: float = 0.0,
    mentor_success_score: float = 0.0,
) -> RelationshipScore:
    """Score a proposed ecosystem linkage using the README weighting formula."""
    industry_similarity = 1.0 if source.industry and source.industry == target.industry else 0.0
    expertise_alignment = jaccard_similarity(_tag_names(source), _tag_names(target))
    stage_match = 1.0 if source.stage and source.stage == target.stage else 0.0
    geo_match = 1.0 if source.timezone and source.timezone == target.timezone else 0.0
    past_success_score = _clamp(past_success_score)
    mentor_success_score = _clamp(mentor_success_score)

    strength_score = (
        0.25 * industry_similarity
        + 0.30 * expertise_alignment
        + 0.10 * stage_match
        + 0.05 * geo_match
        + 0.20 * past_success_score
        + 0.10 * mentor_success_score
    )

    return RelationshipScore(
        industry_similarity=industry_similarity,
        expertise_alignment=expertise_alignment,
        stage_match=stage_match,
        geo_match=geo_match,
        past_success_score=past_success_score,
        mentor_success_score=mentor_success_score,
        strength_score=round(strength_score, 4),
    )
