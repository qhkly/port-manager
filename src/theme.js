// theme.js — 明暗模式管理器（light / dark / auto）。
// auto 模式下读取系统 prefers-color-scheme 并随其变化自动切换。
// 实际生效值统一通过 document.documentElement 的 data-theme 属性应用，
// 同时设置 color-scheme 让原生滚动条/表单控件跟随。
// 切换：window.theme.setTheme('dark')；读取当前选择：window.theme.mode。

const STORAGE_KEY = "theme";
const VALID_MODES = ["light", "dark", "auto"];
const DARK_MEDIA = "(prefers-color-scheme: dark)";

function readStoredMode() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function systemPrefersDark() {
  return typeof window.matchMedia === "function"
    && window.matchMedia(DARK_MEDIA).matches;
}

const theme = {
  // 用户选择（light / dark / auto），默认 auto。
  mode: VALID_MODES.indexOf(readStoredMode()) >= 0 ? readStoredMode() : "auto",
  // 实际生效值（light / dark），由 mode 解析得到。
  resolved: "light",
  _mqListener: null,

  resolve() {
    return this.mode === "auto" ? (systemPrefersDark() ? "dark" : "light") : this.mode;
  },

  applyTheme() {
    this.resolved = this.resolve();
    const el = document.documentElement;
    el.setAttribute("data-theme", this.resolved);
    el.style.colorScheme = this.resolved;
    window.dispatchEvent(new CustomEvent("theme:changed", {
      detail: { mode: this.mode, resolved: this.resolved },
    }));
  },

  setMode(mode) {
    const next = VALID_MODES.indexOf(mode) >= 0 ? mode : "auto";
    this.mode = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 忽略存储失败，当前窗口主题仍生效。
    }
    this.applyTheme();
    return next;
  },

  // 别名，保持与 i18n.setLang 风格一致。
  setTheme(mode) {
    return this.setMode(mode);
  },

  init() {
    this.applyTheme();
    // auto 模式下监听系统主题变化；非 auto 时也保留监听，切换回 auto 立即生效。
    if (typeof window.matchMedia === "function") {
      const mq = window.matchMedia(DARK_MEDIA);
      this._mqListener = () => {
        if (this.mode === "auto") this.applyTheme();
      };
      if (mq.addEventListener) {
        mq.addEventListener("change", this._mqListener);
      } else if (mq.addListener) {
        // 旧版 Safari 兼容。
        mq.addListener(this._mqListener);
      }
    }
  },
};

window.theme = theme;

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => theme.init(), { once: true });
} else {
  theme.init();
}
