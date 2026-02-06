// FormSaver Content Script - Captures and fills form data

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'captureForm') {
    const formData = captureFormData();
    sendResponse({ success: true, data: formData });
  } else if (request.action === 'fillForm') {
    fillFormData(request.data);
    sendResponse({ success: true });
  }
  return true;
});

// Capture all form data from the current page
function captureFormData() {
  const fields = [];
  const url = window.location.href;
  const title = document.title || new URL(url).hostname;

  // Get all input fields
  const inputs = document.querySelectorAll('input');
  inputs.forEach((input, index) => {
    try {
      const type = input.type.toLowerCase();

      // Skip submit, button, file, and reset fields (now capturing passwords)
      if (['submit', 'button', 'image', 'reset', 'file'].includes(type)) {
        return;
      }

      // For radio and checkbox, only save if checked
      if ((type === 'radio' || type === 'checkbox')) {
        if (!input.checked) return;
      }

      const field = {
        type: 'input',
        inputType: type,
        id: input.id || '',
        name: input.name || '',
        className: input.className || '',
        placeholder: input.placeholder || '',
        label: getLabel(input),
        value: type === 'checkbox' || type === 'radio' ? input.checked : input.value,
        index: index
      };

      // Only add field if it has a value
      if (field.value) {
        fields.push(field);
      }
    } catch (error) {
      // Silently skip fields that can't be accessed (security restrictions)
      console.warn('Could not capture field:', error);
    }
  });

  // Get all textarea fields
  const textareas = document.querySelectorAll('textarea');
  textareas.forEach((textarea, index) => {
    if (textarea.value) {
      fields.push({
        type: 'textarea',
        id: textarea.id || '',
        name: textarea.name || '',
        className: textarea.className || '',
        placeholder: textarea.placeholder || '',
        label: getLabel(textarea),
        value: textarea.value,
        index: index
      });
    }
  });

  // Get all select fields
  const selects = document.querySelectorAll('select');
  selects.forEach((select, index) => {
    if (select.value) {
      fields.push({
        type: 'select',
        id: select.id || '',
        name: select.name || '',
        className: select.className || '',
        label: getLabel(select),
        value: select.value,
        selectedIndex: select.selectedIndex,
        index: index
      });
    }
  });

  return {
    url: url,
    title: title,
    timestamp: Date.now(),
    fields: fields
  };
}

// Get label text for a form field
function getLabel(element) {
  // Try to find label by 'for' attribute
  if (element.id) {
    const label = document.querySelector(`label[for="${element.id}"]`);
    if (label) return label.textContent.trim();
  }

  // Try to find parent label
  const parentLabel = element.closest('label');
  if (parentLabel) {
    return parentLabel.textContent.trim();
  }

  // Try to find preceding label sibling
  let prev = element.previousElementSibling;
  while (prev) {
    if (prev.tagName === 'LABEL') {
      return prev.textContent.trim();
    }
    prev = prev.previousElementSibling;
  }

  return '';
}

// Fill form with saved data (ONLY fills fields, does NOT trigger submit)
// Supports multiple filling strategies to bypass anti-autofill detection
function fillFormData(savedData) {
  if (!savedData || !savedData.fields) return;

  // Get the selected fill mode (default: instant)
  const fillMode = savedData.fillMode || 'instant';

  // Prevent any accidental form submissions during auto-fill
  const preventSubmit = (e) => {
    e.preventDefault();
    e.stopImmediatePropagation();
    return false;
  };

  // Temporarily block all form submissions
  const forms = document.querySelectorAll('form');
  forms.forEach(form => {
    form.addEventListener('submit', preventSubmit, { capture: true });
  });

  // Process fields based on selected fill mode
  switch (fillMode) {
    case 'human':
      fillWithHumanTyping(savedData.fields);
      break;
    case 'slow':
      fillWithSlowDelay(savedData.fields);
      break;
    case 'silent':
      fillSilent(savedData.fields);
      break;
    case 'paste':
      fillWithPaste(savedData.fields);
      break;
    case 'instant':
    default:
      fillInstant(savedData.fields);
      break;
  }

  // Remove submit prevention after a delay
  setTimeout(() => {
    forms.forEach(form => {
      form.removeEventListener('submit', preventSubmit, { capture: true });
    });
  }, fillMode === 'human' || fillMode === 'slow' ? 5000 : 500);

  // Show success notification
  const modeNames = {
    instant: 'Instant Fill',
    human: 'Human-like Typing',
    slow: 'Slow Fill',
    silent: 'Silent Fill',
    paste: 'Paste Fill'
  };
  showNotification(`✓ ${modeNames[fillMode] || 'Form filled'} completed!`);
}

// Strategy 1: Instant Fill (Default - fast but may be detected)
function fillInstant(fields) {
  if (!Array.isArray(fields)) return;
  fields.forEach(field => {
    try {
      if (!field || !field.value) return;
      const element = findElement(field);
      if (element) {
        setElementValue(element, field, true);
        highlightField(element);
      }
    } catch (error) {
      console.warn('Error filling field:', error);
    }
  });
}

// Strategy 2: Human-like Typing (Simulates real typing with random delays)
async function fillWithHumanTyping(fields) {
  if (!Array.isArray(fields)) return;
  for (const field of fields) {
    try {
      if (!field || !field.value) continue;
      const element = findElement(field);
      if (element && field.type !== 'select') {
        await simulateTyping(element, field);
        highlightField(element);
        // Random delay between fields (100-300ms)
        await sleep(100 + Math.random() * 200);
      } else if (element && field.type === 'select') {
        setElementValue(element, field, true);
        highlightField(element);
        await sleep(150);
      }
    } catch (error) {
      console.warn('Error filling field:', error);
    }
  }
}

// Strategy 3: Slow Fill (Gradual filling with consistent delays)
async function fillWithSlowDelay(fields) {
  if (!Array.isArray(fields)) return;
  for (const field of fields) {
    try {
      if (!field || !field.value) continue;
      const element = findElement(field);
      if (element) {
        setElementValue(element, field, true);
        highlightField(element);
        await sleep(300); // 300ms delay between each field
      }
    } catch (error) {
      console.warn('Error filling field:', error);
    }
  }
}

// Strategy 4: Silent Fill (No events triggered - stealthy)
function fillSilent(fields) {
  if (!Array.isArray(fields)) return;
  fields.forEach(field => {
    try {
      if (!field || !field.value) return;
      const element = findElement(field);
      if (element) {
        setElementValue(element, field, false); // No events
        highlightField(element);
      }
    } catch (error) {
      console.warn('Error filling field:', error);
    }
  });
}

// Strategy 5: Paste Fill (Simulates paste action)
async function fillWithPaste(fields) {
  if (!Array.isArray(fields)) return;
  for (const field of fields) {
    try {
      if (!field || !field.value) continue;
      const element = findElement(field);
      if (element && field.type === 'input' && field.inputType !== 'checkbox' && field.inputType !== 'radio') {
        simulatePaste(element, field.value);
        highlightField(element);
        await sleep(100);
      } else if (element) {
        setElementValue(element, field, true);
        highlightField(element);
        await sleep(100);
      }
    } catch (error) {
      console.warn('Error filling field:', error);
    }
  }
}

// Helper: Find element using multiple strategies
function findElement(field) {
  if (!field) return null;

  let element = null;

  try {
    if (field.id) {
      element = document.getElementById(field.id);
    }

    if (!element && field.name) {
      const elements = document.getElementsByName(field.name);
      if (elements.length > 0) {
        element = elements[0];
      }
    }

    if (!element && field.className) {
      const elements = document.getElementsByClassName(field.className);
      if (elements.length > 0 && elements[field.index] !== undefined) {
        element = elements[field.index];
      }
    }
  } catch (error) {
    console.warn('Error finding element:', error);
  }

  return element;
}

// Helper: Set element value with optional events
function setElementValue(element, field, triggerEvents = true) {
  if (!element || !field || field.value === undefined || field.value === null) return;

  try {
    if (field.type === 'input') {
      if (field.inputType === 'checkbox' || field.inputType === 'radio') {
        element.checked = field.value;
        if (triggerEvents) {
          element.dispatchEvent(new Event('change', { bubbles: true }));
        }
      } else {
        element.value = String(field.value);
        if (triggerEvents) {
          element.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }));
          element.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
        }
      }
    } else if (field.type === 'textarea') {
      element.value = String(field.value);
      if (triggerEvents) {
        element.dispatchEvent(new Event('input', { bubbles: true, cancelable: false }));
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
      }
    } else if (field.type === 'select') {
      element.value = String(field.value);
      if (triggerEvents) {
        element.dispatchEvent(new Event('change', { bubbles: true, cancelable: false }));
      }
    }
  } catch (error) {
    console.warn('Error setting element value:', error);
  }
}

// Helper: Simulate human typing character by character
async function simulateTyping(element, field) {
  element.focus();
  element.value = '';

  const text = String(field.value);

  for (let i = 0; i < text.length; i++) {
    element.value += text[i];

    // Trigger keyboard events
    element.dispatchEvent(new KeyboardEvent('keydown', { key: text[i], bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keypress', { key: text[i], bubbles: true }));
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new KeyboardEvent('keyup', { key: text[i], bubbles: true }));

    // Random delay between keystrokes (30-80ms - human-like)
    await sleep(30 + Math.random() * 50);
  }

  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

// Helper: Simulate paste action
function simulatePaste(element, value) {
  element.focus();

  // Create paste event
  const pasteEvent = new ClipboardEvent('paste', {
    bubbles: true,
    cancelable: true,
    clipboardData: new DataTransfer()
  });

  // Set clipboard data
  try {
    pasteEvent.clipboardData.setData('text/plain', value);
  } catch (e) {
    // Fallback if DataTransfer not supported
  }

  element.dispatchEvent(pasteEvent);
  element.value = value;
  element.dispatchEvent(new Event('input', { bubbles: true }));
  element.dispatchEvent(new Event('change', { bubbles: true }));
  element.blur();
}

// Helper: Highlight filled field
function highlightField(element) {
  element.style.transition = 'background-color 0.3s';
  const originalBg = element.style.backgroundColor;
  element.style.backgroundColor = '#d4edda';
  setTimeout(() => {
    element.style.backgroundColor = originalBg;
  }, 1000);
}

// Helper: Sleep/delay function
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Show notification on the page
function showNotification(message) {
  const notification = document.createElement('div');
  notification.textContent = message;
  notification.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 15px 25px;
    border-radius: 8px;
    font-family: system-ui, -apple-system, sans-serif;
    font-size: 14px;
    font-weight: 500;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 999999;
    animation: slideIn 0.3s ease-out;
  `;

  document.body.appendChild(notification);

  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease-in';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

// Add animations
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);
