# Tab Manager Dashboard

Tab Manager Dashboard is a minimal Chrome extension that lets you organize your tabs into named categories and reopen them at any time via a custom New Tab page.

## Features

- **Dashboard view**: Replaces your New Tab page with a dashboard listing your open tabs and saved categories.
- **Drag and drop**: Drag currently open tabs into a category to save them for later.
- **Manual entry**: Add URLs to a category using the text field under each category.
- **Quick open**: Open all tabs in a category with a single click.
- **Context menu**: Right‑click anywhere and choose "Save all open tabs to category" to archive your session.
- **Sync storage**: Categories are stored using Chrome's `storage.sync` so they can be shared between browsers signed into the same account.
- **Emoji icons**: Uses the `emoji-picker-element` library for a macOS-style emoji chooser.

## Preview

<img alt="Dashboard Screenshot" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAKb+RoYAAAAASUVORK5CYII=" />

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions`.
3. Enable **Developer mode** in the top‑right corner.
4. Click **Load unpacked** and select this repository's folder.
5. The extension's icon will appear in the toolbar and your New Tab page will show the dashboard.

## Usage

1. The **Open Tabs** list shows tabs from your current window. Drag any of them into an existing category to save it.
2. Create a new category using the text field at the top of the dashboard.
3. Use the context menu item "Save all open tabs to category" to snapshot every tab in the window.
4. Click **Open All** in a category to reopen every saved tab.
5. To remove a category, click the **✕** button next to its name.

All saved data is kept in Chrome's synced storage, so categories follow you across devices as long as you are signed into Chrome.

## Development

The core logic lives in `dashboard.js`, while `dashboard.html` defines the layout and `dashboard.css` contains styles. `manifest.json` configures the extension as a Chrome extension using Manifest V3.

Feel free to modify these files and reload the extension using the **Reload** button on the extensions page.

## Contributing

Contributions are welcome! If you run into bugs or have ideas for improvements, please open an issue.
To submit code, fork the repository and create a new branch for your changes.
Once you've committed your work, push the branch and open a pull request describing your updates.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

