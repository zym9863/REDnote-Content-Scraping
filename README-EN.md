English | [中文](./README.md)

# REDnote Content Scraping Extension

This is a modern browser extension built with the [WXT](https://wxt.dev/) framework and React.

Its main functionality is to help you automatically scan and extract cover images from notes on **Xiaohongshu (REDnote)** user profile pages, while supporting one-click batch downloading.

## ✨ Core Features

- **🔍 Auto Cover Scanning**: Automatically extracts and displays the count of scanned note covers in the bottom-right corner of the current REDnote profile page.
- **📜 Infinite Scroll Support**: As the user scrolls down, the extension automatically captures newly loaded cover images.
- **📥 One-Click Batch Download**: Supports universally downloading all high-res cover images scanned on the current page with a single click—no need to save them manually one by one.
- **📁 Smart File Categorization**: Automatically retrieves the current REDnote username and saves the downloaded images into a folder named after the user.

## 🛠️ Tech Stack

- [WXT](https://wxt.dev/) - Next-gen browser extension build tool
- React & TypeScript - UI rendering and development language
- Tailwind CSS / Vanilla CSS - Styling

## 🚀 Local Development & Usage

### Prerequisites

Please ensure that [Node.js](https://nodejs.org/) (v18+ recommended) is installed in your local environment. You can use either `npm` or `pnpm` as the package manager.

### Install Dependencies

```bash
npm install
# or
pnpm install
```

### Start Development Server

In development mode, the extension can automatically load and perform real-time hot updates in the browser.

```bash
npm run dev
# or
pnpm run dev
```

Upon launching, the Chrome browser will automatically open in developer mode and mount this extension.

### Build Production Release

When you're finished developing and ready to bundle the extension:

```bash
npm run build
# or
pnpm run build
```

This command will generate the packaged extension files in the `.output` directory. You can drag the compiled zip file or folder into your browser's extensions management page (e.g., `chrome://extensions/`) to use it.

## 💡 User Guide

1. Install and enable this extension.
2. Open any REDnote user's personal profile page in your browser (e.g., `https://www.xiaohongshu.com/user/profile/...`).
3. The "REDnote Content Scraping" panel will appear in the bottom-right corner (or as a floating container) of the page.
4. Scroll down the page to let more notes load. The extension will automatically count the captured covers.
5. Click the **"Batch Download Covers"** button, and the browser will automatically begin saving all scanned images locally (sorted into subfolders named by the username).

## ⚠️ Disclaimer

This extension is provided strictly for educational and technical exchange purposes. Please use network resources reasonably and abide by the terms and regulations of the relevant platforms. Respect the original authors' copyrights and intellectual property rights. This tool is strictly prohibited from any illegal commercial use.
