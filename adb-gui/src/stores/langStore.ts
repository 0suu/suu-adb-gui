import { create } from "zustand";

export type Lang = "ja" | "en";

type LangStore = {
  lang: Lang;
  toggleLang: () => void;
};

const saved = localStorage.getItem("adb-gui-lang") as Lang | null;

export const useLangStore = create<LangStore>((set, get) => ({
  lang: saved === "en" ? "en" : "ja",
  toggleLang: () => {
    const next: Lang = get().lang === "ja" ? "en" : "ja";
    localStorage.setItem("adb-gui-lang", next);
    set({ lang: next });
  },
}));
