// Хранилище задач в localStorage.
// Все функции обёрнуты в try/catch, чтобы приложение не падало при ошибках квоты/парсинга.

export const KEY = 'todo-tracker.todos';

/**
 * Загрузить массив задач из localStorage.
 * При ошибке / пустоте / отсутствии ключа / неверном формате → [].
 * @returns {Array<{id:string, text:string, completed:boolean, createdAt:number}>}
 */
export function loadTodos() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    // Отфильтруем некорректные записи, но сохраним валидные.
    return parsed.filter(
      (t) => t && typeof t.id === 'string' && typeof t.text === 'string'
    );
  } catch (err) {
    console.warn('loadTodos failed:', err);
    return [];
  }
}

/**
 * Сохранить массив задач в localStorage.
 * @param {Array<{id:string, text:string, completed:boolean, createdAt:number}>} todos
 */
export function saveTodos(todos) {
  try {
    localStorage.setItem(KEY, JSON.stringify(todos));
  } catch (err) {
    // Не роняем UI при превышении квоты хранилища.
    console.warn('saveTodos failed:', err);
  }
}
