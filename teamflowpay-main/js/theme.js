"use strict";

const ThemeManager = {
  THEMES: {
    LIGHT: "light",
    DARK: "dark",
  },

  STORAGE_KEY: "theme",

  getTheme() {
    return localStorage.getItem(this.STORAGE_KEY) || this.THEMES.LIGHT;
  },

  setTheme(theme) {
    localStorage.setItem(this.STORAGE_KEY, theme);

    if (theme === this.THEMES.DARK) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  },

  toggleTheme() {
    const currentTheme = this.getTheme();
    const newTheme =
      currentTheme === this.THEMES.LIGHT ? this.THEMES.DARK : this.THEMES.LIGHT;
    this.setTheme(newTheme);
    this.updateThemeIcon();
  },

  updateThemeIcon() {
    const theme = this.getTheme();
    const themeIcon = document.getElementById("themeIcon");

    if (themeIcon) {
      themeIcon.innerHTML =
        theme === this.THEMES.LIGHT
          ? '<i class="fas fa-moon"></i>'
          : '<i class="fas fa-sun"></i>';
    }
  },

  initialize() {
    const theme = this.getTheme();
    this.setTheme(theme);
    this.updateThemeIcon();
  },
};

function getTheme() {
  return ThemeManager.getTheme();
}

function setTheme(theme) {
  ThemeManager.setTheme(theme);
}

function toggleTheme() {
  ThemeManager.toggleTheme();
}

function updateThemeIcon() {
  ThemeManager.updateThemeIcon();
}

function initializeTheme() {
  ThemeManager.initialize();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () =>
    ThemeManager.initialize()
  );
} else {
  ThemeManager.initialize();
}
