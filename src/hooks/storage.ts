// 通用 localStorage 工具，支持类型安全和命名空间

export function getStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return defaultValue;
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

export function setStorage<T>(key: string, value: T) {
  localStorage.setItem(key, JSON.stringify(value));
}
