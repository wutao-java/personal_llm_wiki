import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { LoadingState } from "./components/AsyncState";

const ChatPage = lazy(() => import("./features/chat/ChatPage").then((module) => ({ default: module.ChatPage })));
const GraphPage = lazy(() => import("./features/graph/GraphPage").then((module) => ({ default: module.GraphPage })));
const KnowledgePage = lazy(() => import("./features/knowledge/KnowledgePage").then((module) => ({ default: module.KnowledgePage })));
const SettingsPage = lazy(() => import("./features/settings/SettingsPage").then((module) => ({ default: module.SettingsPage })));
const SourcesPage = lazy(() => import("./features/sources/SourcesPage").then((module) => ({ default: module.SourcesPage })));
const AnswerQualityPage = lazy(() => import("./features/sources/AnswerQualityPage").then((module) => ({ default: module.AnswerQualityPage })));

function PageLoader({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<LoadingState label="正在打开功能页面" />}>{children}</Suspense>;
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<PageLoader><ChatPage /></PageLoader>} />
        <Route path="conversations/:conversationId" element={<PageLoader><ChatPage /></PageLoader>} />
        <Route path="sources" element={<PageLoader><SourcesPage /></PageLoader>} />
        <Route path="sources/quality" element={<Navigate to="/answer-quality" replace />} />
        <Route path="answer-quality" element={<PageLoader><AnswerQualityPage /></PageLoader>} />
        <Route path="knowledge" element={<PageLoader><KnowledgePage /></PageLoader>} />
        <Route path="knowledge/:knowledgeId" element={<PageLoader><KnowledgePage /></PageLoader>} />
        <Route path="graph" element={<PageLoader><GraphPage /></PageLoader>} />
        <Route path="settings" element={<PageLoader><SettingsPage /></PageLoader>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
