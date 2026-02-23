import {
  AlertTriangle,
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  Eye,
  Laptop,
  Monitor,
  MoonStar,
  Router,
  Server,
  Share2,
  Sun,
  Zap,
  createIcons,
} from "lucide";

type ThemePreference = "light" | "system" | "dark";

const storageKey = "nexus-theme";
const validPreferences = new Set<ThemePreference>(["light", "system", "dark"]);
const media = window.matchMedia("(prefers-color-scheme: dark)");
let currentPreference: ThemePreference = "system";
const iconSet = {
  AlertTriangle,
  BarChart3,
  BellRing,
  BookOpen,
  Bot,
  Eye,
  Laptop,
  Monitor,
  MoonStar,
  Router,
  Server,
  Share2,
  Sun,
  Zap,
};

const isThemePreference = (
  value: string | null | undefined,
): value is ThemePreference => {
  return value !== null && value !== undefined && validPreferences.has(value as ThemePreference);
};

const getResolvedTheme = (preference: ThemePreference) => {
  return preference === "system" ? (media.matches ? "dark" : "light") : preference;
};

const syncToggleButtons = (preference: ThemePreference) => {
  document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
    const isActive = button.dataset.themeOption === preference;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-pressed", String(isActive));
  });
};

const applyPreference = (preference: ThemePreference, persist = true) => {
  currentPreference = validPreferences.has(preference) ? preference : "system";
  const resolved = getResolvedTheme(currentPreference);

  document.documentElement.dataset.themePreference = currentPreference;
  document.documentElement.dataset.theme = resolved;
  syncToggleButtons(currentPreference);

  if (persist) {
    try {
      localStorage.setItem(storageKey, currentPreference);
    } catch {}
  }
};

const init = () => {
  let storedPreference: ThemePreference = "system";
  try {
    const stored = localStorage.getItem(storageKey);
    if (isThemePreference(stored)) {
      storedPreference = stored;
    }
  } catch {}

  applyPreference(storedPreference, false);

  document.querySelectorAll<HTMLButtonElement>("[data-theme-option]").forEach((button) => {
    if (button.dataset.themeBound === "true") return;
    button.dataset.themeBound = "true";
    button.addEventListener("click", () => {
      const option = button.dataset.themeOption;
      applyPreference(isThemePreference(option) ? option : "system");
    });
  });

  createIcons({ icons: iconSet });
};

const syncSystemTheme = () => {
  if (currentPreference === "system") {
    applyPreference("system", false);
  }
};

media.addEventListener("change", syncSystemTheme);

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
