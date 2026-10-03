import * as Dialog from "@radix-ui/react-dialog";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import {
  BookOpenText,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  FileStack,
  GitFork,
  LoaderCircle,
  Menu,
  MessageSquareText,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  Trash2,
  X,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useUIStore } from "../state/ui";
import { ErrorState, LoadingState } from "./AsyncState";

const navItems = [
  { to: "/", label: "知识问答", icon: MessageSquareText, end: true },
  { to: "/sources", label: "资料管理", icon: FileStack },
  { to: "/knowledge", label: "知识页面", icon: BookOpenText },
  { to: "/graph", label: "知识图谱", icon: GitFork },
  { to: "/answer-quality", label: "问答质量", icon: ClipboardCheck },
  { to: "/settings", label: "设置", icon: Settings },
];

export function AppShell() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const collapsed = useUIStore((state) => state.sidebarCollapsed);
  const toggleSidebar = useUIStore((state) => state.toggleSidebar);
  const resolvedTheme = useUIStore((state) => state.resolvedTheme);
  const setTheme = useUIStore((state) => state.setTheme);
  const setReduceMotion = useUIStore((state) => state.setReduceMotion);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<{ id: string; title: string } | null>(null);
  const bootstrap = useQuery({ queryKey: ["bootstrap"], queryFn: api.bootstrap, refetchInterval: 12_000 });
  const toggleTheme = useMutation({
    mutationFn: () => api.saveAppearance({
      themePreference: resolvedTheme === "dark" ? "light" : "dark",
      reduceMotion: useUIStore.getState().reduceMotion,
    }),
    onSuccess: (appearance) => {
      queryClient.setQueryData(["bootstrap"], (current: typeof bootstrap.data) => current && ({ ...current, appearance }));
      queryClient.setQueryData(["appearance-settings"], appearance);
      setTheme(appearance.themePreference);
    },
  });
  const createConversation = useMutation({
    mutationFn: () => api.createConversation(),
    onSuccess: (conversation) => {
      queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      navigate(`/conversations/${conversation.conversationId}`);
    },
  });
  const deleteConversation = useMutation({
    mutationFn: api.deleteConversation,
    onSuccess: (_result, conversationId) => {
      setConversationToDelete(null);
      queryClient.setQueryData(["bootstrap"], (current: typeof bootstrap.data) => current && ({
        ...current,
        recentConversations: current.recentConversations.filter((item) => item.conversationId !== conversationId),
      }));
      if (location.pathname === `/conversations/${conversationId}`) navigate("/");
      queryClient.removeQueries({ queryKey: ["conversation", conversationId] });
      void queryClient.invalidateQueries({ queryKey: ["bootstrap"] });
      void queryClient.invalidateQueries({ queryKey: ["answer-quality"] });
    },
  });

  useEffect(() => {
    if (!bootstrap.data) return;
    const appearance = bootstrap.data.appearance;
    if (useUIStore.getState().themePreference !== appearance.themePreference) {
      setTheme(appearance.themePreference);
    }
    if (useUIStore.getState().reduceMotion !== appearance.reduceMotion) {
      setReduceMotion(appearance.reduceMotion);
    }
  }, [bootstrap.data, setReduceMotion, setTheme]);
  useEffect(() => { setMobileNavOpen(false); }, [location.pathname]);

  if (bootstrap.isLoading) return <LoadingState label="正在准备知识工作区" />;
  if (bootstrap.isError || !bootstrap.data) {
    return <ErrorState message={bootstrap.error?.message ?? "系统启动状态不可用"} onRetry={() => bootstrap.refetch()} />;
  }

  const data = bootstrap.data;
  const activeCount = data.activeCompileRuns.filter((run) => run.status !== "awaiting_review").length;
  const reviewCount = data.activeCompileRuns.filter((run) => run.status === "awaiting_review").length;
  const graphMode = location.pathname === "/graph";
  const pageTitle = location.pathname.startsWith("/answer-quality") ? "问答质量"
    : location.pathname.startsWith("/sources") ? "资料管理"
    : location.pathname.startsWith("/knowledge") ? "知识页面"
      : graphMode ? "知识图谱" : location.pathname.startsWith("/settings") ? "设置" : "知识问答";

  return (
    <div className={`app-shell${collapsed ? " app-shell--collapsed" : ""}${mobileNavOpen ? " app-shell--nav-open" : ""}`}>
      {mobileNavOpen ? <button className="mobile-nav-backdrop" type="button" aria-label="关闭导航" onClick={() => setMobileNavOpen(false)} /> : null}
      <aside className="sidebar" aria-label="主导航">
        <div className="brand-lockup">
          <img src="/knowledge-avatar-minimal.png" alt="FF - LLM Wiki知识库 头像" />
          <AnimatePresence initial={false}>
            {(!collapsed || mobileNavOpen) ? (
              <motion.div initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: "auto" }} exit={{ opacity: 0, width: 0 }}>
                <strong>FF - LLM Wiki知识库</strong>
              </motion.div>
            ) : null}
          </AnimatePresence>
          <button className="mobile-nav-close" type="button" aria-label="关闭导航" onClick={() => setMobileNavOpen(false)}><X size={17} /></button>
        </div>

        <button
          className="new-conversation"
          onClick={() => createConversation.mutate()}
          disabled={createConversation.isPending}
          type="button"
          aria-label="新建对话"
        >
          <Plus size={17} />{!collapsed || mobileNavOpen ? <span>新建提问</span> : null}
        </button>

        {!collapsed || mobileNavOpen ? <div className="sidebar-section-title sidebar-section-title--nav">工作区</div> : null}
        <nav className="primary-nav">
          {navItems.map(({ to, label, icon: Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => `nav-item${isActive ? " is-active" : ""}`}>
              <Icon size={18} />
              {!collapsed || mobileNavOpen ? <span>{label}</span> : null}
              {(!collapsed || mobileNavOpen) && label === "资料管理" && activeCount + reviewCount > 0 ? (
                <b className="nav-count" title={`${activeCount} 个处理中，${reviewCount} 个等待确认`}>
                  {activeCount + reviewCount}
                </b>
              ) : null}
            </NavLink>
          ))}
        </nav>

        {!collapsed || mobileNavOpen ? (
          <section className="recent-conversations" aria-label="最近对话">
            <div className="sidebar-section-title"><span>最近提问</span></div>
            <div className="recent-conversations__list">
              {data.recentConversations.length ? data.recentConversations.map((conversation) => (
                <div className={`recent-conversations__item${location.pathname === `/conversations/${conversation.conversationId}` ? " is-active" : ""}`} key={conversation.conversationId}>
                  <button className="recent-conversations__open" onClick={() => navigate(`/conversations/${conversation.conversationId}`)} title={conversation.title} type="button">
                    {conversation.title}
                  </button>
                  <button className="recent-conversations__delete" type="button" title={`删除对话：${conversation.title}`} aria-label={`删除对话：${conversation.title}`} onClick={() => {
                    deleteConversation.reset();
                    setConversationToDelete({ id: conversation.conversationId, title: conversation.title });
                  }}><Trash2 size={14} /></button>
                </div>
              )) : <span className="sidebar-empty">暂无提问记录</span>}
            </div>
          </section>
        ) : null}

        <div className="sidebar-bottom">
          <div className="sidebar-bottom__row">
            {!collapsed || mobileNavOpen ? <span className="sidebar-project" title={data.project.name}>{data.project.name}</span> : null}
            <button className="sidebar-theme" onClick={() => toggleTheme.mutate()} disabled={toggleTheme.isPending} type="button" aria-label={resolvedTheme === "dark" ? "切换浅色主题" : "切换深色主题"} title={resolvedTheme === "dark" ? "切换浅色主题" : "切换深色主题"}>
              {resolvedTheme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="sidebar-collapse" onClick={toggleSidebar} type="button" aria-label={collapsed ? "展开侧边栏" : "收起侧边栏"} title={collapsed ? "展开侧边栏" : "收起侧边栏"}>
              {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
            </button>
          </div>
          {toggleTheme.isError ? <span className="sidebar-theme-error" role="alert">{toggleTheme.error.message}</span> : null}
          {!collapsed || mobileNavOpen ? <small>@2026 赋范空间 独家自研</small> : null}
        </div>
      </aside>

      <main className={`workspace${graphMode ? " workspace--graph" : ""}`}>
        <header className="workspace-statusbar">
          <button className="mobile-nav-open" type="button" aria-label="打开导航" onClick={() => setMobileNavOpen(true)}><Menu size={18} /></button>
          <strong className="workspace-title">{pageTitle}</strong>
          <div className="workspace-statusbar__end">
          <div className="global-search" role="search">
            <Search size={15} />
            <input aria-label="搜索当前知识" placeholder="搜索知识标题或内容" onKeyDown={(event) => {
              if (event.key === "Enter" && event.currentTarget.value.trim()) {
                navigate(`/knowledge?query=${encodeURIComponent(event.currentTarget.value.trim())}`);
              }
            }} />
          </div>
          <div className="knowledge-version">
            <span className={`status-dot${data.snapshot ? " status-dot--ok" : ""}`} />
            <span>{data.snapshot ? `${data.snapshot.knowledgeCount} 条知识 · ${data.snapshot.relationCount} 条关系` : "尚无可用知识"}</span>
            {activeCount ? <b>{activeCount} 个任务处理中</b> : null}
            {reviewCount ? <b>{reviewCount} 个结果待确认</b> : null}
          </div>
          </div>
        </header>
        <Outlet />
      </main>
      <Dialog.Root open={Boolean(conversationToDelete)} onOpenChange={(open) => {
        if (!open && !deleteConversation.isPending) setConversationToDelete(null);
      }}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content className="removal-dialog">
            <Dialog.Title>删除对话</Dialog.Title>
            <Dialog.Description>
              确定删除「{conversationToDelete?.title}」吗？该对话中的问题、回答和质量审核会一并删除；原始资料和已发布知识不受影响。
            </Dialog.Description>
            {deleteConversation.isError ? <div className="inline-notice inline-notice--error" role="alert"><AlertTriangle size={16} /><div><strong>删除未完成</strong><span>{deleteConversation.error.message}</span></div></div> : null}
            <div className="removal-dialog__actions">
              <button className="button button--secondary" type="button" disabled={deleteConversation.isPending} onClick={() => setConversationToDelete(null)}>返回</button>
              <button className="button button--danger" type="button" disabled={deleteConversation.isPending} onClick={() => conversationToDelete && deleteConversation.mutate(conversationToDelete.id)}>
                {deleteConversation.isPending ? <LoaderCircle className="spin" size={16} /> : <Trash2 size={16} />}确认删除
              </button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
