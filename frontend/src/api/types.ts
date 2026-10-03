export type ThemePreference = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";

export interface ApiErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  objectId?: string | null;
}

export interface SnapshotSummary {
  snapshotId: string;
  version: string;
  status: string;
  acceptedAt: string;
  knowledgeCount: number;
  relationCount: number;
  evidenceCount: number;
  sourceVersionCount: number;
  modelId?: string | null;
}

export interface Appearance {
  themePreference: ThemePreference;
  reduceMotion: boolean;
  updatedAt?: string | null;
}

export interface ModelProfile {
  profileId: string | null;
  name: string;
  baseUrl: string;
  modelId: string;
  modelIds: string[];
  keyConfigured: boolean;
  credentialMask: string | null;
  status: "incomplete" | "untested" | "available" | "unavailable";
  lastTestedAt: string | null;
  lastLatencyMs: number | null;
  lastError: string | null;
  available?: boolean;
  message?: string;
}

export interface ModelSettings {
  activeProfileId: string;
  profiles: ModelProfile[];
}

export interface ConversationSummary {
  conversationId: string;
  projectId: string;
  title: string;
  contextKnowledgeIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CompileRun {
  runId: string;
  status: string;
  stage: string;
  sourceVersionIds: string[];
  counts: Record<string, number>;
  issues: Array<{ code: string; message: string; object?: string }>;
  modelId?: string | null;
  publishedSnapshotId?: string | null;
  error?: ApiErrorShape | null;
  createdAt: string;
  updatedAt: string;
}

export interface Bootstrap {
  productName: string;
  attribution: string;
  project: {
    projectId: string;
    name: string;
    sourceCount: number;
    sourceVersionCount: number;
    seededVersion: string | null;
  };
  snapshot: SnapshotSummary | null;
  appearance: Appearance;
  model: ModelProfile;
  activeCompileRuns: CompileRun[];
  recentConversations: ConversationSummary[];
}

export interface SourceSummary {
  sourceId: string;
  title: string;
  filename: string;
  domain: string;
  documentType: string;
  currentVersionId: string;
  versionCount: number;
  status: string;
  knowledgeCount: number;
  importedAt: string;
  updatedAt: string;
}

export interface SourceVersion {
  sourceVersionId: string;
  sourceId: string;
  version: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  supersedes: string | null;
  status: string;
  createdAt: string;
  content?: string;
  title?: string;
  readOnly?: boolean;
  pageSpans: { pageNumber: number; charStart: number; charEnd: number; extractionMethod?: "text" | "ocr"; qualityScore?: number | null; reviewStatus?: "needs_review" | "reviewed" | null; reviewedAt?: string }[];
  blockSpans: { blockNumber: number; label: string; charStart: number; charEnd: number }[];
}

export interface SourceDetail extends SourceSummary {
  versions: SourceVersion[];
}

export interface KnowledgeSummary {
  knowledgeId: string;
  snapshotId: string;
  slug: string;
  title: string;
  type: string;
  domain: string;
  summary: string;
  reviewStatus: string;
  sourceCount: number;
  updatedAt: string;
}

export interface Evidence {
  evidenceId: string;
  sourceId: string;
  sourceVersionId: string;
  sourceTitle: string;
  knowledgeId?: string;
  knowledgeTitle?: string;
  kind?: string;
  charStart: number;
  charEnd: number;
  pageNumber: number | null;
  extractionMethod?: "text" | "ocr" | null;
  qualityScore?: number | null;
  reviewStatus?: "needs_review" | "reviewed" | null;
  blockNumber: number | null;
  blockLabel: string | null;
  quote: string;
  context?: string;
  contextStart?: number;
  matchStart?: number;
  matchEnd?: number;
  accessible?: boolean;
}

export interface KnowledgeRelation {
  relationId: string;
  sourceKnowledgeId: string;
  targetKnowledgeId: string;
  type: string;
  directed: boolean;
  weight: number;
  reviewStatus: string;
  evidenceIds: string[];
  relatedKnowledge: KnowledgeSummary | null;
}

export interface KnowledgeDetail extends KnowledgeSummary {
  markdown: string;
  sourceIds: string[];
  sourceVersionIds: string[];
  evidence: Evidence[];
  relations: KnowledgeRelation[];
}

export interface GraphDomain {
  id: string;
  name: string;
  en: string;
  color: string;
  index: number;
}

export interface GraphNode {
  id: string;
  knowledgeId: string;
  name: string;
  summary: string;
  type: string;
  domain: number;
  domainId: string;
  hub: boolean;
  degree: number;
  sourceCount: number;
  reviewStatus: string;
  index: number;
  x?: number;
  y?: number;
  z?: number;
}

export interface GraphEdge {
  relationId: string;
  source: string | GraphNode;
  target: string | GraphNode;
  type: string;
  directed: boolean;
  weight: number;
  evidenceCount: number;
  evidenceIds: string[];
  reviewStatus: string;
}

export interface GraphProjection {
  snapshotId: string | null;
  domains: GraphDomain[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  layoutSeed: number;
  counts: { nodes: number; edges: number };
}

export interface Citation extends Evidence {
  index: number;
}

export interface AnswerResult {
  answerId: string;
  snapshotId: string;
  status: string;
  content: string;
  citations: Citation[];
  relatedKnowledgeIds: string[];
  evidenceStatus: "pending" | "sufficient" | "limited" | "insufficient";
  retrievedSourceCount: number;
  usedSourceCount: number;
  modelId: string | null;
  modelProfileId?: string | null;
  error: ApiErrorShape | null;
  completedAt?: string | null;
}

export interface AnswerReview {
  verdict: "accepted" | "issue";
  category: string | null;
  note: string;
  updatedAt: string;
}

export interface QualityAnswer extends AnswerResult {
  conversationId: string;
  question: string;
  createdAt: string;
  snapshotVersion: string | null;
  review: AnswerReview | null;
}

export interface AnswerQuality {
  summary: {
    answerCount: number;
    completedCount: number;
    failedCount: number;
    insufficientCount: number;
    uncitedCount: number;
    reviewedCount: number;
    issueCount: number;
    attentionCount: number;
    compileFailureCount: number;
  };
  items: QualityAnswer[];
  failedRuns: CompileRun[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Message {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  answer?: AnswerResult;
}

export interface Conversation extends ConversationSummary {
  messages: Message[];
  activeAnswer?: AnswerResult | null;
}

export interface ProjectBackupSummary {
  projectName: string;
  exportedAt: string;
  sourceCount: number;
  sourceVersionCount: number;
  knowledgeCount: number;
  snapshotCount: number;
  conversationCount: number;
}

export interface SuggestedQuestion {
  questionId: string;
  snapshotId: string;
  text: string;
  relatedKnowledgeIds: string[];
  generatedAt: string;
  stale: boolean;
}

export interface RelationDetail {
  snapshotId: string;
  relationId: string;
  source: KnowledgeSummary;
  target: KnowledgeSummary;
  type: string;
  directed: boolean;
  weight: number;
  reviewStatus: string;
  evidence: Evidence[];
}
