// Todo-трекер: state-based render (todos[] + filter) → render().
// XSS-safe: текст задачи вставляется только через textContent.

import { loadTodos, saveTodos } from './storage.js';

/** @type {{id:string, text:string, completed:boolean, createdAt:number}[]} */
let todos = [];
let currentFilter = 'all'; // all | active | completed
let editingId = null;       // id задачи, которую редактируем (null — не в режиме правки)

// --- DOM-ссылки ---
const form = document.getElementById('add-form');
const input = document.getElementById('todo-input');
const listEl = document.getElementById('todo-list');
const remainingEl = document.getElementById('remaining-count');
const clearBtn = document.getElementById('clear-completed');
const filterButtons = Array.from(document.querySelectorAll('[data-filter]'));

// --- Хранилище ---
function load() {
  todos = loadTodos();
}

function persistAndRender() {
  saveTodos(todos);
  render();
}

// --- Муты (каждый: save → render) ---

function addTodo(text) {
  const trimmed = text.trim();
  if (!trimmed) return; // пустой / только пробелы → игнор
  todos.push({
    id: crypto.randomUUID(),
    text: trimmed,
    completed: false,
    createdAt: Date.now(),
  });
  persistAndRender();
}

function toggleTodo(id) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = !todo.completed;
    persistAndRender();
  }
}

function deleteTodo(id) {
  todos = todos.filter((t) => t.id !== id);
  persistAndRender();
}

function commitEdit(id, rawValue) {
  const trimmed = rawValue.trim();
  const todo = todos.find((t) => t.id === id);
  if (todo && trimmed.length > 0 && trimmed !== todo.text) {
    todo.text = trimmed;
  }
  editingId = null;
  persistAndRender();
}

function cancelEdit() {
  editingId = null;
  render();
}

function setFilter(filter) {
  currentFilter = filter;
  render();
}

function clearCompleted() {
  todos = todos.filter((t) => !t.completed);
  persistAndRender();
}

// --- Фильтрация данных ---
function getFilteredTodos() {
  switch (currentFilter) {
    case 'active':
      return todos.filter((t) => !t.completed);
    case 'completed':
      return todos.filter((t) => t.completed);
    default:
      return todos;
  }
}

function getActiveCount() {
  return todos.filter((t) => !t.completed).length;
}

// --- Рендер (state-based) ---
function render() {
  // Счётчик активных задач.
  const active = getActiveCount();
  remainingEl.textContent = `${active} ${pluralize(active)} left`;

  // Подсветка активной кнопки фильтра.
  filterButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.filter === currentFilter);
  });

  // Очистка списка и рендер по новому состоянию.
  listEl.innerHTML = '';

  const visible = getFilteredTodos();

  if (visible.length === 0) {
    listEl.appendChild(createEmptyState());
    return;
  }

  for (const todo of visible) {
    listEl.appendChild(renderTodo(todo));
  }
}

function pluralize(n) {
  // Простая форма для "task/tasks".
  return n === 1 ? 'task' : 'tasks';
}

function createEmptyState() {
  const p = document.createElement('p');
  p.className = 'empty-state';
  p.textContent = currentFilter === 'all' ? 'Задач пока нет. Добавьте первую!' : 'Нет задач в этой категории.';
  return p;
}

/**
 * Собрать <li> задачи. Текст — только через textContent (XSS-safe).
 */
function renderTodo(todo) {
  const li = document.createElement('li');
  li.className = 'todo-item' + (todo.completed ? ' completed' : '');
  li.dataset.id = todo.id;

  // Checkbox (toggle).
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = todo.completed;
  checkbox.setAttribute('aria-label', `Отметить "${todo.text}"`);
  checkbox.addEventListener('change', () => toggleTodo(todo.id));

  // Текст или поле редактирования.
  if (editingId === todo.id) {
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = todo.text;
    const commit = () => commitEdit(todo.id, editInput.value);
    editInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commit();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancelEdit();
      }
    });
    // blur → отмена правки.
    editInput.addEventListener('blur', () => {
      if (editingId === todo.id) cancelEdit();
    });
    li.appendChild(checkbox);
    li.appendChild(editInput);
    // focus+select после вставки в DOM.
    requestAnimationFrame(() => {
      editInput.focus();
      editInput.select();
    });
  } else {
    const text = document.createElement('span');
    text.className = 'todo-text';
    text.textContent = todo.text; // XSS-safe: как текст, не как разметка.
    text.addEventListener('dblclick', () => {
      editingId = todo.id;
      render();
    });
    li.appendChild(checkbox);
    li.appendChild(text);

    // Кнопка удаления (статический контент, без пользовательских данных).
    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'delete-btn';
    delBtn.textContent = '✕';
    delBtn.setAttribute('aria-label', `Удалить "${todo.text}"`);
    delBtn.addEventListener('click', () => deleteTodo(todo.id));
    li.appendChild(delBtn);
  }

  return li;
}

// --- События UI ---
form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTodo(input.value);
  input.value = '';
  input.focus();
});

// Делегирование событий для кнопок фильтра.
filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

clearBtn.addEventListener('click', clearCompleted);

// --- Инициализация ---
load();
render();
