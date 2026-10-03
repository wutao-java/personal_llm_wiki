import { AlertCircle, LoaderCircle, RotateCcw } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ label = "正在读取内容" }: { label?: string }) {
  return (
    <div className="state-panel" role="status">
      <LoaderCircle className="spin" size={22} />
      <strong>{label}</strong>
      <span>正在从知识服务获取最新状态</span>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="state-panel state-panel--error" role="alert">
      <AlertCircle size={22} />
      <strong>内容暂时无法加载</strong>
      <span>{message}</span>
      {onRetry ? (
        <button className="button button--secondary" onClick={onRetry} type="button">
          <RotateCcw size={15} />重新加载
        </button>
      ) : null}
    </div>
  );
}

export function EmptyState({ icon, title, description, action }: { icon: ReactNode; title: string; description: string; action?: ReactNode }) {
  return (
    <div className="state-panel state-panel--empty">
      <div className="state-panel__icon">{icon}</div>
      <strong>{title}</strong>
      <span>{description}</span>
      {action}
    </div>
  );
}

