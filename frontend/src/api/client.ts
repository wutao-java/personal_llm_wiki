import type {
  AnswerResult,
  AnswerQuality,
  AnswerReview,
  Appearance,
  Bootstrap,
  CompileRun,
  Conversation,
  ConversationSummary,
  Evidence,
  GraphProjection,
  KnowledgeDetail,
  KnowledgeSummary,
  ModelProfile,
  ModelSettings,
  ProjectBackupSummary,
  RelationDetail,
  SourceDetail,
  SourceSummary,
  SourceVersion,
  SuggestedQuestion,
} from "./types";

const API_PREFIX = "/api/v1";

export class ApiError extends Error {
  code: string;
  retryable: boolean;

  constructor(code: string, message: string, retryable = false) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.retryable = retryable;
  }
}

async function fetchResponse(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const response = await fetch(`${API_PREFIX}${path}`, { ...init, headers });
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    const error = payload?.error;
    throw new ApiError(error?.code ?? "request_failed", error?.message ?? "请求未完成", error?.retryable);
  }
  return response;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  return (await fetchResponse(path, init)).json().catch(() => null) as Promise<T>;
}

export const api = {
  bootstrap: () => request<Bootstrap>("/bootstrap"),
  exportProject: async () => (await fetchResponse("/project/backup")).blob(),
  inspectBackup: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<ProjectBackupSummary>("/project/backup/inspect", { method: "POST", body: form });
  },
  restoreProject: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    form.append("confirmation", "replace");
    return request<ProjectBackupSummary>("/project/restore", { method: "POST", body: form });
  },
  sources: (params = "pageSize=100") =>
    request<{ items: SourceSummary[]; total: number }>(`/sources?${params}`),
  source: (sourceId: string) => request<SourceDetail>(`/sources/${encodeURIComponent(sourceId)}`),
  removeSource: (sourceId: string) =>
    request<{ sourceId: string; snapshotId: string | null; removedKnowledgeCount: number; removedRelationCount: number }>(
      `/sources/${encodeURIComponent(sourceId)}`, { method: "DELETE" },
    ),
  sourceContent: (versionId: string) =>
    request<SourceVersion>(`/source-versions/${encodeURIComponent(versionId)}/content`),
  importSources: async (files: File[], topic?: string) => {
    const form = new FormData();
    files.forEach((file) => form.append("files", file));
    if (topic?.trim()) form.append("topic", topic.trim());
    return request<{
      runId: string | null;
      items: Array<{
        filename: string;
        status: string;
        message: string;
        sourceId?: string;
        sourceVersionId?: string;
      }>;
      acceptedCount: number;
      failedCount: number;
    }>("/sources/import", { method: "POST", body: form });
  },
  reviewOcrPages: (versionId: string, pages: Array<{ pageNumber: number; text: string }>) =>
    request<CompileRun>(`/source-versions/${encodeURIComponent(versionId)}/ocr-review`, {
      method: "POST", body: JSON.stringify({ pages }),
    }),
  compileRun: (runId: string) => request<CompileRun>(`/compile-runs/${runId}`),
  cancelCompile: (runId: string) =>
    request<CompileRun>(`/compile-runs/${encodeURIComponent(runId)}/cancel`, { method: "POST" }),
  deleteCompile: (runId: string) =>
    request<void>(`/compile-runs/${encodeURIComponent(runId)}`, { method: "DELETE" }),
  compileRuns: (params = "pageSize=100") =>
    request<{ items: CompileRun[] }>(`/compile-runs?${params}`),
  compileReview: (runId: string) =>
    request<CompileRun & {
      knowledgeItems: Array<Record<string, unknown>>;
      relations: Array<Record<string, unknown>>;
      summary: Record<string, number>;
    }>(`/compile-runs/${runId}/review`),
  acceptCompile: (runId: string) =>
    request<{ run: CompileRun; snapshotId: string }>(`/compile-runs/${runId}/accept`, { method: "POST" }),
  retryCompile: (runId: string) =>
    request<CompileRun>(`/compile-runs/${runId}/retry`, { method: "POST" }),
  knowledge: (params = "pageSize=100") =>
    request<{ snapshotId: string | null; items: KnowledgeSummary[]; total: number; domains: Array<Record<string, string>> }>(
      `/knowledge?${params}`,
    ),
  knowledgeDetail: (knowledgeId: string) =>
    request<KnowledgeDetail>(`/knowledge/${encodeURIComponent(knowledgeId)}`),
  evidence: (evidenceId: string) => request<Evidence>(`/evidence/${encodeURIComponent(evidenceId)}`),
  relation: (relationId: string) => request<RelationDetail>(`/relations/${encodeURIComponent(relationId)}`),
  graph: () => request<GraphProjection>("/graph"),
  suggestedQuestions: () =>
    request<{ snapshotId: string | null; items: SuggestedQuestion[] }>("/suggested-questions"),
  conversations: () => request<{ items: ConversationSummary[] }>("/conversations"),
  conversation: (conversationId: string) =>
    request<Conversation>(`/conversations/${encodeURIComponent(conversationId)}`),
  deleteConversation: (conversationId: string) =>
    request<{ conversationId: string }>(`/conversations/${encodeURIComponent(conversationId)}`, { method: "DELETE" }),
  deleteMessage: (conversationId: string, messageId: string) =>
    request<{ messageId: string }>(
      `/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
      { method: "DELETE" },
    ),
  createConversation: (contextKnowledgeIds: string[] = []) =>
    request<ConversationSummary>("/conversations", {
      method: "POST",
      body: JSON.stringify({ contextKnowledgeIds }),
    }),
  ask: (conversationId: string, question: string, model?: { profileId: string; modelId: string }) =>
    request<{ answerId: string; conversationId: string; snapshotId: string; status: string }>(
      `/conversations/${encodeURIComponent(conversationId)}/questions`,
      { method: "POST", body: JSON.stringify({ question, ...model }) },
    ),
  answer: (answerId: string) => request<AnswerResult>(`/answers/${answerId}`),
  answerQuality: (params: URLSearchParams) => request<AnswerQuality>(`/answer-quality?${params}`),
  reviewAnswer: (answerId: string, payload: { verdict: "pending" | "accepted" | "issue"; category?: string | null; note?: string }) =>
    request<{ answerId: string; review: AnswerReview | null }>(`/answer-quality/${encodeURIComponent(answerId)}/review`, {
      method: "PUT", body: JSON.stringify(payload),
    }),
  retryAnswer: (answerId: string) =>
    request<{ answerId: string; conversationId: string }>(`/answers/${answerId}/retry`, { method: "POST" }),
  cancelAnswer: (answerId: string) =>
    request<AnswerResult>(`/answers/${encodeURIComponent(answerId)}/cancel`, { method: "POST" }),
  deepseek: () => request<ModelProfile>("/settings/deepseek"),
  saveDeepseek: (payload: { name: string; baseUrl: string; modelId: string; apiKey?: string }) =>
    request<ModelProfile>("/settings/deepseek", { method: "PUT", body: JSON.stringify(payload) }),
  testDeepseek: () => request<ModelProfile>("/settings/deepseek/test", { method: "POST" }),
  models: () => request<ModelSettings>("/settings/models"),
  discoverModels: (profileId: string, payload: { baseUrl?: string; apiKey?: string }) =>
    request<{ models: string[] }>(`/settings/models/${encodeURIComponent(profileId)}/discover`, {
      method: "POST", body: JSON.stringify(payload),
    }),
  saveModel: (profileId: string, payload: { name: string; baseUrl: string; modelId: string; modelIds: string[]; apiKey?: string }) =>
    request<ModelProfile>(`/settings/models/${profileId}`, { method: "PUT", body: JSON.stringify(payload) }),
  testModel: (profileId: string) =>
    request<ModelProfile>(`/settings/models/${profileId}/test`, { method: "POST" }),
  activateModel: (profileId: string) =>
    request<ModelSettings>(`/settings/models/${profileId}/activate`, { method: "POST" }),
  appearance: () => request<Appearance>("/settings/appearance"),
  saveAppearance: (payload: Appearance) =>
    request<Appearance>("/settings/appearance", { method: "PUT", body: JSON.stringify(payload) }),
};

export interface StreamEvent<T = Record<string, unknown>> {
  type: string;
  data: T;
  id?: string;
}

export function subscribeToEvents(
  path: string,
  eventTypes: string[],
  onEvent: (event: StreamEvent) => void,
  onConnectionError: () => void,
): () => void {
  const source = new EventSource(`${API_PREFIX}${path}`);
  eventTypes.forEach((type) => {
    source.addEventListener(type, (rawEvent) => {
      const event = rawEvent as MessageEvent<string>;
      try {
        onEvent({ type, data: JSON.parse(event.data), id: event.lastEventId });
      } catch {
        onConnectionError();
      }
    });
  });
  source.onerror = () => {
    if (source.readyState === EventSource.CLOSED) onConnectionError();
  };
  return () => source.close();
}
