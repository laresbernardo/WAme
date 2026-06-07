# Chrome Web Store Listing — WAme - Chat Downloader

> Last Updated: 2026-06-07

## Store Listing

**Extension Name**
WAme - Chat Downloader

**Short Description**
Seamlessly download your active WhatsApp Web chat history as a formatted TXT or structured CSV file.

**Detailed Description**
WAme is a lightweight developer-friendly extension designed to help you back up and export your conversations from WhatsApp Web.

Key Features:
- Seamless visual integration: Adds a clean, native-looking "Download" button directly into the WhatsApp Web active chat header.
- Multiple formats: Export your chat history as Plain Text (.txt) for human reading, or Structured CSV (.csv) for data analysis.
- Smart auto-scrolling: Load older messages automatically by date range or export the entire history to the beginning.
- Fully local and secure: All scraping and processing are done inside your browser. No message data ever leaves your machine.
- Theme support: Adapts perfectly to both Light and Dark modes of WhatsApp Web.

How to use:
1. Install WAme.
2. Open https://web.whatsapp.com and select a contact chat.
3. Click the "Download" icon in the top header for a quick text export, or click the WAme extension icon in your Chrome toolbar for advanced settings (CSV export, date ranges, and deep scroll backups).

**Category**
Productivity

**Single Purpose**
Downloads and exports the active WhatsApp Web conversation history to local TXT or CSV files.

**Primary Language**
English

---

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon | 128×128 PNG | ⬜ Not created | |
| Screenshot 1 (Main view) | 1280×800 | ⬜ Not created | |
| Screenshot 2 (Popup menu) | 1280×800 | ⬜ Not created | |

### Screenshot Notes
- Screenshot 1: Show WhatsApp Web chat pane with the injected download button highlighted in the header bar.
- Screenshot 2: Show the open WAme popup UI panel illustrating the date selector and file format toggles.

---

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `activeTab` | permissions | Grants the extension temporary access to the active WhatsApp Web tab to load script triggers upon user request. |
| `scripting` | permissions | Allows programmatic injection of scraping scripts into the active tab to extract loaded text message containers. |
| `downloads` | permissions | Required to write and save the generated chat log file (.txt or .csv) directly to the user's Local Downloads directory. |
| `storage` | permissions | Used to persist custom user configurations (e.g. preferred output formats) across sessions. |
| `https://web.whatsapp.com/*` | host_permissions | Restricts all content scraping operations to the official WhatsApp Web application domain to prevent arbitrary website access. |

---

## Privacy & Data Use

### Data Collection

**Does the extension collect user data?** No

*All processing is performed locally inside the sandbox of the active tab. No communication is sent to external servers.*

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

---

## Privacy Policy
*Not required as the extension does not collect or transmit any user data, but recommended to host a static statement showing local-only operations on a GitHub Pages site or similar.*

---

## Distribution
**Visibility**: Public
**Regions**: All regions
**Pricing**: Free

---

## Developer Info

**Publisher Name**
BERVOS

**Contact Email**
contact@bervos.org

**Support URL / Email**
https://github.com/laresbernardo/WAme/issues

**Homepage URL**
https://bervos.org

---

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 0.0.1 | 2026-06-07 | Initial release. Added header button, TXT/CSV outputs, auto-scrolling, date limits, and BERVOS footer. | Draft |
