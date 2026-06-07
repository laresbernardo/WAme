# WAme — WhatsApp Web Chat Downloader

WAme is a lightweight, high-performance, and feature-rich Chrome Extension (Manifest V3) designed to seamlessly download and export your active WhatsApp Web conversation history into clean **TXT** or **CSV** formats. 

Built with a dark-mode-first glassmorphic UI, WAme integrates directly into the WhatsApp Web page interface, offering robust auto-scrolling algorithms, media parsing, and adaptive locale detection.

---

## Key Features

*   **Flexible Export Formats**:
    *   **TXT**: Styled as `[YYYY-MM-DD HH:MM] Sender Name: Message Content` (quotes and replies are stripped for readability).
    *   **CSV**: Comma-separated columns mapping `Timestamp,Sender,Message`.
*   **Two-Phase Smart Scroller**:
    *   **Phase 1 (Scroll Down)**: Detects if your viewport is currently scrolled up and scrolls down first to capture all newer messages.
    *   **Phase 2 (Scroll Up)**: Scrolls up to the top of the chat to capture older messages.
*   **Custom Scrolling Limits**:
    *   **Complete Chat History**: Automatically scrolls up to the oldest message synced in your browser session.
    *   **Date Range Limit**: Scrolls up until it crosses your selected "From Date" boundary.
    *   **Quick Download (Viewport Only)**: Injects a quick-download icon into WhatsApp's header bar to immediately download only the currently loaded viewport chat.
*   **Smart Media Parsing**: Identifies message media elements (photos, videos, stickers, voice notes, documents) and replaces raw DOM layout artifacts with clean markers containing sizes (e.g., `<Image 202 kB>`, `<Video 3.5 MB>`).
*   **Adaptive Spinner & Sync Detection**: Monitors WhatsApp's native loader state when fetching older messages from the phone database, pausing the scroll loop and waiting for sync without timing out.
*   **Locale & Date Format Auto-Detection**: Dynamically analyzes DOM message timestamps using bounds-testing and chronological sorting models to determine if dates are formatted as US (`MM/DD/YYYY`) or International (`DD/MM/YYYY`), resolving swapped month/day errors and sorting issues.
*   **Premium Success Overlays**: Replaces browser alerts with custom success summaries detailing total messages saved, parsed date boundaries, and troubleshooting tips if the WhatsApp Web phone sync limit was reached.
*   **Branding & Resilient Context**: 
    *   Features clean **BERVOS** branding footers that adapt to light and dark themes.
    *   Implements context-invalidation recovery to auto-inject/re-establish connection paths when the unpacked extension is reloaded.

---

## Installation & Setup

To load and run WAme locally in Chrome Developer Mode:

1.  **Clone or Download** this repository to your local machine.
2.  Open **Google Chrome** and navigate to:
    ```bash
    chrome://extensions
    ```
3.  In the top-right corner, toggle the **Developer mode** switch to **ON**.
4.  In the top-left corner, click **Load unpacked**.
5.  Select the project root directory:
    ```
    /path/to/WAme
    ```
6.  The extension **WAme - Chat Downloader** will now appear in your active extensions list.

---

## How to Use

1.  Navigate to [WhatsApp Web](https://web.whatsapp.com) and log in.
2.  Select an active conversation thread.
3.  **Quick Viewport Export**:
    *   Click the **Download** icon injected directly next to the search icon in the chat header.
    *   This triggers a fast export of the currently loaded message bubble elements.
4.  **Advanced Scroller Export**:
    *   Pin the **WAme** extension to your Chrome toolbar and click it to open the control panel.
    *   Select your desired export format (**Text** or **CSV**).
    *   Choose a limit setting (**All**, **Date Range**, or **None**).
    *   Click **Download Chat** to launch the overlays, monitoring progress controls (**Pause**, **Resume**, **Stop & Save**, or **Cancel**).
    *   The browser will automatically download the file once scrolling is finished.

---

## Repository Structure

*   [manifest.json](manifest.json) — Specifies permissions, content scripts, extension assets, and background service workers.
*   [background.js](background.js) — Coordinates file compilation and executes downloads using the Chrome downloads API.
*   [content.js](content.js) — Injects UI assets, monitors the scroll list container, scrapes DOM bubble nodes, and manages the scroll state-machine.
*   [popup.html](popup.html) & [popup.js](popup.js) — Renders the dark glassmorphic control popup dashboard.
*   `icons/` — Custom transparent extension logo files (`icon-16.png`, `icon-48.png`, `icon-128.png`).

---

## Credits

Designed and built by **BERVOS** ([bervos.org](https://bervos.org)).
