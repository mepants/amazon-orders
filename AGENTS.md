# AGENTS.md — Amazon Order Extractor Extension

This document serves as the persistent knowledge base, architectural reference, and progress log for AI coding agents and human developers working on this Chrome extension.

---

## 1. Project Overview

- **Name:** Craig's Budget Parse / Amazon Order Extractor
- **Platform:** Google Chrome Extension (Manifest V3)
- **Primary Goal:** Extract purchase and order details from the Amazon Orders page (`www.amazon.co.uk`) to facilitate personal budgeting, expense tracking, and data export.
- **Core User Flow:**
  1. The user navigates to their Amazon Order History page.
  2. The user clicks the extension action icon in the toolbar, opening the popup.
  3. The user clicks the **Amazon** button.
  4. The extension executes an extraction script on the active page tab, parses DOM data, formats the extracted order details, and initiates a file download (`amazon-<timestamp>.json`).

---

## 2. Repository Layout & File Inventory

```
/Users/craig/code/amazon-extension/
├── .gitignore                      # Git ignore rules (*.crx, *.pem, OS files)
├── AGENTS.md                       # This living documentation & agent tracking file
├── BudgetExtension.crx             # Packaged extension archive (dist/artifact; gitignored)
├── BudgetExtension.pem             # Private key for packed CRX extension ID stability (gitignored)
├── sample-output/                  # Reference output captures from past runs
│   └── amazon-1789068337408.json   # Sample extracted JSON dataset
├── sample-pages/                   # Offline HTML test fixtures
│   └── amazon-orders-sep-26.html   # Sample Amazon orders page capture
└── BudgetExtension/                # Source directory for unpacked extension loading
    ├── manifest.json               # Chrome Extension Manifest V3 configuration
    ├── background.js               # MV3 Background Service Worker (declarativeContent page rules)
    ├── popup.html                  # Popup interface providing action buttons
    ├── popup.js                    # MV3 popup controller; triggers scripts via chrome.scripting
    ├── amazon.js                   # Primary Amazon DOM extractor (extracts JSON, auto-downloads)
    └── images/                     # Extension icons (16, 32, 48, 128 px)
        ├── get_started16.png
        ├── get_started32.png
        ├── get_started48.png
        └── get_started128.png
```

### File Status & Notes:
- **`manifest.json`**: Current Manifest V3 manifest. Requests `tabs`, `scripting`, `declarativeContent`, and `storage` permissions, with host permissions for `https://www.amazon.co.uk/*`.
- **`amazon.js`**: Primary scraper for Amazon. Selects `div.order-card` elements, extracts order numbers (`yohtmlc-order-id`), order dates, order totals (`yohtmlc-order-total`), identifies digital vs. physical orders, iterates shipment delivery boxes (`div.delivery-box`), and downloads `amazon-<timestamp>.json`.
- **`popup.html` / `popup.js`**: Cleaned up to solely trigger the Amazon extraction script using `async`/`await`.
- **`background.js`**: Background service worker applying declarativeContent rules only on `www.amazon.co.uk`.

---

## 3. Technology Stack & Architectural Constraints

- **Extension Specification:** Manifest V3 (MV3).
- **Frontend / Scripts:** Pure Vanilla JavaScript, HTML, CSS.
- **Execution Model:**
  - **Service Worker (`background.js`):** Listens to `chrome.runtime.onInstalled` and applies `chrome.declarativeContent` rules to show page actions when matching host domains.
  - **Popup (`popup.html` / `popup.js`):** Queries active tab and calls `chrome.scripting.executeScript({ target: { tabId }, files: [...] })`.
  - **Injected Scripts (`amazon.js`):** Runs directly in the context of the page DOM to scrape elements.

### Critical Rules for Developers & Agents:
1. **Manifest V3 Strictness:**
   - Always use `chrome.scripting.executeScript` instead of the deprecated `chrome.tabs.executeScript`.
   - Never use `eval()`, inline `<script>` tags, or inline HTML event listeners (`onclick="..."`).
   - Use `async`/`await` for Chrome Extension API calls.
2. **Amazon DOM Volatility:**
   - Amazon frequently alters HTML layout, classes, and obfuscated CSS selectors.
   - Extractor code should use robust fallback strategies (e.g. checking multiple selector variants, checking semantic markers or text labels rather than purely brittle generated classes).
3. **Data Privacy & Security:**
   - User purchase history and banking details are sensitive data.
   - All extraction and parsing must remain strictly local on the client device. Do not send order data to third-party endpoints without explicit user intent and consent.

---

## 4. Amazon Data Model

The data structure currently extracted by `amazon.js`:

```typescript
interface ExtractedOrder {
  number: string;          // e.g. "205-1234567-1234567" or digital "D01-..."
  date: Date | string;     // Order placement date
  price: number;           // Total order price (parsed float)
  digital: boolean;        // True if order is digital content / Kindle / gift card
  items: ExtractedItem[];  // Array of items in the order
}

interface ExtractedItem {
  description: string;     // Product title / item description
  price: number;           // Item unit/total price
}
```

---

## 5. Development & Testing Workflow

1. **Load Unpacked Extension in Chrome:**
   - Open Chrome and navigate to `chrome://extensions/`.
   - Enable **Developer mode** (toggle in upper right).
   - Click **Load unpacked** and select the `/Users/craig/code/amazon-extension/BudgetExtension` directory.
2. **Reloading after edits:**
   - When modifying `manifest.json` or `background.js`, click the refresh icon on the extension card in `chrome://extensions/`.
   - When modifying `amazon.js`, `popup.js`, or `popup.html`, changes take effect immediately on next popup open / script execution (or reload the active Amazon page).
3. **Inspecting:**
   - Inspect popup UI: Right-click the extension icon in the Chrome toolbar -> **Inspect popup**.
   - Inspect background service worker: Click **service worker** link on `chrome://extensions/`.
   - Inspect extractor execution: Open Chrome DevTools on the Amazon tab (`F12` or right-click -> **Inspect**) and view the **Console** tab.

---

## 6. Known Challenges & Target Enhancements

- [x] **Amazon Selector Resilience:**
  - Modernized and hardened selectors in `amazon.js` against Amazon's latest DOM layout (CSD-rendered cards, slot-id attributes, flexbox/grid containers) while maintaining full backwards compatibility with legacy formats.
- [ ] **Multi-page & Pagination Scrapes:**
  - Currently extracts only the 10 orders loaded on the visible page. Support navigating pagination or aggregating across multiple pages/years.
- [ ] **Export Options:**
  - Support CSV, JSON, and direct clipboard copying in addition to JSON file downloads.
- [ ] **UI Modernization:**
  - Modernize `popup.html` with clean typography, status indicators, and feedback messages when extraction completes.
- [x] **Codebase Cleanup:**
  - Retired duplicate legacy MV2 files (`background (1).js`, `popup (1).js`, `manifest_v2.json`) and removed unused Sainsbury's / alternative scraper scripts (`sainsburys.js`, `amazon_orders.js`).

---

## 7. Work Log & Agent Decisions

*Record key changes, technical decisions, and milestones below as work progresses.*

| Date | Agent / Contributor | Description / Decisions Made |
| :--- | :--- | :--- |
| 2026-09-24 | Assistant | Created `AGENTS.md` documenting project structure, MV3 architecture, Amazon extraction schema, and future backlog. |
| 2026-09-24 | Assistant | Initialized Git repository on `main` branch and added `.gitignore` protecting `*.crx`, `*.pem`, and OS files. |
| 2026-09-24 | Assistant | Removed all dependencies on deleted files (`sainsburys.js`, `amazon_orders.js`, MV2 backups): updated `manifest.json` description & host permissions, `background.js` declarative rules, and `popup.html`/`popup.js`. |
| 2026-09-24 | Assistant | Updated `amazon.js` with multi-tier fallback parsing: resolved `TypeError: Cannot read properties of null (reading 'querySelector')` on delivery boxes, added slot-id order number detection, modern flex container item extraction, action button filtering, and robust error handling. |
