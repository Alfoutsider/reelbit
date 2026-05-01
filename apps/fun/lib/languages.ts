export const LANGS = [
  { code: "en",    label: "English",    flag: "🇺🇸" },
  { code: "es",    label: "Español",    flag: "🇪🇸" },
  { code: "pt",    label: "Português",  flag: "🇧🇷" },
  { code: "zh-CN", label: "中文",        flag: "🇨🇳" },
  { code: "ja",    label: "日本語",      flag: "🇯🇵" },
  { code: "ko",    label: "한국어",      flag: "🇰🇷" },
  { code: "ru",    label: "Русский",    flag: "🇷🇺" },
  { code: "ar",    label: "العربية",    flag: "🇸🇦" },
  { code: "fr",    label: "Français",   flag: "🇫🇷" },
  { code: "de",    label: "Deutsch",    flag: "🇩🇪" },
  { code: "tr",    label: "Türkçe",     flag: "🇹🇷" },
  { code: "vi",    label: "Tiếng Việt", flag: "🇻🇳" },
] as const;

export type LangCode = (typeof LANGS)[number]["code"];

// Browser locale prefix → Google Translate code
export const BROWSER_TO_GT: Record<string, string> = {
  es: "es",
  pt: "pt",
  zh: "zh-CN",
  ja: "ja",
  ko: "ko",
  ru: "ru",
  ar: "ar",
  fr: "fr",
  de: "de",
  tr: "tr",
  vi: "vi",
};

export function triggerGoogleTranslate(code: string) {
  const tryChange = (attempts = 0) => {
    const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (combo) {
      combo.value = code;
      combo.dispatchEvent(new Event("change"));
    } else if (attempts < 15) {
      setTimeout(() => tryChange(attempts + 1), 300);
    }
  };
  tryChange();
}

export function resetTranslation() {
  document.cookie = "googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = `googtrans=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.${window.location.hostname}`;
  window.location.reload();
}
