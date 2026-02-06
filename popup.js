// FormSaver Popup Script

let savedForms = [];

// Initialize popup
document.addEventListener('DOMContentLoaded', () => {
    loadSavedForms();
    loadFillMode();

    // Event listeners
    document.getElementById('saveBtn').addEventListener('click', saveCurrentForm);
    document.getElementById('exportBtn').addEventListener('click', exportForms);
    document.getElementById('importBtn').addEventListener('click', () => {
        document.getElementById('importFile').click();
    });
    document.getElementById('importFile').addEventListener('change', importForms);
    document.getElementById('fillMode').addEventListener('change', saveFillMode);
});

// Load saved forms from storage
async function loadSavedForms() {
    try {
        const result = await chrome.storage.local.get(['savedForms']);
        savedForms = result.savedForms || [];
        displayForms();
    } catch (error) {
        console.error('Error loading forms:', error);
        showNotification('Error loading saved forms', 'error');
    }
}

// Display saved forms in the list
function displayForms() {
    const formsList = document.getElementById('savedFormsList');
    const formCount = document.getElementById('formCount');

    formCount.textContent = savedForms.length;

    if (savedForms.length === 0) {
        formsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">📝</div>
        <p>No saved forms yet</p>
        <p class="hint">Fill out a form on any website and click "Save Current Form"</p>
      </div>
    `;
        return;
    }

    // Sort forms by timestamp (newest first)
    savedForms.sort((a, b) => b.timestamp - a.timestamp);

    formsList.innerHTML = savedForms.map(form => {
        const date = new Date(form.timestamp);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
        const formattedTime = date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });

        return `
      <div class="form-card" data-id="${form.id}">
        <div class="form-header">
          <div class="form-title">${escapeHtml(form.title)}</div>
          <div class="form-meta">
            <span>🗓️ ${formattedDate}</span>
            <span>🕐 ${formattedTime}</span>
            <span>📊 ${form.fields.length} fields</span>
          </div>
          <div class="form-url" title="${escapeHtml(form.url)}">${escapeHtml(form.url)}</div>
        </div>
        <div class="form-actions">
          <button class="btn btn-autofill" data-id="${form.id}">
            <span class="icon">✨</span>
            Auto-Fill
          </button>
          <button class="btn btn-delete" data-id="${form.id}">
            <span class="icon">🗑️</span>
            Delete
          </button>
        </div>
      </div>
    `;
    }).join('');

    // Add event listeners to dynamic buttons
    document.querySelectorAll('.btn-autofill').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            autoFillForm(id);
        });
    });

    document.querySelectorAll('.btn-delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.getAttribute('data-id');
            deleteForm(id);
        });
    });
}

// Save current form
async function saveCurrentForm() {
    try {
        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            showNotification('No active tab found', 'error');
            return;
        }

        // Check if URL is valid (not chrome:// or edge:// pages)
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            showNotification('Cannot access this page', 'error');
            return;
        }

        // Send message to content script to capture form data
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'captureForm' });

        if (response.success && response.data) {
            const formData = response.data;

            if (formData.fields.length === 0) {
                showNotification('No form fields found on this page', 'error');
                return;
            }

            // Generate unique ID
            formData.id = `form_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

            // Add to saved forms
            savedForms.push(formData);

            // Save to storage
            await chrome.storage.local.set({ savedForms });

            // Update display
            displayForms();

            showNotification(`Form saved! (${formData.fields.length} fields captured)`, 'success');
        } else {
            showNotification('Failed to capture form data', 'error');
        }
    } catch (error) {
        console.error('Error saving form:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Auto-fill form
async function autoFillForm(formId) {
    try {
        const form = savedForms.find(f => f.id === formId);

        if (!form) {
            showNotification('Form not found', 'error');
            return;
        }

        // Get active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

        if (!tab) {
            showNotification('No active tab found', 'error');
            return;
        }

        // Check if URL is valid
        if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://') || tab.url.startsWith('about:')) {
            showNotification('Cannot access this page', 'error');
            return;
        }

        // Get selected fill mode
        const fillMode = document.getElementById('fillMode').value;

        // Add fill mode to form data
        const formDataWithMode = {
            ...form,
            fillMode: fillMode
        };

        // Send message to content script to fill form
        const response = await chrome.tabs.sendMessage(tab.id, {
            action: 'fillForm',
            data: formDataWithMode
        });

        if (response.success) {
            showNotification('Auto-fill started!', 'success');
            // Close popup after a short delay
            setTimeout(() => window.close(), 800);
        } else {
            showNotification('Failed to fill form', 'error');
        }
    } catch (error) {
        console.error('Error filling form:', error);
        showNotification('Error: ' + error.message, 'error');
    }
}

// Load fill mode preference
async function loadFillMode() {
    try {
        const result = await chrome.storage.local.get(['fillMode']);
        const fillMode = result.fillMode || 'instant';
        document.getElementById('fillMode').value = fillMode;
    } catch (error) {
        console.error('Error loading fill mode:', error);
    }
}

// Save fill mode preference
async function saveFillMode() {
    try {
        const fillMode = document.getElementById('fillMode').value;
        await chrome.storage.local.set({ fillMode });
    } catch (error) {
        console.error('Error saving fill mode:', error);
    }
}

// Delete form
async function deleteForm(formId) {
    if (!confirm('Are you sure you want to delete this saved form?')) {
        return;
    }

    try {
        savedForms = savedForms.filter(f => f.id !== formId);
        await chrome.storage.local.set({ savedForms });
        displayForms();
        showNotification('Form deleted', 'success');
    } catch (error) {
        console.error('Error deleting form:', error);
        showNotification('Error deleting form', 'error');
    }
}

// Export all forms
function exportForms() {
    if (savedForms.length === 0) {
        showNotification('No forms to export', 'error');
        return;
    }

    const dataStr = JSON.stringify(savedForms, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const filename = `formsaver_export_${timestamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();

    URL.revokeObjectURL(url);

    showNotification(`Exported ${savedForms.length} form(s)`, 'success');
}

// Import forms
async function importForms(event) {
    const file = event.target.files[0];

    if (!file) return;

    try {
        const text = await file.text();
        const importedForms = JSON.parse(text);

        if (!Array.isArray(importedForms)) {
            showNotification('Invalid file format', 'error');
            return;
        }

        // Validate imported forms
        const validForms = importedForms.filter(form =>
            form.id && form.title && form.url && Array.isArray(form.fields)
        );

        if (validForms.length === 0) {
            showNotification('No valid forms found in file', 'error');
            return;
        }

        // Merge with existing forms (avoid duplicates by ID)
        const existingIds = new Set(savedForms.map(f => f.id));
        const newForms = validForms.filter(f => !existingIds.has(f.id));

        savedForms = [...savedForms, ...newForms];

        await chrome.storage.local.set({ savedForms });
        displayForms();

        showNotification(`Imported ${newForms.length} new form(s)`, 'success');
    } catch (error) {
        console.error('Error importing forms:', error);
        showNotification('Error importing file: ' + error.message, 'error');
    } finally {
        // Reset file input
        event.target.value = '';
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show';

    if (type === 'error') {
        notification.style.background = 'linear-gradient(135deg, #eb3349 0%, #f45c43 100%)';
    } else {
        notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
