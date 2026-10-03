from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class OcrPageCorrection(BaseModel):
    pageNumber: int = Field(ge=1, le=100)
    text: str = Field(min_length=1, max_length=200_000)


class OcrReviewSubmit(BaseModel):
    pages: list[OcrPageCorrection] = Field(min_length=1, max_length=30)


class ConversationCreate(BaseModel):
    contextKnowledgeIds: list[str] = Field(default_factory=list, max_length=20)


class QuestionCreate(BaseModel):
    question: str = Field(min_length=1, max_length=4000)
    profileId: str | None = Field(default=None, max_length=128)
    modelId: str | None = Field(default=None, min_length=1, max_length=160)


class AnswerReviewUpdate(BaseModel):
    verdict: Literal["pending", "accepted", "issue"]
    category: str | None = Field(default=None, max_length=40)
    note: str = Field(default="", max_length=1000)


class DeepSeekSettingsUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=160)
    baseUrl: str = Field(min_length=8, max_length=500)
    modelId: str | None = Field(default=None, min_length=1, max_length=160)
    modelIds: list[str] | None = Field(default=None, max_length=200)
    apiKey: str | None = Field(default=None, max_length=500)

class ModelDiscoverRequest(BaseModel):
    baseUrl: str | None = Field(default=None, max_length=500)
    apiKey: str | None = Field(default=None, max_length=500)


class AppearanceUpdate(BaseModel):
    themePreference: Literal["system", "light", "dark"]
    reduceMotion: bool = False


class ApiErrorDetail(BaseModel):
    code: str
    message: str
    retryable: bool = False
    objectId: str | None = None


class ApiErrorEnvelope(BaseModel):
    error: ApiErrorDetail
