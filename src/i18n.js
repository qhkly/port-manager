// i18n.js — locale registry + window.t() helper.
// 移植自 webcode-ai-studio，精简为 zh-CN / en-US 两种语言。
// locale 表存放在 src/locales/*.js，在本文件之前加载并自注册到
// window.__i18nLocales（见 index.html 的脚本顺序）。
// 切换语言：window.i18n.setLang('en-US')；组件读取当前语言用 window.__lang。

// 同样用 IIFE 包裹，避免顶层 const 与其它 <script> 文件重名（见 theme.js 注释）。
(function () {
  const LOCALES = window.__i18nLocales || {};

  const STORAGE_KEY = "lang";
  const FALLBACK_LOCALE = "en-US";
  const AVAILABLE_LOCALES = ["zh-CN", "en-US"].filter((code) => LOCALES[code]);

  const LOCALE_META = {
    "zh-CN": { nativeName: "中文", regionName: "中国大陆" },
    "en-US": { nativeName: "English", regionName: "United States" },
  };

  const LANGUAGE_PREFIXES = [
    ["zh", "zh-CN"],
    ["en", "en-US"],
  ];

  function normalizeLocale(input) {
    if (!input) return null;
    const raw = String(input).trim();
    const exact = AVAILABLE_LOCALES.find((code) => code.toLowerCase() === raw.toLowerCase());
    if (exact) return exact;
    const lower = raw.toLowerCase();
    for (const [prefix, code] of LANGUAGE_PREFIXES) {
      if ((lower === prefix || lower.startsWith(`${prefix}-`)) && AVAILABLE_LOCALES.includes(code)) {
        return code;
      }
    }
    return null;
  }

  function readStoredLocale() {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  function getDefaultLocale() {
    return (
      normalizeLocale(readStoredLocale())
      || normalizeLocale(navigator.language)
      || (AVAILABLE_LOCALES.includes("zh-CN") ? "zh-CN" : AVAILABLE_LOCALES[0] || FALLBACK_LOCALE)
    );
  }

  function formatTemplate(template, params) {
    if (!params) return template;
    // 复数标记：{s} → n===1 时为 ''，否则 's'（仅英文复数用）。
    return template
      .replace(/\{s\}/g, params.n === 1 ? "" : "s")
      .replace(/\{(\w+)\}/g, (match, key) => (params[key] !== undefined ? String(params[key]) : match));
  }

  const i18n = {
    currentLang: getDefaultLocale(),

    get locale() {
      return LOCALES[this.currentLang] || LOCALES[FALLBACK_LOCALE];
    },

    getAvailableLocales() {
      return AVAILABLE_LOCALES.slice();
    },

    getLocaleMeta(lang = this.currentLang) {
      const key = normalizeLocale(lang) || this.currentLang;
      return {
        code: key,
        label: LOCALES[key]?.label || key,
        ...(LOCALE_META[key] || {}),
      };
    },

    getMessage(key, lang = this.currentLang, params) {
      const code = normalizeLocale(lang) || this.currentLang;
      const template =
        LOCALES[code]?.messages?.[key]
        ?? LOCALES[FALLBACK_LOCALE]?.messages?.[key]
        ?? key;
      return formatTemplate(template, params);
    },

    t(key, params) {
      return this.getMessage(key, this.currentLang, params);
    },

    setLang(lang) {
      const next = normalizeLocale(lang) || FALLBACK_LOCALE;
      window.__lang = next;
      if (next === this.currentLang) return next;
      this.currentLang = next;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 忽略存储失败，当前窗口语言仍生效。
      }
      this.updatePageLang();
      window.dispatchEvent(new CustomEvent("i18n:changed", { detail: { lang: next } }));
      return next;
    },

    // 记录用户显式选择。setLang 在值相同时会跳过写入，那样下次启动时
    // 显式选择就与环境检测无法区分，所以显式切换走 rememberLang。
    rememberLang(lang) {
      const next = normalizeLocale(lang) || FALLBACK_LOCALE;
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // 忽略存储失败。
      }
      return this.setLang(next);
    },

    cycleLang() {
      const index = AVAILABLE_LOCALES.indexOf(this.currentLang);
      return this.setLang(AVAILABLE_LOCALES[(index + 1) % AVAILABLE_LOCALES.length]);
    },

    // 翻译静态 HTML 节点（data-i18n 属性）。React 视图直接调用 t()，
    // 本方法只对 React 根之外的标记有意义。
    translateTree(root = document.body) {
      if (!root) return;
      const scope = root === document ? document.body : root;
      if (!scope || scope.nodeType !== Node.ELEMENT_NODE) return;

      const matchAll = (selector) => {
        const found = [];
        if (scope.matches?.(selector)) found.push(scope);
        found.push(...scope.querySelectorAll(selector));
        return found;
      };

      const attrs = [
        ["data-i18n", (el, value) => { el.textContent = value; }],
        ["data-i18n-title", (el, value) => { el.title = value; }],
        ["data-i18n-placeholder", (el, value) => { el.placeholder = value; }],
        ["data-i18n-aria-label", (el, value) => el.setAttribute("aria-label", value)],
      ];

      for (const [attr, apply] of attrs) {
        matchAll(`[${attr}]`).forEach((el) => apply(el, this.t(el.getAttribute(attr))));
      }
    },

    updatePageLang() {
      document.documentElement.setAttribute("lang", this.currentLang);
      document.title = this.t("app_title");
      this.translateTree(document);
    },

    init() {
      window.__lang = this.currentLang;
      this.updatePageLang();
    },
  };

  window.i18n = i18n;
  window.__lang = i18n.currentLang;

  // React 视图里使用的便捷别名。
  window.setLang = (lang) => i18n.setLang(lang);
  window.t = (key, params) => i18n.t(key, params);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => i18n.init(), { once: true });
  } else {
    i18n.init();
  }
})();
