import { useSyncExternalStore } from 'react'

// Светлая тема доступна для тестирования и требует значительной доработки.
// Её оформление не служит основой дизайна и разработки инструментов и общего UI;
// текущий ориентир — тёмная тема (см. shared/README.md).
export type Theme = 'dark' | 'light'

// Ключ также используется в index.html для применения темы до первой отрисовки.
export const THEME_STORAGE_KEY = 'cauldron.theme'
const THEME_CHANGED_EVENT = 'cauldron:theme-changed'

export function getTheme(): Theme {
  return document.documentElement.dataset.theme === 'light' ? 'light' : 'dark'
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Переключение работает и при недоступном хранилище браузера.
  }
  window.dispatchEvent(new Event(THEME_CHANGED_EVENT))
}

function subscribe(onChange: () => void) {
  function storageChanged(event: StorageEvent) {
    if (event.key !== null && event.key !== THEME_STORAGE_KEY) return
    document.documentElement.dataset.theme = event.newValue === 'light' ? 'light' : 'dark'
    onChange()
  }

  window.addEventListener(THEME_CHANGED_EVENT, onChange)
  window.addEventListener('storage', storageChanged)
  return () => {
    window.removeEventListener(THEME_CHANGED_EVENT, onChange)
    window.removeEventListener('storage', storageChanged)
  }
}

export function useTheme() {
  return useSyncExternalStore(subscribe, getTheme, () => 'dark' as const)
}
