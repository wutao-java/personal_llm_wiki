import { create } from "zustand";
import type { ResolvedTheme, ThemePreference } from "../api/types";

interface UIState {
  sidebarCollapsed: boolean;
  themePreference: ThemePreference;
  resolvedTheme: ResolvedTheme;
  reduceMotion: boolean;
  chatDraft: string;
  graphSelectedId: string | null;
  graphDomain: string | null;
  toggleSidebar: () => void;
  setTheme: (themePreference: ThemePreference) => void;
  setReduceMotion: (value: boolean) => void;
  setChatDraft: (value: string) => void;
  setGraphSelectedId: (value: string | null) => void;
  setGraphDomain: (value: string | null) => void;
}

function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== "system") return preference;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const savedPreference = (localStorage.getItem("ff-theme-preference") as ThemePreference | null) ?? "light";

export const useUIStore = create<UIState>((set, get) => ({
  sidebarCollapsed: localStorage.getItem("ff-sidebar-collapsed") === "true",
  themePreference: savedPreference,
  resolvedTheme: resolveTheme(savedPreference),
  reduceMotion: localStorage.getItem("ff-reduce-motion") === "true",
  chatDraft: "",
  graphSelectedId: null,
  graphDomain: null,
  toggleSidebar: () =>
    set((state) => {
      const value = !state.sidebarCollapsed;
      localStorage.setItem("ff-sidebar-collapsed", String(value));
      return { sidebarCollapsed: value };
    }),
  setTheme: (themePreference) => {
    const resolvedTheme = resolveTheme(themePreference);
    localStorage.setItem("ff-theme-preference", themePreference);
    document.documentElement.dataset.theme = resolvedTheme;
    document.documentElement.style.colorScheme = resolvedTheme;
    set({ themePreference, resolvedTheme });
  },
  setReduceMotion: (reduceMotion) => {
    localStorage.setItem("ff-reduce-motion", String(reduceMotion));
    document.documentElement.dataset.reduceMotion = String(reduceMotion);
    set({ reduceMotion });
  },
  setChatDraft: (chatDraft) => set({ chatDraft }),
  setGraphSelectedId: (graphSelectedId) => set({ graphSelectedId }),
  setGraphDomain: (graphDomain) => set({ graphDomain }),
}));

const media = window.matchMedia("(prefers-color-scheme: dark)");
media.addEventListener("change", () => {
  const state = useUIStore.getState();
  if (state.themePreference === "system") state.setTheme("system");
});

document.documentElement.dataset.reduceMotion = String(useUIStore.getState().reduceMotion);
