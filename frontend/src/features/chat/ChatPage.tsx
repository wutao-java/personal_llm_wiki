import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  AlertTriangle,
  BookOpenText,
  Check,
  ChevronDown,
  ChevronRight,
  Cloud,
  Copy,
  ExternalLink,
  FileText,
  GitFork,
  Lightbulb,
  LoaderCircle,
  PanelRightOpen,
  Plus,
  RotateCcw,
  Search,
  Send,
  Settings,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, subscribeToEvents } from "../../api/client";
import type { AnswerResult, Citation } from "../../api/types";
import { ErrorState, LoadingState } from "../../components/AsyncState";
import { MarkdownView } from "../../components/MarkdownView";
import { SidePanel } from "../../components/SidePanel";
import { SourceDocumentReader } from "../../components/SourceDocumentReader";
import { StatusBadge } from "../../components/StatusBadge";
import { useUIStore } from "../../state/ui";

const stageLabels: Record<string, string> = {
  retrieving: "检索知识",
  organizing: "整理证据",
  generating: "生成回答",
};

export function ChatPage() {
  const { conversationId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const answerFromUrl = searchParams.get("answer");
  const draft = useUIStore((state) => state.chatDraft);
  const setDraft = useUIStore((state) => state.setChatDraft);
  const [requestedAnswer, setRequestedAnswer] = useState<{ conversationId: string; answerId: string } | null>(null);
  const settledAnswerIds = useRef(new Set<string>());
  const [pendingQuestion, setPendingQuestion] = useState<string | null>(null);
  const [streamContent, setStreamContent] = useState("");
  const [streamStage, setStreamStage] = useState<string | null>(null);
  const [streamMessage, setStreamMessage] = useState("");
  const [streamResult, setStreamResult] = useState<AnswerResult | null>(null);
  const [streamError, setStreamError] = useState<string | null>(null);
  const [evidenceAnswer, setEvidenceAnswer] = useState<AnswerResult | null>(null);
  const [selectedCitation, setSelectedCitation] = useState<Citation | null>(null);
  const [previewCitation, setPreviewCitation] = useState<Citation | null>(null);
  const [evidencePanelDismissed, setEvidencePanelDismissed] = useState(false);
  const [copiedAnswerId, setCopiedAnswerId] = useState<string | null>(null);
  const [messageToDelete, setMessageToDelete] = useState<{ id: string; role: "user" | "assistant" } | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);
  const [pickerProfileId, setPickerProfileId] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<{ profileId: string; modelId: string } | null>(null);
  const [modelSearch, setModelSearch] = useState("");
  const composerRef = useRef<HTMLTextAreaElement>(null);
  const modelPickerRef = useRef<HTMLDivElement>(null);
  const previousConversationId = useRef(conversationId);
  const messageIdsBeforeSubmit = useRef<Set<string>>(new Set());

  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: api.bootstrap });
  const modelSettings = useQuery({ queryKey: ["model-settings"], queryFn: api.models });
  useEffect(() => {
    if (!modelPickerOpen) return;
    const close = (event: MouseEvent) => {
      if (!modelPickerRef.current?.contains(event.target as Node)) setModelPickerOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setModelPickerOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", escape);
    };
  }, [modelPickerOpen]);
  const suggested = useQuery({ queryKey: ["suggested-questions"], queryFn: api.suggestedQuestions });
  const conversation = useQuery({
    queryKey: ["conversation", conversationId],
    queryFn: () => api.conversation(conversationId!),
    enabled: Boolean(conversationId),
  });
  const candidateAnswerId = answerFromUrl
    ?? (requestedAnswer && requestedAnswer.conversationId === conversationId ? requestedAnswer.answerId : null)
    ?? conversation.data?.activeAnswer?.answerId;
  const activeAnswerId = candidateAnswerId && !settledAnswerIds.current.has(candidateAnswerId) ? candidateAnswerId : null;

  const finishAnswer = (result: AnswerResult) => {
    settledAnswerIds.current.add(result.answerId);
    setStreamResult(result);
    setStreamContent(result.content);
    setStreamStage(null);
    setStreamError(result.status === "failed" ? result.error?.message ?? "回答未完成，可以重新生成" : null);
    setRequestedAnswer(null);
    setPendingQuestion(null);
    messageIdsBeforeSubmit.current.clear();
    if (result.citations.length > 0) {
      setEvidencePanelDismissed(false);
      setEvidenceAnswer(result);
      setSelectedCitation(result.citations[0]);
    }
    void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    setSearchParams({}, { replace: true });
  };
  const finishAnswerRef = useRef(finishAnswer);
  finishAnswerRef.current = finishAnswer;

  useEffect(() => {
    const answerId = activeAnswerId;
    if (!answerId) return;
    setStreamContent("");
    setStreamResult(null);
    setStreamError(null);
    setStreamStage("retrieving");
    setStreamMessage("正在连接回答");
    let finished = false;
    const applyTerminalResult = (result: AnswerResult) => {
      if (finished) return;
      finished = true;
      finishAnswerRef.current(result);
    };
    const close = subscribeToEvents(
      `/answers/${answerId}/events`,
      ["stage", "chunk", "final", "error"],
      (event) => {
        if (finished) return;
        if (event.type === "stage") {
          const payload = event.data as { stage?: string; message?: string };
          setStreamStage(payload.stage ?? null);
          setStreamMessage(payload.message ?? "");
        }
        if (event.type === "chunk") {
          const payload = event.data as { text?: string };
          setStreamContent((current) => current + (payload.text ?? ""));
        }
        if (event.type === "final") {
          const result = event.data as unknown as AnswerResult;
          applyTerminalResult(result);
        }
        if (event.type === "error") {
          const result = event.data as unknown as AnswerResult;
          if (result.answerId) {
            applyTerminalResult(result);
          } else {
            finished = true;
            const payload = event.data as { message?: string };
            setStreamStage(null);
            setStreamError(payload.message ?? "回答事件连接已中断");
          }
        }
      },
      () => {
        if (finished) return;
        void api.answer(answerId).then((result) => {
          if (["completed", "insufficient", "failed"].includes(result.status)) {
            applyTerminalResult(result);
          }
        }).catch((error: Error) => {
          if (!finished) setStreamError(error.message);
        });
      },
    );
    return () => { finished = true; close(); };
  }, [activeAnswerId, conversationId]);

  const askMutation = useMutation({
    mutationFn: async (question: string) => {
      const currentConversationId = conversationId ?? (await api.createConversation()).conversationId;
      const result = await api.ask(currentConversationId, question, answerModel ?? undefined);
      return { ...result, question, createdConversation: !conversationId };
    },
    onMutate: (question) => {
      setPendingQuestion(question);
      setStreamContent("");
      setStreamResult(null);
      setStreamError(null);
      setStreamStage("retrieving");
      setStreamMessage("正在接收问题");
      setEvidenceAnswer(null);
      setSelectedCitation(null);
      setPreviewCitation(null);
      setEvidencePanelDismissed(false);
    },
    onSuccess: (result) => {
      setDraft("");
      if (result.createdConversation) {
        navigate(`/conversations/${result.conversationId}?answer=${result.answerId}`, { replace: true });
      } else {
        setRequestedAnswer({ conversationId: result.conversationId, answerId: result.answerId });
      }
      void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
    onError: (error) => {
      setPendingQuestion(null);
      messageIdsBeforeSubmit.current.clear();
      setStreamStage(null);
      setStreamError(error.message);
    },
  });

  const retryMutation = useMutation({
    mutationFn: (answerId: string) => api.retryAnswer(answerId),
    onSuccess: (result) => {
      setStreamContent("");
      setStreamResult(null);
      setStreamError(null);
      setStreamStage("retrieving");
      setRequestedAnswer({ conversationId: result.conversationId, answerId: result.answerId });
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
    },
  });
  const cancelMutation = useMutation({
    mutationFn: (answerId: string) => api.cancelAnswer(answerId),
    onSuccess: finishAnswer,
  });

  const deleteMutation = useMutation({
    mutationFn: (messageId: string) => api.deleteMessage(conversationId!, messageId),
    onSuccess: () => {
      setMessageToDelete(null);
      setStreamContent("");
      setStreamResult(null);
      setStreamError(null);
      setStreamStage(null);
      setEvidenceAnswer(null);
      setSelectedCitation(null);
      setPreviewCitation(null);
      setEvidencePanelDismissed(true);
      void queryClient.invalidateQueries({ queryKey: ["conversation", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      void queryClient.invalidateQueries({ queryKey: ["answer-quality"] });
    },
  });

  const messages = conversation.data?.messages ?? [];
  const persistedAnswerIds = useMemo(
    () => new Set(messages.flatMap((message) => message.answer ? [message.answer.answerId] : [])),
    [messages],
  );
  const latestPersistedAnswer = useMemo(
    () => [...messages].reverse().find((message) => message.answer)?.answer ?? null,
    [messages],
  );
  const streamHasBeenPersisted = Boolean(streamResult?.answerId && persistedAnswerIds.has(streamResult.answerId));
  const showStreamingMessage = Boolean(streamStage || streamContent || streamError) && !streamHasBeenPersisted;
  const pendingQuestionHasBeenPersisted = Boolean(
    pendingQuestion && messages.some((message) => (
      message.role === "user"
      && message.content.trim() === pendingQuestion.trim()
      && !messageIdsBeforeSubmit.current.has(message.messageId)
    )),
  );
  const showPendingQuestion = Boolean(pendingQuestion) && !pendingQuestionHasBeenPersisted;
  const isBusy = askMutation.isPending || retryMutation.isPending || cancelMutation.isPending
    || Boolean(activeAnswerId || streamStage) || conversation.isLoading;
  const hasKnowledge = Boolean(bootstrap.data?.snapshot);
  const activeProfile = modelSettings.data?.profiles.find((item) => item.profileId === modelSettings.data?.activeProfileId) ?? bootstrap.data?.model;
  const availableProfiles = (modelSettings.data?.profiles ?? []).filter((profile) =>
    profile.status === "available" && profile.keyConfigured && (profile.modelIds?.length || profile.modelId));
  const selectedProfile = availableProfiles.find((profile) =>
    profile.profileId === selectedModel?.profileId && (profile.modelIds ?? [profile.modelId]).includes(selectedModel?.modelId ?? ""));
  const defaultProfile = availableProfiles.find((profile) => profile.profileId === modelSettings.data?.activeProfileId) ?? availableProfiles[0];
  const fallbackProfile = modelSettings.data ? defaultProfile : activeProfile;
  const answerModel = selectedProfile && selectedModel ? selectedModel : fallbackProfile?.profileId && fallbackProfile.modelId
    ? { profileId: fallbackProfile.profileId, modelId: fallbackProfile.modelId } : null;
  const answerProfile = availableProfiles.find((item) => item.profileId === answerModel?.profileId) ?? (modelSettings.data ? undefined : activeProfile);
  const canAsk = hasKnowledge && answerProfile?.status === "available" && !isBusy && !modelSettings.isError;
  const pickerProfile = availableProfiles.find((item) => item.profileId === pickerProfileId) ?? defaultProfile;
  const pickerModels = pickerProfile ? (pickerProfile.modelIds ?? [pickerProfile.modelId])
    .filter((id) => id && id.toLowerCase().includes(modelSearch.trim().toLowerCase())) : [];
  const isEmpty = !conversationId || (!conversation.isLoading && messages.length === 0 && !pendingQuestion);
  const citations = streamResult?.citations ?? [];

  useEffect(() => {
    if (previousConversationId.current && previousConversationId.current !== conversationId) {
      setRequestedAnswer(null);
      setPendingQuestion(null);
      setStreamContent("");
      setStreamStage(null);
      setStreamMessage("");
      setStreamResult(null);
      setStreamError(null);
      setEvidenceAnswer(null);
      setSelectedCitation(null);
      setPreviewCitation(null);
      setEvidencePanelDismissed(false);
      retryMutation.reset();
      cancelMutation.reset();
    }
    previousConversationId.current = conversationId;
    // Reset transient state only when leaving a conversation.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  useEffect(() => {
    if (!evidencePanelDismissed && !evidenceAnswer && latestPersistedAnswer?.citations.length) {
      setEvidenceAnswer(latestPersistedAnswer);
      setSelectedCitation(latestPersistedAnswer.citations[0]);
    }
  }, [evidenceAnswer, evidencePanelDismissed, latestPersistedAnswer]);

  const submit = (question = draft) => {
    const normalized = question.trim();
    if (!normalized || !canAsk) return;
    messageIdsBeforeSubmit.current = new Set(messages.map((message) => message.messageId));
    askMutation.mutate(normalized);
  };

  const copyAnswer = async (answerId: string, content: string) => {
    await navigator.clipboard.writeText(content);
    setCopiedAnswerId(answerId);
    window.setTimeout(() => setCopiedAnswerId((current) => current === answerId ? null : current), 1600);
  };

  const openEvidence = (result: AnswerResult, citation?: Citation) => {
    setEvidencePanelDismissed(false);
    setEvidenceAnswer(result);
    setSelectedCitation(citation ?? result.citations[0] ?? null);
    if (citation) setPreviewCitation(citation);
  };

  const currentTitle = conversation.data?.title ?? "知识问答";
  const citationByIndex = useMemo(
    () => new Map(citations.map((citation) => [citation.index, citation])),
    [citations],
  );

  return (
    <div className={`chat-workspace${evidenceAnswer ? " chat-workspace--evidence" : ""}`}>
      <section className={`chat-main${isEmpty ? " chat-main--empty" : ""}`}>
        {!isEmpty ? <header className="chat-header">
          <div>
            <span className="eyebrow">知识问答</span>
            <h1>{currentTitle}</h1>
          </div>
          {bootstrap.data?.snapshot ? (
            <div className="chat-version">
              <span className="status-dot status-dot--ok" />
              当前知识版本 {bootstrap.data.snapshot.version}
            </div>
          ) : null}
        </header> : null}

        {hasKnowledge && answerProfile?.status !== "available" ? (
          <div className="inline-notice inline-notice--warning">
            <Settings size={17} />
            <div><strong>当前模型尚未就绪</strong><span>完成连接测试后即可进行带引用的知识问答。</span></div>
            <Link to="/settings">前往设置 <ChevronRight size={14} /></Link>
          </div>
        ) : null}

        <div className={`chat-scroll${isEmpty ? " chat-scroll--welcome" : ""}`}>
          {conversation.isLoading ? <LoadingState label="正在读取对话" /> : null}
          {conversation.isError ? <ErrorState message={conversation.error.message} onRetry={() => conversation.refetch()} /> : null}

          {isEmpty ? (
            <motion.div className="chat-welcome" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
              <div className="chat-welcome__mark"><img src="/knowledge-avatar-minimal.png" alt="知识问答头像" /></div>
              {hasKnowledge ? (
                <>
                  <h2>向知识库提问</h2>
                  <p>每个关键结论都连接到原始资料，你可以继续阅读知识页面，或在图谱中查看相关概念。</p>
                  <div className="suggestion-grid">
                    {(suggested.data?.items ?? []).map((question, index) => (
                      <button key={question.questionId} onClick={() => submit(question.text)} disabled={!canAsk} type="button">
                        <span><Lightbulb size={16} /> 推荐问题 {index + 1}</span>
                        <strong>{question.text}</strong>
                        <ArrowRight size={16} />
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <h2>向知识库提问</h2>
                  <p>还没有导入资料。导入并发布后，就能基于资料提问并查看引用来源。</p>
                  <Link className="chat-welcome__link" to="/sources">导入资料 <ArrowRight size={15} /></Link>
                </>
              )}
            </motion.div>
          ) : null}

          {!isEmpty ? <div className="message-list" aria-live="polite">
            {messages.map((message) => (
              <article key={message.messageId} className={`message message--${message.role}`}>
                <div className="message__avatar">
                  {message.role === "user" ? <span>你</span> : <img src="/knowledge-avatar-minimal.png" alt="" />}
                </div>
                <div className="message__body">
                  <div className="message__meta">
                    <span>{message.role === "user" ? "你的问题" : "知识回答"}</span>
                    <button
                      className="message__delete"
                      type="button"
                      title={isBusy ? "回答结束后可删除消息" : message.role === "user" ? "删除问题" : "删除回答"}
                      aria-label={message.role === "user" ? "删除问题" : "删除回答"}
                      disabled={isBusy}
                      onClick={() => {
                        deleteMutation.reset();
                        setMessageToDelete({ id: message.messageId, role: message.role });
                      }}
                    ><Trash2 size={14} /></button>
                  </div>
                  {message.answer?.status === "failed" ? (
                    <div className="answer-error">
                      <strong>这次回答没有完成</strong>
                      <span>{message.answer.error?.message ?? "回答未完成，可以重新生成"}</span>
                      <button className="button button--secondary" disabled={isBusy} onClick={() => retryMutation.mutate(message.answer!.answerId)} type="button">
                        <RotateCcw size={15} />重新生成
                      </button>
                    </div>
                  ) : message.role === "assistant" ? (
                    <MarkdownView
                      content={message.content}
                      onCitation={(index) => {
                        const citation = message.answer?.citations.find((item) => item.index === index);
                        if (citation && message.answer) openEvidence(message.answer, citation);
                      }}
                    />
                  ) : <p>{message.content}</p>}
                  {message.answer && message.answer.status !== "failed" ? (
                    <AnswerFooter
                      result={message.answer}
                      onCitation={(citation) => openEvidence(message.answer!, citation)}
                      onOpenEvidence={() => openEvidence(message.answer!)}
                      onCopy={() => copyAnswer(message.answer!.answerId, message.content)}
                      copied={copiedAnswerId === message.answer.answerId}
                    />
                  ) : null}
                </div>
              </article>
            ))}

            {showPendingQuestion ? (
              <article className="message message--user message--pending">
                <div className="message__avatar"><span>你</span></div>
                <div className="message__body">
                  <div className="message__meta"><span>你的问题</span><button className="message__delete" type="button" aria-label="删除问题" title="回答结束后可删除消息" disabled><Trash2 size={14} /></button></div>
                  <p>{pendingQuestion}</p>
                </div>
              </article>
            ) : null}

            {showStreamingMessage ? (
              <article className="message message--assistant message--streaming">
                <div className="message__avatar"><img src="/knowledge-avatar-minimal.png" alt="" /></div>
                <div className="message__body">
                  <div className="message__meta"><span>知识回答</span><button className="message__delete" type="button" aria-label="删除回答" title="回答保存后可删除消息" disabled><Trash2 size={14} /></button></div>
                  {streamStage ? (
                    <div className="answer-progress">
                      <span className="answer-progress__pulse" />
                      <div><strong>{stageLabels[streamStage] ?? "正在处理"}</strong><span>{streamMessage}</span></div>
                      <div className="answer-progress__steps">
                        {Object.keys(stageLabels).map((stage) => <i key={stage} className={stage === streamStage ? "is-active" : ""} />)}
                      </div>
                    </div>
                  ) : null}
                  {streamContent ? (
                    <MarkdownView
                      className={streamStage === "generating" ? "markdown-body--streaming" : ""}
                      content={streamContent}
                      onCitation={(index) => {
                        const citation = citationByIndex.get(index);
                        if (citation && streamResult) openEvidence(streamResult, citation);
                      }}
                    />
                  ) : null}
                  {streamError ? (
                    <div className="answer-error">
                      <strong>这次回答没有完成</strong><span>{streamError}</span>
                      {streamResult?.answerId ? <button className="button button--secondary" disabled={isBusy} onClick={() => retryMutation.mutate(streamResult.answerId)} type="button"><RotateCcw size={15} />重新生成</button> : null}
                    </div>
                  ) : null}
                  {streamResult && !streamError ? (
                    <AnswerFooter
                      result={streamResult}
                      onCitation={(citation) => openEvidence(streamResult, citation)}
                      onOpenEvidence={() => openEvidence(streamResult)}
                      onCopy={() => copyAnswer(streamResult.answerId, streamResult.content)}
                      copied={copiedAnswerId === streamResult.answerId}
                    />
                  ) : null}
                </div>
              </article>
            ) : null}
          </div> : null}
        </div>

        <div className="composer-wrap">
          {retryMutation.isError || cancelMutation.isError ? (
            <div className="inline-notice inline-notice--error" role="alert">
              <AlertTriangle size={16} /><div><strong>{cancelMutation.isError ? "回答未能停止" : "重新生成未开始"}</strong><span>{cancelMutation.error?.message ?? retryMutation.error?.message}</span></div>
            </div>
          ) : null}
          <div className={`composer${isBusy ? " composer--busy" : ""}`}>
            <textarea
              ref={composerRef}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  submit();
                }
              }}
              placeholder={hasKnowledge ? "询问当前知识中的规则、流程、关系或依据…" : "导入并发布资料后即可提问"}
              aria-label="输入问题"
              rows={2}
              maxLength={4000}
              disabled={!hasKnowledge || isBusy}
            />
            <div className="composer__toolbar">
              <div className="composer__scope"><Link to="/sources" aria-label="前往资料管理" title="前往资料管理"><Plus size={15} /></Link><span>当前知识</span></div>
              <div className="composer__trailing">
            <div className="model-picker" ref={modelPickerRef}>
              <button className="model-picker__trigger" type="button" aria-label={`选择问答模型：${answerModel?.modelId ?? "未配置"}`} aria-expanded={modelPickerOpen} aria-haspopup="dialog" onClick={() => {
                if (modelPickerOpen) { setModelPickerOpen(false); return; }
                const profileId = answerModel?.profileId ?? modelSettings.data?.activeProfileId;
                setPickerProfileId(profileId ?? null);
                setModelSearch("");
                setModelPickerOpen(true);
              }}><Cloud size={15} /><span>{answerModel?.modelId ?? "选择模型"}</span><ChevronDown size={14} /></button>
              {modelPickerOpen ? <div className="model-picker__panel" role="dialog" aria-label="选择问答模型">
                {availableProfiles.length ? <div className="model-picker__providers">
                  {availableProfiles.map((profile) => <button type="button" key={profile.profileId} className={profile.profileId === pickerProfile?.profileId ? "is-active" : ""} onClick={() => {
                    setPickerProfileId(profile.profileId);
                    setModelSearch("");
                  }}>{profile.name}</button>)}
                </div> : null}
                {modelSettings.isError ? <p className="model-picker__feedback">{modelSettings.error.message}</p> : null}
                {!pickerProfile && !modelSettings.isError ? <p className="model-picker__feedback">暂无通过连接测试的模型服务</p> : null}
                {pickerProfile ? <>
                  <div className="model-picker__search"><Search size={14} /><input type="search" aria-label="搜索问答模型" placeholder="搜索模型" value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} /></div>
                  <div className="model-picker__list">
                    {pickerModels.map((id) => <button type="button" key={id} onClick={() => {
                      if (pickerProfile.profileId) setSelectedModel({ profileId: pickerProfile.profileId, modelId: id });
                      setModelPickerOpen(false);
                    }}><span>{id}</span>{answerModel?.profileId === pickerProfile.profileId && answerModel.modelId === id ? <Check size={15} /> : null}</button>)}
                    {!pickerModels.length ? <p>没有匹配的模型</p> : null}
                  </div>
                </> : null}
                <Link className="model-picker__settings" to="/settings" onClick={() => setModelPickerOpen(false)}><Settings size={14} />模型配置<ChevronRight size={14} /></Link>
              </div> : null}
            </div>
            {activeAnswerId ? <button className="composer__send" type="button" onClick={() => cancelMutation.mutate(activeAnswerId)} disabled={cancelMutation.isPending} aria-label="停止回答" title="停止回答">
              {cancelMutation.isPending ? <LoaderCircle className="spin" size={17} /> : <Square size={15} />}
            </button> : <button className="composer__send" type="button" onClick={() => submit()} disabled={!draft.trim() || !canAsk} aria-label="发送问题" title="发送问题">
              <Send size={17} />
            </button>}
              </div>
            </div>
          </div>
          <span className="composer-hint">回答仅依据当前知识及其来源</span>
        </div>
      </section>

      <AnimatePresence>
        {evidenceAnswer ? (
          <EvidencePanel
            result={evidenceAnswer}
            selectedCitation={selectedCitation}
            onSelect={setSelectedCitation}
            onOpenSource={setPreviewCitation}
            onClose={() => {
              setEvidenceAnswer(null);
              setSelectedCitation(null);
              setEvidencePanelDismissed(true);
            }}
          />
        ) : null}
      </AnimatePresence>
      <SidePanel open={Boolean(previewCitation)} onOpenChange={(open) => { if (!open) setPreviewCitation(null); }} title={previewCitation?.sourceTitle ?? "原始资料"} description={previewCitation?.pageNumber ? `第 ${previewCitation.pageNumber} 页` : previewCitation?.blockLabel ?? "引用原文"} wide>
        {previewCitation ? <SourcePreview citation={previewCitation} /> : null}
      </SidePanel>
      <Dialog.Root open={Boolean(messageToDelete)} onOpenChange={(open) => {
        if (!open && !deleteMutation.isPending) setMessageToDelete(null);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="removal-dialog">
            <Dialog.Title>{messageToDelete?.role === "user" ? "删除问题" : "删除回答"}</Dialog.Title>
            <Dialog.Description>
              {messageToDelete?.role === "user"
                ? "确定删除这条问题吗？由它生成的回答、引用及质量审核也会一起删除；原始资料和已发布知识不受影响。"
                : "确定删除这条回答吗？该回答的引用、事件及质量审核也会删除，原问题保留。"}
            </Dialog.Description>
            {deleteMutation.isError ? (
              <div className="inline-notice inline-notice--error" role="alert">
                <AlertTriangle size={16} /><div><strong>删除未完成</strong><span>{deleteMutation.error.message}</span></div>
              </div>
            ) : null}
            <div className="removal-dialog__actions">
              <button className="button button--secondary" type="button" disabled={deleteMutation.isPending} onClick={() => setMessageToDelete(null)}>返回</button>
              <button className="button button--danger" type="button" disabled={deleteMutation.isPending} onClick={() => {
                if (messageToDelete) deleteMutation.mutate(messageToDelete.id);
              }}>
                {deleteMutation.isPending ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}
                确认删除
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}

function SourcePreview({ citation }: { citation: Citation }) {
  const sourceContent = useQuery({
    queryKey: ["source-content", citation.sourceVersionId],
    queryFn: () => api.sourceContent(citation.sourceVersionId),
  });
  return (
    <>
      {sourceContent.isLoading ? <LoadingState label="正在读取原始资料" /> : null}
      {sourceContent.isError ? <ErrorState message={sourceContent.error.message} onRetry={() => sourceContent.refetch()} /> : null}
      {sourceContent.data ? (
        <>
          {["application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"].includes(sourceContent.data.mimeType) ? (
            <div className="source-meta-strip">
              <a className="source-original-link" href={`/api/v1/source-versions/${encodeURIComponent(citation.sourceVersionId)}/original${sourceContent.data.mimeType === "application/pdf" && citation.pageNumber ? `#page=${citation.pageNumber}` : ""}`} target="_blank" rel="noopener noreferrer">
                <ExternalLink size={14} />{sourceContent.data.mimeType === "application/pdf" ? "查看 PDF 原件" : "下载 Word 原件"}
              </a>
            </div>
          ) : null}
          <SourceDocumentReader
            source={sourceContent.data}
            location={{ start: citation.charStart, end: citation.charEnd, pageNumber: citation.pageNumber, blockNumber: citation.blockNumber }}
          />
        </>
      ) : null}
    </>
  );
}

function EvidencePanel({
  result,
  selectedCitation,
  onSelect,
  onOpenSource,
  onClose,
}: {
  result: AnswerResult;
  selectedCitation: Citation | null;
  onSelect: (citation: Citation | null) => void;
  onOpenSource: (citation: Citation) => void;
  onClose: () => void;
}) {
  const cardRefs = useRef(new Map<number, HTMLElement>());

  useEffect(() => {
    if (!selectedCitation) return;
    window.requestAnimationFrame(() => {
      cardRefs.current.get(selectedCitation.index)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });
  }, [selectedCitation]);

  return (
    <motion.aside
      className="evidence-panel"
      initial={{ opacity: 0, x: 24 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 24 }}
    >
      <header>
        <div>
          <span className="eyebrow">采用 {result.usedSourceCount} · 检索 {result.retrievedSourceCount}</span>
          <h2>来源证据</h2>
        </div>
        <div className="evidence-panel__header-actions">
          {selectedCitation ? <button type="button" onClick={() => onSelect(null)}>全部折叠</button> : null}
          <button className="icon-button" type="button" onClick={onClose} aria-label="关闭来源证据"><X size={16} /></button>
        </div>
      </header>
      <div className="evidence-panel__list">
        {result.citations.map((citation) => {
          const expanded = selectedCitation?.index === citation.index;
          const location = citation.pageNumber ? `第 ${citation.pageNumber} 页` : citation.blockLabel ?? "";
          const recognition = citation.extractionMethod === "ocr"
            ? citation.reviewStatus === "reviewed"
              ? `已人工校对（原始识别 ${Math.round(citation.qualityScore ?? 0)} 分）`
              : `文字识别 ${Math.round(citation.qualityScore ?? 0)} 分`
            : "";
          const summaryDetail = [location, recognition].filter(Boolean).join(" · ");
          return (
            <article
              key={`${result.answerId}-${citation.index}`}
              ref={(node) => {
                if (node) cardRefs.current.set(citation.index, node);
                else cardRefs.current.delete(citation.index);
              }}
              className={`evidence-source-card${expanded ? " is-expanded" : ""}`}
            >
              <button
                className="evidence-source-card__trigger"
                type="button"
                onClick={() => {
                  onSelect(citation);
                  onOpenSource(citation);
                }}
                aria-haspopup="dialog"
              >
                <span className="evidence-source-card__index">{citation.index}</span>
                <span className="evidence-source-card__summary">
                  <small>{citation.knowledgeTitle ?? "原始资料"}</small>
                  <strong className="evidence-source-card__excerpt">{citation.quote.replace(/\s+/g, " ").trim()}</strong>
                  <span className="evidence-source-card__source">{citation.sourceTitle}{summaryDetail ? <em> · {summaryDetail}</em> : null}</span>
                </span>
                <ChevronRight size={15} />
              </button>
              <AnimatePresence initial={false}>
                {expanded ? (
                  <motion.div
                    className="evidence-source-card__detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                  >
                    <blockquote>{citation.quote}</blockquote>
                    <div className="evidence-location">原文位置：{citation.pageNumber ? `第 ${citation.pageNumber} 页 · ` : citation.blockLabel ? `${citation.blockLabel} · ` : ""}字符 {citation.charStart}–{citation.charEnd}{citation.extractionMethod === "ocr" ? citation.reviewStatus === "reviewed" ? ` · 已人工校对（原始识别 ${Math.round(citation.qualityScore ?? 0)} 分）` : ` · 文字识别 ${Math.round(citation.qualityScore ?? 0)} 分` : ""}</div>
                    <div className="evidence-panel__actions">
                      {citation.knowledgeId ? (
                        <Link className="button button--primary" to={`/knowledge/${citation.knowledgeId}`}>
                          <BookOpenText size={14} />阅读知识页面
                        </Link>
                      ) : null}
                      <button className="button button--secondary" type="button" onClick={() => onOpenSource(citation)}>
                        <FileText size={14} />查看原始资料
                      </button>
                    </div>
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </article>
          );
        })}
      </div>
    </motion.aside>
  );
}

function AnswerFooter({
  result,
  onCitation,
  onOpenEvidence,
  onCopy,
  copied,
}: {
  result: AnswerResult;
  onCitation: (citation: Citation) => void;
  onOpenEvidence: () => void;
  onCopy: () => void;
  copied: boolean;
}) {
  const navigate = useNavigate();
  const setGraphSelectedId = useUIStore((state) => state.setGraphSelectedId);
  return (
    <footer className="answer-footer">
      <div className="answer-evidence-summary">
        <StatusBadge status={result.evidenceStatus} />
        <span>采用 {result.usedSourceCount} / 检索 {result.retrievedSourceCount}</span>
        {result.citations.map((citation) => (
          <button key={citation.index} onClick={() => onCitation(citation)} type="button" title={citation.sourceTitle}>[{citation.index}]</button>
        ))}
      </div>
      <div className="answer-actions">
        <button type="button" onClick={onCopy}>{copied ? <Check size={14} /> : <Copy size={14} />}{copied ? "已复制" : "复制"}</button>
        {result.citations.length ? <button type="button" onClick={onOpenEvidence}><PanelRightOpen size={14} />查看来源</button> : null}
        {result.relatedKnowledgeIds[0] ? <button type="button" onClick={() => navigate(`/knowledge/${result.relatedKnowledgeIds[0]}`)}><BookOpenText size={14} />相关知识</button> : null}
        {result.relatedKnowledgeIds[0] ? <button type="button" onClick={() => { setGraphSelectedId(result.relatedKnowledgeIds[0]); navigate("/graph"); }}><GitFork size={14} />图谱关系</button> : null}
      </div>
    </footer>
  );
}
