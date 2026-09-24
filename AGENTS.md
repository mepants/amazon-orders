# AGENTS.md — Amazon Order Extractor Extension

This document serves as the persistent knowledge base, architectural reference, and progress log for AI coding agents and human developers working on this Chrome extension.

---

## 1. Project Overview

- **Name:** Craig's Budget Parse / Amazon Order Extractor
- **Platform:** Google Chrome Extension (Manifest V3)
- **Primary Goal:** Extract purchase and order details from the Amazon Orders page (`www.amazon.co.uk`) to facilitate personal budgeting, expense tracking, and data export.
- **Secondary / Legacy Capability:** Parsing transactions from Sainsbury's Bank credit card statements (`online.sainsburysbank.co.uk`).
- **Core User Flow:**
  1. The user navigates to their Amazon Order History page.
  2. The user clicks the extension action icon in the toolbar, opening the popup.
  3. The user clicks the **Amazon** button.
  4. The extension executes an extraction script on the active page tab, parses DOM data, formats the extracted order details, and initiates a file download (e.g. JSON/CSV).

---

## 2. Repository Layout & File Inventory

```
/Users/craig/code/amazon-extension/
├── .gitignore                      # Git ignore rules (*.crx, *.pem, OS files)
├── AGENTS.md                       # This living documentation & agent tracking file
├── BudgetExtension.crx             # Packaged extension archive (dist/artifact; gitignored)
├── BudgetExtension.pem             # Private key for packed CRX extension ID stability (gitignored)
└── BudgetExtension/                # Source directory for unpacked extension loading
    ├── manifest.json               # Chrome Extension Manifest V3 configuration
    ├── manifest_v2.json            # Legacy Manifest V2 configuration (reference only)
    ├── background.js               # MV3 Background Service Worker (declarativeContent page rules)
    ├── background (1).js           # Legacy MV2 background script backup
    ├── popup.html                  # Popup interface providing action buttons
    ├── popup.js                    # MV3 popup controller; triggers scripts via chrome.scripting
    ├── popup (1).js                # Legacy MV2 popup script (tabs.executeScript)
    ├── amazon.js                   # Primary Amazon DOM extractor (extracts JSON, auto-downloads)
    ├── amazon_orders.js            # Alternate/legacy line-by-line regex HTML parser (CSV prompt)
    ├── sainsburys.js               # Sainsbury's statement parser (extracts CSV, auto-downloads)
    └── images/                     # Extension icons (16, 32, 48, 128 px)
        ├── get_started16.png
        ├── get_started32.png
        ├── get_started48.png
        └── get_started128.png
```

### File Status & Notes:
- **`manifest.json`**: Current Manifest V3 manifest. Requests `tabs`, `scripting`, `declarativeContent`, and `storage` permissions, with host permissions for `https://www.amazon.co.uk/*` and `https://online.sainsburysbank.co.uk/*`.
- **`amazon.js`**: Current primary scraper for Amazon. Selects `div.order-card` elements, extracts order numbers (`yohtmlc-order-id`), order dates, order totals (`yohtmlc-order-total`), identifies digital vs. physical orders, iterates shipment delivery boxes (`div.delivery-box`), and downloads `amazon-<timestamp>.json`.
- **`amazon_orders.js`**: An older/alternative regex-based scraper operating on raw HTML lines, displaying a CSV string in a `prompt()` modal.
- **`popup (1).js`, `background (1).js`, `manifest_v2.json`**: Legacy MV2 artifacts. Note that Chrome deprecated MV2, so keep all active development strictly on Manifest V3 in `manifest.json`, `background.js`, and `popup.js`.

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

- [ ] **Amazon Selector Resilience:**
  - Modernize and harden selectors against Amazon's modern order page DOM (handle variations across EU/UK/US Amazon domains).
- [ ] **Multi-page & Pagination Scrapes:**
  - Currently extracts only the 10 orders loaded on the visible page. Support navigating pagination or aggregating across multiple pages/years.
- [ ] **Export Options:**
  - Support CSV, JSON, and direct clipboard copying in addition to JSON file downloads.
- [ ] **UI Modernization:**
  - Modernize `popup.html` with clean typography, status indicators, and feedback messages when extraction completes.
- [ ] **Codebase Cleanup:**
  - Clarify or retire duplicate legacy MV2 files (`background (1).js`, `popup (1).js`, `manifest_v2.json`) to prevent accidental edits to obsolete scripts.

---

## 7. Work Log & Agent Decisions

*Record key changes, technical decisions, and milestones below as work progresses.*

| Date | Agent / Contributor | Description / Decisions Made |
| :--- | :--- | :--- |
| 2026-09-24 | Assistant | Created `AGENTS.md` documenting project structure, MV3 architecture, Amazon extraction schema, and future backlog. |
| 2026-09-24 | Assistant | Initialized Git repository on `main` branch and added `.gitignore` protecting `*.crx`, `*.pem`, and OS files. |
