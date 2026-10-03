import { CheckCircle2, CircleAlert, Clock3, LoaderCircle } from "lucide-react";

const labels: Record<string, string> = {
  ready: "可用",
  imported: "已入库",
  extracted: "已读取",
  update_pending: "待生成知识",
  needs_review: "文字待核对",
  queued: "等待处理",
  running: "处理中",
  publishing: "正在发布",
  awaiting_review: "等待确认",
  completed: "已完成",
  failed: "未完成",
  interrupted: "已中断",
  cancelled: "已取消",
  accepted: "已确认",
  available: "连接可用",
  unavailable: "连接不可用",
  untested: "等待测试",
  incomplete: "配置不完整",
  sufficient: "证据充分",
  limited: "证据有限",
  insufficient: "证据不足",
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const busy = ["queued", "running", "publishing"].includes(status);
  const error = ["failed", "interrupted", "unavailable", "incomplete"].includes(status);
  const success = ["ready", "completed", "accepted", "available", "sufficient"].includes(status);
  const Icon = busy ? LoaderCircle : error ? CircleAlert : success ? CheckCircle2 : Clock3;
  return (
    <span className={`status-badge status-badge--${error ? "error" : success ? "success" : busy ? "busy" : "neutral"}`}>
      <Icon className={busy ? "spin" : ""} size={12} />
      {label ?? labels[status] ?? status}
    </span>
  );
}
