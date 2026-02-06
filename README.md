# FormSaver Browser Extension

Save, restore, and manage form data across websites with ease. Never lose your form data again!

## Features

✨ **Save Form Data** - Capture all filled form fields from any webpage with a single click

🔄 **Auto-Fill Forms** - Instantly restore saved form data to speed up repetitive form filling

📤 **Export Data** - Download all saved forms as a JSON file for backup or sharing

📥 **Import Data** - Import previously exported form data from JSON files

🗑️ **Manage Forms** - View, organize, and delete saved forms with a clean, modern interface

🎨 **Beautiful UI** - Premium gradient design with smooth animations and hover effects

## Installation

### Chrome/Edge (Developer Mode)

1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/` (or `edge://extensions/`)
3. Enable "Developer mode" using the toggle in the top right
4. Click "Load unpacked"
5. Select the `formzsave` folder
6. The extension is now installed!

### Firefox

1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Navigate to the `formzsave` folder and select `manifest.json`
5. The extension is now installed temporarily

## Usage

### Saving a Form

1. Fill out a form on any website
2. Click the FormSaver extension icon in your browser toolbar
3. Click the "Save Current Form" button
4. Your form data is now saved!

### Auto-Filling a Form

1. Navigate to a webpage with a form
2. Click the FormSaver extension icon
3. Find the saved form you want to use in the list
4. Click the "Auto-Fill" button
5. The form will be automatically populated with your saved data

### Exporting Forms

1. Click the FormSaver extension icon
2. Click the "Export All" button
3. A JSON file will be downloaded with all your saved forms
4. Keep this file as a backup or share it across devices

### Importing Forms

1. Click the FormSaver extension icon
2. Click the "Import" button
3. Select a previously exported JSON file
4. Your forms will be imported and merged with existing data

## Data Structure

Saved forms include:
- Form title (auto-generated from page title or URL)
- Page URL where the form was captured
- Timestamp of when the form was saved
- All form fields with their values:
  - Text inputs
  - Email, tel, number, date inputs
  - Textareas
  - Select dropdowns
  - Checkboxes (checked state)
  - Radio buttons (checked state)

## Privacy & Security

- **100% Local Storage** - All data is stored locally in your browser using Chrome's storage API
- **No Cloud Sync** - Your data never leaves your device unless you explicitly export it
- **Password Fields Excluded** - Password inputs are never captured for security
- **File Inputs Excluded** - File uploads cannot be saved due to browser security restrictions

## Browser Compatibility

- ✅ Chrome (v88+)
- ✅ Edge (v88+)
- ✅ Brave
- ✅ Firefox (v89+)
- ✅ Opera

## Technical Details

### Permissions

- `storage` - To save form data locally
- `activeTab` - To access the current page when saving/filling forms
- `scripting` - To inject content scripts for form capture and auto-fill
- `<all_urls>` - To work on any website (except browser internal pages)

### File Structure

```
formzsave/
├── manifest.json       # Extension configuration
├── popup.html         # Extension popup UI
├── popup.css          # Popup styling
├── popup.js           # Popup logic
├── content.js         # Form capture & auto-fill script
├── background.js      # Service worker
├── icons/             # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md          # This file
```

## Limitations

- Cannot access browser internal pages (chrome://, edge://, about:, etc.)
- Password fields are intentionally excluded for security
- File inputs cannot be saved due to browser security restrictions
- Forms inside cross-origin iframes may not be accessible

## Development

### Making Changes

1. Edit the source files as needed
2. Go to `chrome://extensions/` (or your browser's extension page)
3. Click the refresh icon on the FormSaver extension
4. Test your changes

### Debugging

- Use Chrome DevTools to debug the popup (right-click popup → Inspect)
- Use the browser console on web pages to debug content scripts
- Check the service worker in `chrome://extensions/` → Details → Inspect views: service worker

## Support

If you encounter any issues or have suggestions, please:
1. Check the browser console for error messages
2. Verify the extension has the necessary permissions
3. Try reloading the extension
4. Make sure you're not on a restricted page (chrome://, edge://, etc.)

## License

This project is open source and available for personal and commercial use.

## Credits

Created with ❤️ for easier form management across the web.
