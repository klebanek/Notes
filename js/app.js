/**
 * Brain Dump App - Main Application Logic
 * Minimalistyczna aplikacja do szybkiego zapisywania myśli
 */

(function() {
    'use strict';

    // ==========================================
    // Storage Manager
    // ==========================================
    const Storage = {
        KEY: 'brain_dump_notes',

        getAll() {
            try {
                const data = localStorage.getItem(this.KEY);
                return data ? JSON.parse(data) : [];
            } catch (e) {
                console.error('Error reading from localStorage:', e);
                return [];
            }
        },

        save(notes) {
            try {
                localStorage.setItem(this.KEY, JSON.stringify(notes));
                return true;
            } catch (e) {
                console.error('Error saving to localStorage:', e);
                return false;
            }
        },

        add(note) {
            const notes = this.getAll();
            notes.unshift(note); // Dodaj na początek
            return this.save(notes);
        },

        update(id, newContent) {
            const notes = this.getAll();
            const index = notes.findIndex(n => n.id === id);
            if (index !== -1) {
                notes[index].content = newContent;
                notes[index].updatedAt = Date.now();
                // Re-kategoryzuj po edycji
                const categorization = Categorizer.categorize(newContent);
                notes[index].category = categorization.category;
                notes[index].categoryIcon = categorization.icon;
                return this.save(notes);
            }
            return false;
        },

        delete(id) {
            const notes = this.getAll();
            const filtered = notes.filter(n => n.id !== id);
            return this.save(filtered);
        },

        getCategories() {
            const notes = this.getAll();
            const categories = new Set();
            notes.forEach(n => categories.add(n.category));
            return Array.from(categories);
        }
    };

    // ==========================================
    // UI Controller
    // ==========================================
    const UI = {
        elements: {},

        init() {
            // Cache DOM elements
            this.elements = {
                tabBtns: document.querySelectorAll('.tab-btn'),
                views: document.querySelectorAll('.view'),
                thoughtInput: document.getElementById('thought-input'),
                saveBtn: document.getElementById('save-btn'),
                saveFeedback: document.getElementById('save-feedback'),
                notesList: document.getElementById('notes-list'),
                emptyState: document.getElementById('empty-state'),
                categoryFilter: document.getElementById('category-filter'),
                editModal: document.getElementById('edit-modal'),
                editTextarea: document.getElementById('edit-textarea'),
                modalClose: document.getElementById('modal-close'),
                saveEditBtn: document.getElementById('save-edit-btn'),
                deleteBtn: document.getElementById('delete-btn')
            };

            this.currentEditId = null;
        },

        switchTab(tabName) {
            this.elements.tabBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.tab === tabName);
            });

            this.elements.views.forEach(view => {
                view.classList.toggle('active', view.id === `${tabName}-view`);
            });

            if (tabName === 'notes') {
                this.renderNotes();
            } else {
                this.elements.thoughtInput.focus();
            }
        },

        showFeedback(message, duration = 2000) {
            this.elements.saveFeedback.textContent = message;
            this.elements.saveFeedback.classList.add('show');

            setTimeout(() => {
                this.elements.saveFeedback.classList.remove('show');
            }, duration);
        },

        clearInput() {
            this.elements.thoughtInput.value = '';
            this.elements.thoughtInput.focus();
        },

        renderNotes(filter = 'all') {
            const notes = Storage.getAll();
            const filteredNotes = filter === 'all'
                ? notes
                : notes.filter(n => n.category === filter);

            // Update category filter
            this.updateCategoryFilter();

            // Show empty state or notes
            if (filteredNotes.length === 0) {
                this.elements.notesList.innerHTML = '';
                this.elements.emptyState.classList.add('show');
            } else {
                this.elements.emptyState.classList.remove('show');
                this.elements.notesList.innerHTML = filteredNotes.map(note =>
                    this.createNoteCard(note)
                ).join('');
            }
        },

        createNoteCard(note) {
            const date = new Date(note.createdAt);
            const formattedDate = this.formatDate(date);
            const truncatedContent = this.truncateText(note.content, 200);

            return `
                <article class="note-card" data-id="${note.id}">
                    <div class="note-content">${this.escapeHtml(truncatedContent)}</div>
                    <div class="note-meta">
                        <span class="note-category">
                            ${note.categoryIcon} ${note.category}
                        </span>
                        <span class="note-date">${formattedDate}</span>
                    </div>
                </article>
            `;
        },

        updateCategoryFilter() {
            const categories = Storage.getCategories();
            const currentValue = this.elements.categoryFilter.value;

            this.elements.categoryFilter.innerHTML = `
                <option value="all">Wszystkie kategorie</option>
                ${categories.map(cat => {
                    const catData = Categorizer.categories[cat];
                    const icon = catData ? catData.icon : '📝';
                    return `<option value="${cat}">${icon} ${cat}</option>`;
                }).join('')}
            `;

            // Restore selection if still valid
            if (categories.includes(currentValue) || currentValue === 'all') {
                this.elements.categoryFilter.value = currentValue;
            }
        },

        openEditModal(noteId) {
            const notes = Storage.getAll();
            const note = notes.find(n => n.id === noteId);

            if (note) {
                this.currentEditId = noteId;
                this.elements.editTextarea.value = note.content;
                this.elements.editModal.classList.add('show');
                this.elements.editTextarea.focus();
            }
        },

        closeEditModal() {
            this.elements.editModal.classList.remove('show');
            this.currentEditId = null;
        },

        formatDate(date) {
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return 'przed chwilą';
            if (minutes < 60) return `${minutes} min temu`;
            if (hours < 24) return `${hours} godz. temu`;
            if (days < 7) return `${days} dni temu`;

            return date.toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'short',
                year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
            });
        },

        truncateText(text, maxLength) {
            if (text.length <= maxLength) return text;
            return text.slice(0, maxLength).trim() + '...';
        },

        escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    };

    // ==========================================
    // App Controller
    // ==========================================
    const App = {
        init() {
            UI.init();
            this.bindEvents();
            this.loadInitialState();
        },

        bindEvents() {
            // Tab navigation
            UI.elements.tabBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    UI.switchTab(btn.dataset.tab);
                });
            });

            // Save thought
            UI.elements.saveBtn.addEventListener('click', () => this.saveThought());

            // Keyboard shortcuts
            document.addEventListener('keydown', (e) => this.handleKeyboard(e));

            // Notes list click (delegation)
            UI.elements.notesList.addEventListener('click', (e) => {
                const card = e.target.closest('.note-card');
                if (card) {
                    UI.openEditModal(card.dataset.id);
                }
            });

            // Category filter
            UI.elements.categoryFilter.addEventListener('change', (e) => {
                UI.renderNotes(e.target.value);
            });

            // Modal events
            UI.elements.modalClose.addEventListener('click', () => UI.closeEditModal());
            UI.elements.editModal.addEventListener('click', (e) => {
                if (e.target === UI.elements.editModal) {
                    UI.closeEditModal();
                }
            });

            // Save edit
            UI.elements.saveEditBtn.addEventListener('click', () => this.saveEdit());

            // Delete note
            UI.elements.deleteBtn.addEventListener('click', () => this.deleteNote());

            // Auto-resize textarea (optional enhancement)
            UI.elements.thoughtInput.addEventListener('input', function() {
                this.style.height = 'auto';
                this.style.height = Math.max(this.scrollHeight, 200) + 'px';
            });
        },

        handleKeyboard(e) {
            // Ctrl/Cmd + Enter - Save thought
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();

                // Check if we're in edit modal
                if (UI.elements.editModal.classList.contains('show')) {
                    this.saveEdit();
                } else if (document.activeElement === UI.elements.thoughtInput) {
                    this.saveThought();
                }
            }

            // Escape - Clear input or close modal
            if (e.key === 'Escape') {
                if (UI.elements.editModal.classList.contains('show')) {
                    UI.closeEditModal();
                } else if (document.activeElement === UI.elements.thoughtInput) {
                    UI.clearInput();
                }
            }
        },

        saveThought() {
            const content = UI.elements.thoughtInput.value.trim();

            if (!content) {
                UI.showFeedback('Wpisz coś najpierw');
                return;
            }

            // Kategoryzuj notatkę
            const categorization = Categorizer.categorize(content);

            // Utwórz obiekt notatki
            const note = {
                id: this.generateId(),
                content: content,
                category: categorization.category,
                categoryIcon: categorization.icon,
                confidence: categorization.confidence,
                tags: Categorizer.extractTags(content),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };

            // Zapisz
            if (Storage.add(note)) {
                UI.showFeedback(`Zapisano: ${categorization.category}`);
                UI.clearInput();
            } else {
                UI.showFeedback('Błąd zapisu');
            }
        },

        saveEdit() {
            if (!UI.currentEditId) return;

            const newContent = UI.elements.editTextarea.value.trim();

            if (!newContent) {
                alert('Notatka nie może być pusta!');
                return;
            }

            if (Storage.update(UI.currentEditId, newContent)) {
                UI.closeEditModal();
                UI.renderNotes(UI.elements.categoryFilter.value);
                UI.showFeedback('Zapisano');
            }
        },

        deleteNote() {
            if (!UI.currentEditId) return;

            if (confirm('Czy na pewno chcesz usunąć tę notatkę?')) {
                if (Storage.delete(UI.currentEditId)) {
                    UI.closeEditModal();
                    UI.renderNotes(UI.elements.categoryFilter.value);
                    UI.showFeedback('Usunięto');
                }
            }
        },

        loadInitialState() {
            // Focus on input for immediate typing
            UI.elements.thoughtInput.focus();
        },

        generateId() {
            return Date.now().toString(36) + Math.random().toString(36).slice(2);
        }
    };

    // ==========================================
    // Initialize App
    // ==========================================
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => App.init());
    } else {
        App.init();
    }

})();
