import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { api } from "../../api/client";
import type { ModelProfile, ModelSettings } from "../../api/types";
import { SettingsPage } from "./SettingsPage";

vi.mock("../../state/ui", () => ({
  useUIStore: Object.assign(
    (selector: (state: object) => unknown) => selector({ setTheme: vi.fn(), setReduceMotion: vi.fn() }),
    { getState: () => ({ themePreference: "light", reduceMotion: false, setChatDraft: vi.fn(), setGraphSelectedId: vi.fn(), setGraphDomain: vi.fn() }) },
  ),
}));

const deepseek: ModelProfile = {
  profileId: "deepseek-default",
  name: "DeepSeek 在线服务",
  baseUrl: "https://api.deepseek.com",
  modelId: "deepseek-chat",
  modelIds: ["deepseek-chat"],
  keyConfigured: true,
  credentialMask: "••••••••",
  status: "available",
  lastTestedAt: null,
  lastLatencyMs: null,
  lastError: null,
};
const compatible: ModelProfile = {
  ...deepseek,
  profileId: "openai-compatible",
  name: "OpenAI 兼容服务",
  baseUrl: "",
  modelId: "",
  modelIds: [],
  keyConfigured: false,
  credentialMask: null,
  status: "incomplete",
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("SettingsPage online profiles", () => {
  it("keeps appearance settings without the product information section", async () => {
    vi.spyOn(api, "models").mockResolvedValue({
      activeProfileId: "deepseek-default", profiles: [{ ...deepseek }, { ...compatible }],
    });
    vi.spyOn(api, "appearance").mockResolvedValue({ themePreference: "light", reduceMotion: false });
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SettingsPage /></QueryClientProvider>);

    expect(await screen.findByRole("heading", { name: "外观" })).toBeVisible();
    expect(await screen.findByRole("button", { name: /浅色/ })).toBeVisible();
    expect(screen.queryByRole("img", { name: "FF - LLM Wiki知识库 Logo" })).not.toBeInTheDocument();
    expect(screen.queryByText("版本 0.1.0")).not.toBeInTheDocument();
  });

  it("discovers and saves the entire catalog without selecting a model in settings", async () => {
    vi.spyOn(api, "models").mockResolvedValue({
      activeProfileId: "deepseek-default", profiles: [{ ...deepseek }, { ...compatible }],
    });
    vi.spyOn(api, "appearance").mockResolvedValue({ themePreference: "light", reduceMotion: false });
    const discover = vi.spyOn(api, "discoverModels").mockResolvedValue({ models: ["custom-small", "custom-large"] });
    const save = vi.spyOn(api, "saveModel").mockImplementation(async (_id, payload) => ({
      ...compatible, ...payload, keyConfigured: true, status: "untested",
    }));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SettingsPage /></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: /OpenAI 兼容服务/ }));
    expect(screen.queryByText(/HTTP 连接会明文传输/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: /^服务地址/ }), { target: { value: "http://example.org:9999/v1" } });
    expect(screen.getByText(/HTTP 连接会明文传输 API 凭据和提问内容/)).toBeVisible();
    fireEvent.change(screen.getByLabelText(/^API 凭据/), { target: { value: "draft-secret" } });
    fireEvent.click(screen.getByRole("button", { name: "获取可用模型" }));
    await waitFor(() => expect(discover).toHaveBeenCalledWith("openai-compatible", {
      baseUrl: "http://example.org:9999/v1", apiKey: "draft-secret",
    }));
    fireEvent.change(await screen.findByRole("searchbox", { name: "搜索可用模型" }), { target: { value: "large" } });
    const catalog = screen.getByRole("list", { name: "可用模型列表" });
    expect(within(catalog).queryByText("custom-small")).not.toBeInTheDocument();
    expect(within(catalog).getByText("custom-large")).toBeVisible();
    expect(within(catalog).queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryByRole("textbox", { name: "模型标识" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("openai-compatible", expect.objectContaining({
      modelId: "custom-small", modelIds: ["custom-small", "custom-large"],
    })));
  });

  it("keeps manual model entry when discovery is unsupported", async () => {
    vi.spyOn(api, "models").mockResolvedValue({
      activeProfileId: "deepseek-default", profiles: [{ ...deepseek }, { ...compatible }],
    });
    vi.spyOn(api, "appearance").mockResolvedValue({ themePreference: "light", reduceMotion: false });
    vi.spyOn(api, "discoverModels").mockRejectedValue(new Error("该服务不支持在线获取模型，请手动添加模型"));
    render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><SettingsPage /></QueryClientProvider>);
    await screen.findByRole("button", { name: /DeepSeek 在线模型/ });
    fireEvent.click(screen.getByRole("button", { name: "获取可用模型" }));
    expect(await screen.findByText("该服务不支持在线获取模型，请手动添加模型")).toBeVisible();
    fireEvent.change(screen.getByRole("textbox", { name: "手动添加模型" }), { target: { value: "manual-id" } });
    fireEvent.click(screen.getByRole("button", { name: "添加模型" }));
    expect(within(screen.getByRole("list", { name: "可用模型列表" })).getAllByRole("listitem").map((item) => item.textContent)).toEqual(["deepseek-chat", "manual-id"]);
  });

  it("keeps fields separate and only activates a saved, tested profile", async () => {
    let settings: ModelSettings = {
      activeProfileId: "deepseek-default",
      profiles: [{ ...deepseek }, { ...compatible }],
    };
    vi.spyOn(api, "models").mockImplementation(async () => settings);
    vi.spyOn(api, "appearance").mockResolvedValue({ themePreference: "light", reduceMotion: false });
    const save = vi.spyOn(api, "saveModel").mockImplementation(async (id, payload) => {
      const updated: ModelProfile = {
        ...settings.profiles.find((profile) => profile.profileId === id)!,
        ...payload,
        keyConfigured: true,
        credentialMask: "••••••••",
        status: "untested",
      };
      settings = {
        ...settings,
        profiles: settings.profiles.map((profile) => profile.profileId === id ? updated : profile),
      };
      return updated;
    });
    const test = vi.spyOn(api, "testModel").mockImplementation(async (id) => {
      const profile = settings.profiles.find((item) => item.profileId === id)!;
      const result = { ...profile, status: "available" as const, available: true, message: "模型服务连接可用" };
      settings = { ...settings, profiles: settings.profiles.map((item) => item.profileId === id ? result : item) };
      return result;
    });
    const activate = vi.spyOn(api, "activateModel").mockImplementation(async (id) => {
      settings = { ...settings, activeProfileId: id };
      return settings;
    });

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SettingsPage />
      </QueryClientProvider>,
    );
    fireEvent.click(await screen.findByRole("button", { name: /OpenAI 兼容服务/ }));
    expect(screen.getByRole("textbox", { name: "配置名称" })).toHaveValue("OpenAI 兼容服务");
    expect(screen.queryByRole("textbox", { name: "模型标识" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "测试连接" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "设为当前模型" })).toBeDisabled();

    fireEvent.change(screen.getByRole("textbox", { name: /^服务地址/ }), { target: { value: "https://example.org/v1" } });
    fireEvent.change(screen.getByRole("textbox", { name: "手动添加模型" }), { target: { value: "custom-model" } });
    fireEvent.click(screen.getByRole("button", { name: "添加模型" }));
    fireEvent.change(screen.getByLabelText(/^API 凭据/), { target: { value: "a-secret-test-key" } });
    expect(screen.getByRole("button", { name: "测试连接" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "保存配置" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith("openai-compatible", expect.objectContaining({
      modelId: "custom-model", modelIds: ["custom-model"], apiKey: "a-secret-test-key",
    })));
    await waitFor(() => expect(screen.getByRole("button", { name: "测试连接" })).toBeEnabled());
    expect(screen.getByRole("button", { name: "设为当前模型" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));
    await waitFor(() => expect(test).toHaveBeenCalledWith("openai-compatible"));
    await waitFor(() => expect(screen.getByRole("button", { name: "设为当前模型" })).toBeEnabled());
    fireEvent.click(screen.getByRole("button", { name: "设为当前模型" }));
    await waitFor(() => expect(activate).toHaveBeenCalledWith("openai-compatible"));
    expect(within(screen.getByRole("button", { name: /OpenAI 兼容服务/ })).getByText("当前使用")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /DeepSeek 在线模型/ }));
    expect(screen.getByRole("textbox", { name: /^服务地址/ })).toHaveValue("https://api.deepseek.com");
    expect(within(screen.getByRole("list", { name: "可用模型列表" })).getByText("deepseek-chat")).toBeVisible();
    expect(screen.getByLabelText(/^API 凭据/)).toHaveValue("");
    fireEvent.click(screen.getByRole("button", { name: /OpenAI 兼容服务/ }));
    expect(within(screen.getByRole("list", { name: "可用模型列表" })).getByText("custom-model")).toBeVisible();
    expect(screen.getByLabelText(/^API 凭据/)).toHaveValue("");

    test.mockRejectedValueOnce(new Error("系统凭据库暂不可用"));
    fireEvent.click(screen.getByRole("button", { name: "测试连接" }));
    expect(await screen.findByText("系统凭据库暂不可用")).toBeInTheDocument();
  });

  it("shows local settings alongside online profiles without sending model requests", async () => {
    const models = vi.spyOn(api, "models").mockResolvedValue({
      activeProfileId: "deepseek-default",
      profiles: [{ ...deepseek }, { ...compatible }],
    });
    vi.spyOn(api, "appearance").mockResolvedValue({ themePreference: "light", reduceMotion: false });
    const save = vi.spyOn(api, "saveModel");
    const test = vi.spyOn(api, "testModel");
    const activate = vi.spyOn(api, "activateModel");

    render(
      <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
        <SettingsPage />
      </QueryClientProvider>,
    );

    await screen.findByRole("button", { name: /DeepSeek 在线模型/ });
    const providers = screen.getByLabelText("模型服务");
    expect(within(providers).getAllByRole("button").map((button) => button.textContent)).toEqual([
      expect.stringContaining("DeepSeek 在线模型"),
      expect.stringContaining("OpenAI 兼容服务"),
      expect.stringContaining("本地模型"),
    ]);
    fireEvent.click(within(providers).getByRole("button", { name: /本地模型/ }));
    const local = screen.getByRole("region", { name: "本地模型" });
    expect(within(local).getByText("当前版本暂未接入本地模型")).toBeVisible();
    fireEvent.change(within(local).getByRole("textbox", { name: "连接名称" }), { target: { value: "我的本地服务" } });
    fireEvent.change(within(local).getByRole("textbox", { name: "本地服务地址" }), { target: { value: "http://127.0.0.1:11434" } });
    fireEvent.change(within(local).getByRole("textbox", { name: "本地模型标识" }), { target: { value: "my-model" } });
    expect(within(local).getByRole("textbox", { name: "本地模型标识" })).toHaveValue("my-model");
    expect(within(local).queryByRole("button", { name: /保存|测试连接|设为当前/ })).not.toBeInTheDocument();
    fireEvent.click(within(providers).getByRole("button", { name: /OpenAI 兼容服务/ }));
    expect(screen.queryByRole("region", { name: "本地模型" })).not.toBeInTheDocument();
    fireEvent.click(within(providers).getByRole("button", { name: /本地模型/ }));
    expect(within(screen.getByRole("region", { name: "本地模型" })).getByRole("textbox", { name: "本地模型标识" })).toHaveValue("my-model");
    expect(models).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
    expect(test).not.toHaveBeenCalled();
    expect(activate).not.toHaveBeenCalled();
  });
});

describe("SettingsPage project recovery", () => {
  function setup() {
    vi.spyOn(api, "models").mockResolvedValue({ activeProfileId: "deepseek-default", profiles: [deepseek, compatible] });
    vi.spyOn(api, "appearance").mockResolvedValue({ themePreference: "light", reduceMotion: false });
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={client}><SettingsPage /></QueryClientProvider>);
    return client;
  }

  it("inspects before confirmation, supports cancel, and replaces only after explicit confirmation", async () => {
    const summary = { projectName: "个人知识库", exportedAt: "2026-10-02T00:00:00Z", sourceCount: 2, sourceVersionCount: 3, knowledgeCount: 5, snapshotCount: 2, conversationCount: 1 };
    const inspect = vi.spyOn(api, "inspectBackup").mockResolvedValue(summary);
    const restore = vi.spyOn(api, "restoreProject").mockResolvedValue(summary);
    const client = setup();
    const bootstrap = { project: { sourceCount: 99 } };
    client.setQueryData(["bootstrap"], bootstrap);
    client.setQueryData(["conversation", "previous"], { messages: [] });
    const file = new File(["package"], "personal.zip", { type: "application/zip" });
    fireEvent.change(screen.getByLabelText("选择项目备份"), { target: { files: [file] } });
    const dialog = await screen.findByRole("dialog", { name: "恢复项目备份" });
    expect(inspect).toHaveBeenCalledWith(file);
    expect(dialog).toHaveTextContent("个人知识库");
    expect(dialog).toHaveTextContent("模型配置和凭据不受影响");
    expect(restore).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "返回" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(restore).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("选择项目备份"), { target: { files: [file] } });
    const confirmation = await screen.findByRole("dialog", { name: "恢复项目备份" });
    fireEvent.click(within(confirmation).getByRole("button", { name: "确认替换并恢复" }));
    await waitFor(() => expect(restore).toHaveBeenCalledWith(file));
    expect(await screen.findByText("项目已恢复")).toBeVisible();
    expect(client.getQueryData(["bootstrap"])).toEqual(bootstrap);
    expect(client.getQueryState(["bootstrap"])?.isInvalidated).toBe(true);
    expect(client.getQueryData(["conversation", "previous"])).toBeUndefined();
  });

  it("rejects a damaged package without showing replacement controls", async () => {
    vi.spyOn(api, "inspectBackup").mockRejectedValue(new Error("项目包原件校验失败"));
    const restore = vi.spyOn(api, "restoreProject");
    setup();
    fireEvent.change(screen.getByLabelText("选择项目备份"), { target: { files: [new File(["bad"], "broken.zip")] } });
    expect(await screen.findByText("项目包原件校验失败")).toBeVisible();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(restore).not.toHaveBeenCalled();
  });
});
