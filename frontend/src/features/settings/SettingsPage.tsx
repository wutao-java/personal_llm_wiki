import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArchiveRestore,
  CheckCircle2,
  Cloud,
  Download,
  Eye,
  EyeOff,
  KeyRound,
  Laptop,
  LoaderCircle,
  Moon,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Search,
  Sun,
  Upload,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../api/client";
import type { ProjectBackupSummary, ThemePreference } from "../../api/types";
import { ErrorState, LoadingState } from "../../components/AsyncState";
import { PageHeader } from "../../components/PageHeader";
import { StatusBadge } from "../../components/StatusBadge";
import { useUIStore } from "../../state/ui";

export function SettingsPage() {
  const queryClient = useQueryClient();
  const setTheme = useUIStore((state) => state.setTheme);
  const setReduceMotion = useUIStore((state) => state.setReduceMotion);
  const models = useQuery({ queryKey: ["model-settings"], queryFn: api.models });
  const appearance = useQuery({ queryKey: ["appearance-settings"], queryFn: api.appearance });
  const [selectedProfileId, setSelectedProfileId] = useState("deepseek-default");
  const model = models.data?.profiles.find((profile) => profile.profileId === selectedProfileId);
  const [form, setForm] = useState({ name: "DeepSeek 在线服务", baseUrl: "https://api.deepseek.com", modelId: "", modelIds: [] as string[], apiKey: "" });
  const [localForm, setLocalForm] = useState({ name: "", baseUrl: "", modelId: "" });
  const [showKey, setShowKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [modelSearch, setModelSearch] = useState("");
  const [manualModel, setManualModel] = useState("");
  const discover = useMutation({
    mutationFn: () => api.discoverModels(selectedProfileId, {
      baseUrl: form.baseUrl.trim(), ...(form.apiKey.trim() ? { apiKey: form.apiKey.trim() } : {}),
    }),
    onSuccess: (result) => {
      setForm((current) => {
        const modelIds = Array.from(new Set([...current.modelIds, ...result.models]));
        return { ...current, modelIds, modelId: current.modelId || modelIds[0] || "" };
      });
      setModelSearch("");
    },
  });

  useEffect(() => {
    if (!model) return;
    setForm({ name: model.name, baseUrl: model.baseUrl, modelId: model.modelId, modelIds: model.modelIds ?? (model.modelId ? [model.modelId] : []), apiKey: "" });
    setSaved(false);
    discover.reset();
    setModelSearch("");
    setManualModel("");
    // The profile selection controls which remote catalog these results belong to.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [model, selectedProfileId]);

  const saveModel = useMutation({
    mutationFn: () => api.saveModel(selectedProfileId, { ...form, apiKey: form.apiKey || undefined }),
    onSuccess: (result) => {
      queryClient.setQueryData(["model-settings"], (current: typeof models.data) => current && ({
        ...current, profiles: current.profiles.map((profile) => profile.profileId === result.profileId ? result : profile),
      }));
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      setForm((current) => ({ ...current, apiKey: "" }));
      testModel.reset();
      discover.reset();
      setSaved(true);
      window.setTimeout(() => setSaved(false), 1600);
    },
  });
  const testModel = useMutation({
    mutationFn: () => api.testModel(selectedProfileId),
    onSuccess: (result) => {
      queryClient.setQueryData(["model-settings"], (current: typeof models.data) => current && ({
        ...current, profiles: current.profiles.map((profile) => profile.profileId === result.profileId ? result : profile),
      }));
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });
  const activateModel = useMutation({
    mutationFn: () => api.activateModel(selectedProfileId),
    onSuccess: (result) => {
      queryClient.setQueryData(["model-settings"], result);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });
  const saveAppearance = useMutation({
    mutationFn: (payload: { themePreference: ThemePreference; reduceMotion: boolean }) => api.saveAppearance(payload),
    onMutate: (payload) => {
      setTheme(payload.themePreference);
      setReduceMotion(payload.reduceMotion);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(["appearance-settings"], result);
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
    },
  });

  const currentAppearance = appearance.data ?? { themePreference: useUIStore.getState().themePreference, reduceMotion: useUIStore.getState().reduceMotion };
  const updateTheme = (themePreference: ThemePreference) => saveAppearance.mutate({ themePreference, reduceMotion: currentAppearance.reduceMotion });
  const updateMotion = (reduceMotion: boolean) => saveAppearance.mutate({ themePreference: currentAppearance.themePreference, reduceMotion });
  const hasUnsavedModel = Boolean(model && (form.name !== model.name || form.baseUrl !== model.baseUrl || form.modelId !== model.modelId || JSON.stringify(form.modelIds) !== JSON.stringify(model.modelIds ?? (model.modelId ? [model.modelId] : [])) || form.apiKey));
  const addManualModel = () => {
    const id = manualModel.trim();
    if (!id || id.length > 160) return;
    setForm((current) => ({
      ...current, modelIds: current.modelIds.includes(id) ? current.modelIds : [...current.modelIds, id],
      modelId: current.modelId || id,
    }));
    setManualModel("");
    setModelSearch("");
  };

  return (
    <div className="page page--settings">
      <PageHeader title="设置" description="管理用于知识编译和问答的模型服务" />
      <div className="settings-layout">
        <section className="settings-section settings-section--models">
          <header><div><h2>模型服务</h2><p>知识生成和带引用问答共用当前选中的在线配置。</p></div></header>
          {models.isLoading ? <LoadingState label="正在读取模型配置" /> : null}
          {models.isError ? <ErrorState message={models.error.message} onRetry={() => models.refetch()} /> : null}
          <div className="model-settings model-settings-layout">
              <div className="model-settings-layout__providers" aria-label="模型服务">
              {models.data?.profiles.map((profile) => (
                <button className={`model-provider-card model-provider-card--selectable${profile.profileId === selectedProfileId ? " is-selected" : ""}${profile.profileId === models.data?.activeProfileId ? " is-active" : ""}`} type="button" key={profile.profileId} aria-pressed={profile.profileId === selectedProfileId} disabled={saveModel.isPending || testModel.isPending || activateModel.isPending || discover.isPending} onClick={() => { setSelectedProfileId(profile.profileId!); testModel.reset(); saveModel.reset(); activateModel.reset(); }}>
                  <div className="model-provider-card__logo"><Cloud size={21} /></div>
                  <div><strong>{profile.profileId === "deepseek-default" ? "DeepSeek 在线模型" : "OpenAI 兼容服务"}</strong><span>{profile.profileId === models.data?.activeProfileId ? "当前使用" : "可配置和连接测试"}</span></div>
                  <StatusBadge status={profile.status} />
                </button>
              ))}
              <button className={`model-provider-card model-provider-card--selectable${selectedProfileId === "local-model" ? " is-selected" : ""}`} type="button" aria-pressed={selectedProfileId === "local-model"} disabled={saveModel.isPending || testModel.isPending || activateModel.isPending || discover.isPending} onClick={() => setSelectedProfileId("local-model")}>
                <div className="model-provider-card__logo"><Laptop size={21} /></div>
                <div><strong>本地模型</strong><span>当前版本暂未接入本地模型</span></div>
                <StatusBadge status="incomplete" label="暂未接入" />
              </button>
              </div>
              {selectedProfileId === "local-model" ? (
                <section className="model-settings-layout__detail" aria-labelledby="local-model-heading">
                  <div className="model-settings-layout__heading">
                    <h3 id="local-model-heading">本地模型</h3>
                    <StatusBadge status="incomplete" label="暂未接入" />
                  </div>
                  <p className="model-settings-layout__subtitle">当前版本暂未接入本地模型</p>
                  <div className="settings-form">
                    <label><span>连接名称</span><input value={localForm.name} onChange={(event) => setLocalForm({ ...localForm, name: event.target.value })} placeholder="本地模型服务" /></label>
                    <label><span>本地服务地址</span><input value={localForm.baseUrl} onChange={(event) => setLocalForm({ ...localForm, baseUrl: event.target.value })} placeholder="http://127.0.0.1:11434" /></label>
                    <label><span>本地模型标识</span><input value={localForm.modelId} onChange={(event) => setLocalForm({ ...localForm, modelId: event.target.value })} placeholder="填写本地服务的模型标识" /></label>
                  </div>
                  <small>填写内容仅在当前页面保留，不会连接或用于知识生成与问答。</small>
                </section>
              ) : model && models.data ? (
              <div className="model-settings-layout__detail">
                <div className="model-settings-layout__heading">
                  <h3>{selectedProfileId === "deepseek-default" ? "DeepSeek" : "OpenAI 兼容服务"}</h3>
                  <StatusBadge status={model.status} />
                </div>
                <p className="model-settings-layout__subtitle">连接在线服务后，可获取该服务提供的模型列表。</p>
              <div className="settings-form">
                <label><span>配置名称</span><input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="在线模型服务" /></label>
                <label><span>服务地址</span><div className="input-with-icon"><Cloud size={15} /><input value={form.baseUrl} disabled={discover.isPending} onChange={(event) => { setForm({ ...form, baseUrl: event.target.value, modelId: "", modelIds: [] }); discover.reset(); }} placeholder={selectedProfileId === "deepseek-default" ? "https://api.deepseek.com" : "https://api.openai.com/v1"} /></div><small>{selectedProfileId === "deepseek-default" ? "使用 HTTPS" : "可使用 HTTP 或 HTTPS"}；填写不含凭据的 API 根地址，兼容服务应支持 /chat/completions。</small>{selectedProfileId === "openai-compatible" && form.baseUrl.trim().toLowerCase().startsWith("http://") ? <small className="model-http-warning">HTTP 连接会明文传输 API 凭据和提问内容、资料片段，请仅连接可信服务。</small> : null}</label>
                <label><span>API 凭据</span><div className="input-with-icon"><KeyRound size={15} /><input type={showKey ? "text" : "password"} disabled={discover.isPending} value={form.apiKey} onChange={(event) => { setForm({ ...form, apiKey: event.target.value }); discover.reset(); }} placeholder={model.keyConfigured ? `${model.credentialMask} · 留空表示不更换` : "输入当前服务的 API 凭据"} autoComplete="new-password" /><button type="button" onClick={() => setShowKey((value) => !value)} aria-label={showKey ? "隐藏凭据" : "显示凭据"}>{showKey ? <EyeOff size={15} /> : <Eye size={15} />}</button></div><small>页面保存时写入 Windows 凭据管理器，不写入项目文件。</small></label>
              </div>
              <div className="model-discovery">
                <div className="model-discovery__heading"><div><strong>可用模型</strong><span>获取后全部加入列表，保存配置后可在问答框选择。</span></div><button className="button button--secondary" type="button" disabled={discover.isPending || !form.baseUrl.trim() || (!form.apiKey.trim() && !model.keyConfigured)} onClick={() => discover.mutate()}>{discover.isPending ? <LoaderCircle className="spin" size={15} /> : <RefreshCw size={15} />}获取可用模型</button></div>
                {discover.isError ? <p className="model-discovery__error" role="alert">{discover.error.message}</p> : null}
                <div className="model-discovery__add"><input aria-label="手动添加模型" placeholder="输入模型名称" maxLength={160} value={manualModel} onChange={(event) => setManualModel(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addManualModel(); } }} /><button className="button button--secondary" type="button" disabled={!manualModel.trim()} onClick={addManualModel}><Plus size={15} />添加模型</button></div>
                {form.modelIds.length ? <div className="model-discovery__results">
                  <div className="model-discovery__search"><Search size={15} /><input type="search" aria-label="搜索可用模型" placeholder="搜索模型" value={modelSearch} onChange={(event) => setModelSearch(event.target.value)} /><span>{form.modelIds.length} 个</span></div>
                  <ul className="model-discovery__list" aria-label="可用模型列表">
                    {form.modelIds.filter((id) => id.toLowerCase().includes(modelSearch.trim().toLowerCase())).map((id) => <li key={id}>{id}</li>)}
                  </ul>
                </div> : <p className="model-discovery__empty">暂无模型，请在线获取或手动添加。</p>}
              </div>

              {model.lastTestedAt ? <div className="connection-result"><div><StatusBadge status={model.status} /><span>最近测试 {formatDateTime(model.lastTestedAt)}</span>{model.lastLatencyMs ? <span>{model.lastLatencyMs} ms</span> : null}</div>{model.lastError ? <p>{model.lastError}</p> : null}</div> : null}
              {saveModel.isError ? <div className="inline-notice inline-notice--error"><div><strong>配置未保存</strong><span>{saveModel.error.message}</span></div></div> : null}
              {testModel.isError ? <div className="inline-notice inline-notice--error"><div><strong>连接测试未完成</strong><span>{testModel.error.message}</span></div></div> : null}
              {activateModel.isError ? <div className="inline-notice inline-notice--error"><div><strong>未能切换模型</strong><span>{activateModel.error.message}</span></div></div> : null}
              {testModel.data && !hasUnsavedModel ? <div className={`inline-notice ${testModel.data.available ? "inline-notice--success" : "inline-notice--error"}`}><CheckCircle2 size={17} /><div><strong>{testModel.data.available ? "连接测试通过" : "连接测试未通过"}</strong><span>{testModel.data.message}</span></div></div> : null}
              {selectedProfileId === "openai-compatible" ? <small>连接测试会向服务发送一条简短请求，可能产生费用。</small> : null}
              <div className="settings-actions">
                {selectedProfileId !== models.data.activeProfileId ? <button className="button button--secondary" type="button" disabled={activateModel.isPending || model.status !== "available" || hasUnsavedModel || saveModel.isPending} onClick={() => activateModel.mutate()}>{activateModel.isPending ? <LoaderCircle className="spin" size={16} /> : <CheckCircle2 size={16} />}设为当前模型</button> : null}
                <button className="button button--secondary" type="button" disabled={testModel.isPending || saveModel.isPending || hasUnsavedModel || model.status === "incomplete"} onClick={() => testModel.mutate()}>{testModel.isPending ? <LoaderCircle className="spin" size={16} /> : <Cloud size={16} />}测试连接</button>
                <button className="button button--primary" type="button" disabled={saveModel.isPending || testModel.isPending || !hasUnsavedModel || !form.name.trim() || !form.baseUrl.trim() || !form.modelId.trim()} onClick={() => saveModel.mutate()}>{saveModel.isPending ? <LoaderCircle className="spin" size={16} /> : saved ? <CheckCircle2 size={16} /> : <Save size={16} />}{saved ? "已保存" : "保存配置"}</button>
              </div>
              </div>
              ) : null}
          </div>
        </section>

        <section className="settings-section">
          <header><div className="settings-section__icon"><Palette size={19} /></div><div><h2>外观</h2><p>主题会同步适配知识问答、资料阅读和知识图谱。</p></div></header>
          {appearance.isLoading ? <LoadingState label="正在读取外观设置" /> : null}
          {appearance.data ? (
            <div className="appearance-settings">
              <div className="theme-options" role="radiogroup" aria-label="主题模式">
                <button className={currentAppearance.themePreference === "system" ? "is-active" : ""} onClick={() => updateTheme("system")} type="button"><span className="theme-preview theme-preview--system"><i /><i /></span><strong>跟随系统</strong><small>自动使用系统外观</small></button>
                <button className={currentAppearance.themePreference === "light" ? "is-active" : ""} onClick={() => updateTheme("light")} type="button"><span className="theme-preview theme-preview--light"><Sun size={18} /></span><strong>浅色</strong><small>明亮清晰的阅读环境</small></button>
                <button className={currentAppearance.themePreference === "dark" ? "is-active" : ""} onClick={() => updateTheme("dark")} type="button"><span className="theme-preview theme-preview--dark"><Moon size={18} /></span><strong>深色</strong><small>沉浸式图谱与问答</small></button>
              </div>
              <div className="setting-row"><div><strong>减少动态效果</strong><span>降低页面转场、图谱粒子和持续动画。</span></div><button className={`switch${currentAppearance.reduceMotion ? " is-on" : ""}`} type="button" role="switch" aria-checked={currentAppearance.reduceMotion} onClick={() => updateMotion(!currentAppearance.reduceMotion)}><i /></button></div>
            </div>
          ) : null}
        </section>

        <ProjectDataSection />
      </div>
    </div>
  );
}

function ProjectDataSection() {
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [candidate, setCandidate] = useState<{ file: File; summary: ProjectBackupSummary } | null>(null);
  const [restored, setRestored] = useState(false);
  const inspect = useMutation({
    mutationFn: (file: File) => api.inspectBackup(file),
    onMutate: () => { setCandidate(null); setRestored(false); restore.reset(); },
    onSuccess: (summary, file) => setCandidate({ file, summary }),
  });
  const exportBackup = useMutation({
    mutationFn: api.exportProject,
    onMutate: () => setRestored(false),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ff-llm-wiki-${new Date().toISOString().slice(0, 10)}.zip`;
      link.click();
      URL.revokeObjectURL(url);
    },
  });
  const restore = useMutation({
    mutationFn: (file: File) => api.restoreProject(file),
    onSuccess: async () => {
      const projectQueries = { predicate: (query: { queryKey: readonly unknown[] }) =>
        !["bootstrap", "model-settings", "appearance-settings"].includes(String(query.queryKey[0])) };
      await queryClient.cancelQueries(projectQueries);
      useUIStore.getState().setChatDraft("");
      useUIStore.getState().setGraphSelectedId(null);
      useUIStore.getState().setGraphDomain(null);
      await queryClient.resetQueries(projectQueries);
      await queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      setCandidate(null);
      setRestored(true);
    },
  });
  const busy = inspect.isPending || restore.isPending || exportBackup.isPending;
  return (
    <section className="settings-section">
      <header><div className="settings-section__icon"><ArchiveRestore size={19} /></div><div><h2>项目数据</h2><p>原始资料、历史知识、知识图谱与对话记录</p></div></header>
      <div className="project-data">
        <span>备份包不包含模型配置、API 凭据和外观设置。</span>
        <input ref={fileInput} type="file" accept=".zip,application/zip" aria-label="选择项目备份" hidden disabled={busy} onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) inspect.mutate(file);
        }} />
        <div className="project-data__actions">
          <button className="button button--secondary" type="button" disabled={busy} onClick={() => exportBackup.mutate()}>
            {exportBackup.isPending ? <LoaderCircle className="spin" size={16} /> : <Download size={16} />}导出项目备份
          </button>
          <button className="button button--secondary" type="button" disabled={busy} onClick={() => fileInput.current?.click()}>
            {inspect.isPending ? <LoaderCircle className="spin" size={16} /> : <Upload size={16} />}{inspect.isPending ? "正在校验备份" : "恢复项目备份"}
          </button>
        </div>
        {inspect.isError || exportBackup.isError ? <div className="inline-notice inline-notice--error" role="alert">
          <AlertTriangle size={16} /><div><strong>{inspect.isError ? "备份无法恢复" : "备份未完成"}</strong><span>{inspect.error?.message ?? exportBackup.error?.message}</span></div>
        </div> : null}
        {restored ? <div className="inline-notice inline-notice--success" role="status"><CheckCircle2 size={16} /><div><strong>项目已恢复</strong><span>资料、知识和对话已更新，本机模型配置保持不变。</span></div></div> : null}
      </div>
      <Dialog.Root open={Boolean(candidate)} onOpenChange={(open) => { if (!open && !restore.isPending) setCandidate(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="removal-dialog project-restore-dialog" onEscapeKeyDown={(event) => { if (restore.isPending) event.preventDefault(); }} onPointerDownOutside={(event) => { if (restore.isPending) event.preventDefault(); }}>
            <Dialog.Title>恢复项目备份</Dialog.Title>
            <Dialog.Description>当前资料、历史知识、图谱、审核和对话将被替换，无法撤销。模型配置和凭据不受影响。</Dialog.Description>
            {candidate ? <>
              <strong className="project-restore-dialog__name">{candidate.summary.projectName}</strong>
              <span className="project-restore-dialog__date">备份时间 {formatDateTime(candidate.summary.exportedAt)}</span>
              <dl className="project-backup-summary">
                <div><dt>资料</dt><dd>{candidate.summary.sourceCount}</dd></div>
                <div><dt>资料版本</dt><dd>{candidate.summary.sourceVersionCount}</dd></div>
                <div><dt>知识记录</dt><dd>{candidate.summary.knowledgeCount}</dd></div>
                <div><dt>知识版本</dt><dd>{candidate.summary.snapshotCount}</dd></div>
                <div><dt>对话</dt><dd>{candidate.summary.conversationCount}</dd></div>
              </dl>
            </> : null}
            {restore.isError ? <div className="inline-notice inline-notice--error" role="alert"><AlertTriangle size={16} /><div><strong>恢复未完成</strong><span>{restore.error.message}</span></div></div> : null}
            <div className="removal-dialog__actions">
              <button className="button button--secondary" type="button" disabled={restore.isPending} onClick={() => setCandidate(null)}>返回</button>
              <button className="button button--danger" type="button" disabled={restore.isPending} onClick={() => { if (candidate) restore.mutate(candidate.file); }}>
                {restore.isPending ? <LoaderCircle className="spin" size={16} /> : <ArchiveRestore size={16} />}{restore.isPending ? "正在恢复" : "确认替换并恢复"}
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </section>
  );
}

function formatDateTime(value: string) { return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }).format(new Date(value)); }
