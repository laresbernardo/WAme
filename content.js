// Content script for WAme Chat Downloader

(() => {
  window.wameIsRunning = window.wameIsRunning || false;
  let wameDetectedStyle = null;

  // Helper to delay execution
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Helper to parse timestamp strings to Date objects
function parseTimestampToDateObj(timestampStr, formatStyle = null) {
  try {
    if (!timestampStr) return null;
    
    let cleanStr = timestampStr.replace(/[\[\]]/g, '').trim();
    let datePart = '';
    let timePart = '';
    
    if (cleanStr.includes(',')) {
      const parts = cleanStr.split(',');
      if (/\d{1,4}[/\-.]\d{1,4}[/\-.]\d{1,4}/.test(parts[0])) {
        datePart = parts[0].trim();
        timePart = parts[1].trim();
      } else {
        timePart = parts[0].trim();
        datePart = parts[1].trim();
      }
    } else {
      const dateMatch = cleanStr.match(/(\d{1,4})[/\-.](\d{1,4})[/\-.](\d{1,4})/);
      if (dateMatch) {
        datePart = dateMatch[0];
        timePart = cleanStr.replace(datePart, '').trim();
      } else {
        timePart = cleanStr.trim();
      }
    }
    
    let year = new Date().getFullYear();
    let month = new Date().getMonth();
    let day = new Date().getDate();
    
    if (datePart) {
      const match = datePart.match(/(\d{1,4})[/\-.](\d{1,4})[/\-.](\d{1,4})/);
      if (match) {
        const p1 = parseInt(match[1], 10);
        const p2 = parseInt(match[2], 10);
        const p3 = parseInt(match[3], 10);
        
        const lang = (navigator.language || 'en-US').toLowerCase();
        const isUSStyle = lang.startsWith('en-us') || lang === 'en';
        
        if (p3 >= 1000) {
          year = p3;
          if (p2 > 12) {
            month = p1 - 1;
            day = p2;
          } else if (p1 > 12) {
            month = p2 - 1;
            day = p1;
          } else {
            let isUS = isUSStyle;
            const style = formatStyle || wameDetectedStyle;
            if (style === 'US') {
              isUS = true;
            } else if (style === 'INTL') {
              isUS = false;
            }
            
            if (isUS) {
              month = p1 - 1;
              day = p2;
            } else {
              month = p2 - 1;
              day = p1;
            }
          }
        } else if (p1 >= 1000) {
          year = p1;
          month = p2 - 1;
          day = p3;
        }
      }
    }
    
    let hours = 0;
    let minutes = 0;
    let seconds = 0;
    
    if (timePart) {
      const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
      if (timeMatch) {
        hours = parseInt(timeMatch[1], 10);
        minutes = parseInt(timeMatch[2], 10);
        if (timeMatch[3]) {
          seconds = parseInt(timeMatch[3], 10);
        }
        const ampm = timeMatch[4] ? timeMatch[4].toLowerCase() : '';
        if (ampm === 'pm' && hours < 12) {
          hours += 12;
        } else if (ampm === 'am' && hours === 12) {
          hours = 0;
        }
      }
    }
    
    return new Date(year, month, day, hours, minutes, seconds);
  } catch (e) {
    console.error("WAme: Error parsing timestamp", timestampStr, e);
    return null;
  }
}

// Standardize raw timestamp string to YYYY-MM-DD HH:MM
function standardizeTimestamp(rawTimestamp, formatStyle = null) {
  if (!rawTimestamp) return '';
  const dateObj = parseTimestampToDateObj(rawTimestamp, formatStyle);
  if (!dateObj || isNaN(dateObj.getTime())) return rawTimestamp;
  
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, '0');
  const d = String(dateObj.getDate()).padStart(2, '0');
  const hh = String(dateObj.getHours()).padStart(2, '0');
  const mm = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${y}-${m}-${d} ${hh}:${mm}`;
}

// Wrapper for scrolls date comparison
function parseMessageDate(timestampStr) {
  return parseTimestampToDateObj(timestampStr);
}

// Helper to automatically detect the date format style ('US' or 'INTL') from a list of raw timestamps
function detectDateFormat(rawTimestamps) {
  if (!rawTimestamps || rawTimestamps.length === 0) return null;
  
  // 1. Look for absolute proof (any day number > 12)
  for (const raw of rawTimestamps) {
    if (!raw) continue;
    let cleanStr = raw.replace(/[\[\]]/g, '').trim();
    let datePart = '';
    
    if (cleanStr.includes(',')) {
      const parts = cleanStr.split(',');
      if (/\d{1,4}[/\-.]\d{1,4}[/\-.]\d{1,4}/.test(parts[0])) {
        datePart = parts[0].trim();
      } else if (parts[1]) {
        datePart = parts[1].trim();
      }
    } else {
      const dateMatch = cleanStr.match(/(\d{1,4})[/\-.](\d{1,4})[/\-.](\d{1,4})/);
      if (dateMatch) {
        datePart = dateMatch[0];
      }
    }
    
    if (datePart) {
      const match = datePart.match(/(\d{1,4})[/\-.](\d{1,4})[/\-.](\d{1,4})/);
      if (match) {
        const p1 = parseInt(match[1], 10);
        const p2 = parseInt(match[2], 10);
        const p3 = parseInt(match[3], 10);
        if (p3 >= 1000) {
          if (p1 > 12) return 'INTL'; // Format is DD/MM/YYYY
          if (p2 > 12) return 'US';   // Format is MM/DD/YYYY
        }
      }
    }
  }
  
  // 2. Fallback: Chronological violation check
  const usDates = [];
  const intlDates = [];
  
  for (const raw of rawTimestamps) {
    const dUS = parseTimestampToDateObj(raw, 'US');
    const dINTL = parseTimestampToDateObj(raw, 'INTL');
    if (dUS && !isNaN(dUS.getTime())) usDates.push(dUS);
    if (dINTL && !isNaN(dINTL.getTime())) intlDates.push(dINTL);
  }
  
  let usViolations = 0;
  let intlViolations = 0;
  
  for (let i = 0; i < usDates.length - 1; i++) {
    if (usDates[i] > usDates[i+1]) usViolations++;
  }
  for (let i = 0; i < intlDates.length - 1; i++) {
    if (intlDates[i] > intlDates[i+1]) intlViolations++;
  }
  
  if (usViolations === 0 && intlViolations > 0) return 'US';
  if (intlViolations === 0 && usViolations > 0) return 'INTL';
  
  return null;
}

// Get the chat partner/group name from the chat header
function getChatPartnerName() {
  const titleEl = document.querySelector('#main header span[dir="auto"]') || 
                  document.querySelector('#main header [data-testid="conversation-info-header-chat-title"]');
  return titleEl ? titleEl.textContent.trim() : "Chat";
}

// Find the scrollable message container dynamically
function findScrollableContainer() {
  let container = document.querySelector('#main [data-testid="conversation-panel-messages"]') || 
                  document.querySelector('#main .copyable-area')?.parentElement;
  
  if (container) return container;

  // Fallback: search #main divs for the scrollable area based on computed styles
  const main = document.querySelector('#main');
  if (!main) return null;

  const divs = main.querySelectorAll('div');
  for (const div of divs) {
    const style = window.getComputedStyle(div);
    if ((style.overflowY === 'auto' || style.overflowY === 'scroll') && div.scrollHeight > div.clientHeight) {
      return div;
    }
  }
  return null;
}

// Clean message text by removing tails, status codes, and trailing times
function cleanText(text, timestamp) {
  if (!text) return '';
  
  let cleaned = text;
  
  // Remove tail indicators
  cleaned = cleaned.replace(/^tail-(in|out)/g, '');
  
  // Remove read status icons / indicators
  cleaned = cleaned.replace(/wds-ic-(read|delivered|sent|error|wait)/g, '');
  cleaned = cleaned.replace(/forward-refreshed/g, '');
  cleaned = cleaned.replace(/forwarded/g, '');
  
  // Remove media cancel/download indicators
  cleaned = cleaned.replace(/media-cancel/g, '');
  cleaned = cleaned.replace(/media-download/g, '');
  
  // Remove redundant times at the end of the text
  let previous;
  do {
    previous = cleaned;
    cleaned = cleaned.replace(/\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*$/i, '');
  } while (cleaned !== previous);
  
  return cleaned.trim();
}

// Detect media type and size from message node
function detectMedia(node) {
  let type = null;
  let size = null;
  
  // Check for audio/voice notes
  if (node.querySelector('[data-testid="audio-play"], [data-testid="audio-pause"], [data-testid="ppt-play"], [data-testid="ppt-pause"]') || 
      node.querySelector('span[data-testid="voice-presentation"]') || 
      node.querySelector('audio') || 
      node.querySelector('.audio-player')) {
    type = 'Audio';
  }
  // Check for video
  else if (node.querySelector('[data-testid="video-thumb"], [data-testid="media-play"]') || 
      node.querySelector('video') || 
      node.querySelector('[class*="video"]')) {
    type = 'Video';
  }
  // Check for document/files
  else if (node.querySelector('[data-testid="document-thumb"]') || 
      node.querySelector('[data-testid="icon-doc"]') ||
      node.title?.match(/\.(pdf|docx|xlsx|pptx|txt|zip|rar|csv)$/i) ||
      node.querySelector('[class*="document"]')) {
    type = 'Document';
  }
  // Check for stickers
  else if (node.querySelector('[data-testid="sticker-container"]') || 
      node.querySelector('img[src*="sticker"]') || 
      node.querySelector('[class*="sticker"]')) {
    type = 'Sticker';
  }
  // Check for images
  else if (node.querySelector('img') || 
           node.querySelector('[data-testid="image-thumb"]')) {
    const img = node.querySelector('img');
    if (img) {
      // Check if emoji
      const isEmoji = img.classList.contains('wa') || 
                      img.getAttribute('data-plain-text') || 
                      (img.naturalWidth && img.naturalWidth <= 32) ||
                      (img.width && img.width <= 32);
      if (!isEmoji) {
        type = 'Image';
      }
    }
  }
  
  // If we found a media type, try to extract the size from node text
  if (type) {
    const text = node.innerText || '';
    // Match e.g. "202 kB", "3.5 MB", but only boundary-match B to prevent matching random words
    const match = text.match(/(\d+(?:\.\d+)?\s*(?:kB|MB|GB|Bytes|(?:\bB\b)))/i);
    if (match) {
      size = match[1].trim();
    }
  }
  
  return { type, size };
}

// Extract message text from node and clean it
function extractCleanText(node, timestamp) {
  // Detect if media is present first
  const media = detectMedia(node);
  
  const clone = node.cloneNode(true);
  
  // Remove reply/quoted message context
  const quotes = clone.querySelectorAll('[data-testid="quoted-msg-render"], [data-testid="quoted-message"], .quoted-mention');
  quotes.forEach(el => el.remove());
  
  // Remove time badge and metadata
  const metas = clone.querySelectorAll('[data-testid="msg-meta"], [class*="time"], [class*="meta"], [class*="status"]');
  metas.forEach(el => el.remove());
  
  // Remove styling tails
  const tails = clone.querySelectorAll('[class*="tail"]');
  tails.forEach(el => el.remove());
  
  // Get text from selectable-text element if present in clone
  const textEl = clone.querySelector('.selectable-text');
  let rawText = textEl ? textEl.innerText : clone.innerText;
  
  let cleaned = cleanText(rawText, timestamp);
  
  // Clean media artifacts and prepend clean descriptor tag
  if (media.type) {
    cleaned = cleaned.replace(/ic-download/gi, '');
    cleaned = cleaned.replace(/ic-gif/gi, '');
    if (media.size) {
      const escapedSize = media.size.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const sizeRegex = new RegExp(escapedSize, 'gi');
      cleaned = cleaned.replace(sizeRegex, '');
    }
    cleaned = cleaned.trim();
    
    const mediaTag = media.size ? `<${media.type} ${media.size}>` : `<${media.type}>`;
    cleaned = cleaned ? `${mediaTag} ${cleaned}` : mediaTag;
  }
  
  return cleaned;
}

// Scrape visible messages from the chat container
function scrapeMessages() {
  const messageNodes = document.querySelectorAll('#main div[data-testid="msg-container"], #main .message-in, #main .message-out');
  const chatPartner = getChatPartnerName();
  const messages = [];

  messageNodes.forEach((node) => {
    const copyableTextEl = node.querySelector('[data-pre-plain-text]') || 
                           (node.hasAttribute('data-pre-plain-text') ? node : null);
    
    let sender = '';
    let rawTimestamp = '';

    if (copyableTextEl) {
      const preText = copyableTextEl.getAttribute('data-pre-plain-text');
      const regex = /^\[([^\]]+)\]\s*(.*?):\s*$/;
      const match = preText.match(regex);
      if (match) {
        rawTimestamp = match[1];
        sender = match[2];
      }
    }

    if (!sender) {
      const isOut = node.classList.contains('message-out') || node.querySelector('.message-out');
      sender = isOut ? 'Me' : chatPartner;
    }

    if (!rawTimestamp) {
      const spans = node.querySelectorAll('span');
      for (const span of spans) {
        const txt = span.textContent.trim();
        if (/^\d{1,2}:\d{2}\s*(?:AM|PM)?$/i.test(txt)) {
          rawTimestamp = txt;
          break;
        }
      }
    }

    // Extract clean message text
    let text = extractCleanText(node, rawTimestamp);

    // Remove sender prefix merged in text (common in group chats / replies)
    if (sender) {
      const cleanSender = sender.trim();
      if (text.startsWith(cleanSender)) {
        text = text.substring(cleanSender.length).trim();
      }
      // Secondary regex to handle sender followed by spaces/colons (e.g. "Oscar Klemprer: ")
      const escapedSender = cleanSender.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const prefixRegex = new RegExp('^' + escapedSender + '\\s*:?\\s*', 'i');
      text = text.replace(prefixRegex, '');
    }

    // Standardize timestamp format to YYYY-MM-DD HH:MM:SS
    const timestamp = standardizeTimestamp(rawTimestamp);

    const signature = `${timestamp}_${sender}_${text.substring(0, 20)}`;

    if (text) {
      messages.push({
        timestamp,
        rawTimestamp,
        sender,
        text,
        signature
      });
    }
  });

  const uniqueMessages = [];
  const seenSignatures = new Set();
  for (const msg of messages) {
    if (!seenSignatures.has(msg.signature)) {
      seenSignatures.add(msg.signature);
      uniqueMessages.push(msg);
    }
  }

  return uniqueMessages;
}

// Format message list to text or CSV
function formatMessages(messages, format) {
  if (format === 'csv') {
    const csvRows = ['"Timestamp","Sender","Message"'];
    for (const msg of messages) {
      const escapedTimestamp = msg.timestamp.replace(/"/g, '""');
      const escapedSender = msg.sender.replace(/"/g, '""');
      const escapedText = msg.text.replace(/"/g, '""');
      csvRows.push(`"${escapedTimestamp}","${escapedSender}","${escapedText}"`);
    }
    return csvRows.join('\n');
  } else {
    return messages.map(msg => `[${msg.timestamp}] ${msg.sender}: ${msg.text}`).join('\n');
  }
}

// Create progress overlay card
function createProgressOverlay() {
  let overlay = document.getElementById('wame-progress-overlay');
  if (overlay) return overlay;

  overlay = document.createElement('div');
  overlay.id = 'wame-progress-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--panel-header-background, #f0f2f5);
    color: var(--primary-title, #111b21);
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 360px;
    text-align: center;
    border: 1px solid var(--border-panel, rgba(0,0,0,0.08));
    display: flex;
    flex-direction: column;
    gap: 16px;
    box-sizing: border-box;
  `;

  if (document.body.classList.contains('dark')) {
    card.style.background = '#202c33';
    card.style.color = '#e9edef';
    card.style.borderColor = '#3b4a54';
  }

  const title = document.createElement('h3');
  title.innerText = 'WAme Chat Downloader';
  title.style.margin = '0';
  title.style.fontSize = '18px';
  title.style.fontWeight = '600';

  const spinner = document.createElement('div');
  spinner.id = 'wame-progress-spinner';
  spinner.style.cssText = `
    width: 40px;
    height: 40px;
    border: 3.5px solid rgba(0, 168, 132, 0.2);
    border-top: 3.5px solid var(--button-round-background, #00a884);
    border-radius: 50%;
    margin: 12px auto;
    animation: wame-spin 1.2s linear infinite;
  `;

  // Inject CSS animations dynamically if needed
  if (!document.getElementById('wame-styles')) {
    const styleSheet = document.createElement("style");
    styleSheet.id = 'wame-styles';
    styleSheet.innerText = `
      @keyframes wame-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
      .wame-download-btn:hover {
        background-color: var(--background-default-hover, rgba(0, 0, 0, 0.05)) !important;
        border-radius: 50%;
      }
      .dark .wame-download-btn:hover {
        background-color: var(--background-default-hover, rgba(255, 255, 255, 0.08)) !important;
      }
    `;
    document.head.appendChild(styleSheet);
  }

  const statusText = document.createElement('div');
  statusText.id = 'wame-status-text';
  statusText.innerText = 'Initializing...';
  statusText.style.fontSize = '14px';
  statusText.style.lineHeight = '1.4';
  statusText.style.color = 'var(--secondary-title, #667781)';

  const buttonsContainer = document.createElement('div');
  buttonsContainer.id = 'wame-progress-buttons';
  buttonsContainer.style.cssText = `
    display: flex;
    gap: 10px;
    justify-content: center;
    margin-top: 8px;
  `;

  card.appendChild(title);
  card.appendChild(spinner);
  card.appendChild(statusText);
  card.appendChild(buttonsContainer);
  card.appendChild(createBervosFooter());
  overlay.appendChild(card);
  document.body.appendChild(overlay);

  // Render controls dynamically based on state ('running' or 'paused')
  window.updateWameProgressUI = (state) => {
    buttonsContainer.innerHTML = '';
    
    if (state === 'paused') {
      spinner.style.animationPlayState = 'paused';
      spinner.style.borderTopColor = 'var(--secondary-title, #667781)';
    } else {
      spinner.style.animationPlayState = 'running';
      spinner.style.borderTopColor = 'var(--button-round-background, #00a884)';
    }

    if (state === 'running') {
      // Pause Button
      const pauseBtn = document.createElement('button');
      pauseBtn.innerText = 'Pause';
      pauseBtn.style.cssText = `
        flex: 1;
        background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
        color: #0f1419;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        outline: none;
        transition: transform 0.1s;
      `;
      pauseBtn.onmouseenter = () => pauseBtn.style.transform = 'scale(1.02)';
      pauseBtn.onmouseleave = () => pauseBtn.style.transform = 'none';
      pauseBtn.onclick = () => {
        window.wameScrollingPaused = true;
        window.updateWameProgressUI('paused');
      };

      // Stop & Save Button
      const stopSaveBtn = document.createElement('button');
      stopSaveBtn.innerText = 'Stop & Save';
      stopSaveBtn.style.cssText = `
        flex: 1;
        background: #ea0038;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        outline: none;
        transition: background 0.2s, transform 0.1s;
      `;
      stopSaveBtn.onmouseenter = () => {
        stopSaveBtn.style.background = '#d30030';
        stopSaveBtn.style.transform = 'scale(1.02)';
      };
      stopSaveBtn.onmouseleave = () => {
        stopSaveBtn.style.background = '#ea0038';
        stopSaveBtn.style.transform = 'none';
      };
      stopSaveBtn.onclick = () => {
        window.wameScrollingCancelled = true;
        statusText.innerText = 'Stopping and saving messages loaded so far...';
        buttonsContainer.innerHTML = ''; // Hide buttons immediately
      };

      buttonsContainer.appendChild(pauseBtn);
      buttonsContainer.appendChild(stopSaveBtn);

    } else if (state === 'paused') {
      // Resume Button
      const resumeBtn = document.createElement('button');
      resumeBtn.innerText = 'Resume';
      resumeBtn.style.cssText = `
        flex: 1;
        background: var(--button-round-background, #00a884);
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        outline: none;
        transition: transform 0.1s;
      `;
      resumeBtn.onmouseenter = () => resumeBtn.style.transform = 'scale(1.02)';
      resumeBtn.onmouseleave = () => resumeBtn.style.transform = 'none';
      resumeBtn.onclick = () => {
        window.wameScrollingPaused = false;
        window.updateWameProgressUI('running');
      };

      // Save & Exit Button
      const saveBtn = document.createElement('button');
      saveBtn.innerText = 'Save & Exit';
      saveBtn.style.cssText = `
        flex: 1;
        background: #e67e22;
        color: white;
        border: none;
        padding: 8px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 600;
        font-size: 13px;
        outline: none;
        transition: background 0.2s, transform 0.1s;
      `;
      saveBtn.onmouseenter = () => {
        saveBtn.style.background = '#d35400';
        saveBtn.style.transform = 'scale(1.02)';
      };
      saveBtn.onmouseleave = () => {
        saveBtn.style.background = '#e67e22';
        saveBtn.style.transform = 'none';
      };
      saveBtn.onclick = () => {
        window.wameScrollingCancelled = true;
        window.wameScrollingPaused = false;
        statusText.innerText = 'Saving messages loaded so far...';
        buttonsContainer.innerHTML = ''; // Hide buttons immediately
      };

      // Cancel (No Save) Button
      const cancelBtn = document.createElement('button');
      cancelBtn.innerText = 'Cancel';
      cancelBtn.style.cssText = `
        flex: 1;
        background: rgba(0,0,0,0.08);
        color: var(--primary-title, #111b21);
        border: 1px solid var(--border-panel, rgba(0,0,0,0.08));
        padding: 8px 12px;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        font-size: 13px;
        outline: none;
        transition: transform 0.1s;
      `;
      if (document.body.classList.contains('dark')) {
        cancelBtn.style.background = 'rgba(255,255,255,0.08)';
        cancelBtn.style.color = '#e9edef';
        cancelBtn.style.borderColor = '#3b4a54';
      }
      cancelBtn.onmouseenter = () => cancelBtn.style.transform = 'scale(1.02)';
      cancelBtn.onmouseleave = () => cancelBtn.style.transform = 'none';
      cancelBtn.onclick = () => {
        window.wameCancelNoSave = true;
        window.wameScrollingCancelled = true;
        window.wameScrollingPaused = false;
        window.wameIsRunning = false;
        
        // Immediate UI removal for responsive UX even in case of thread lock/crash
        const overlay = document.getElementById('wame-progress-overlay');
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      };

      buttonsContainer.appendChild(resumeBtn);
      buttonsContainer.appendChild(saveBtn);
      buttonsContainer.appendChild(cancelBtn);
    }
  };

  // Set initial running buttons layout
  window.updateWameProgressUI('running');

  return overlay;
}

// Search for "Click here to get older messages" button and click it programmatically
function checkAndClickOlderMessages() {
  const chatContainer = findScrollableContainer();
  if (!chatContainer) return false;
  
  try {
    const xpathResult = document.evaluate(
      ".//*[contains(text(), 'older messages') or contains(text(), 'Click here to get older')]", 
      chatContainer, 
      null, 
      XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, 
      null
    );
    
    for (let i = 0; i < xpathResult.snapshotLength; i++) {
      const element = xpathResult.snapshotItem(i);
      if (element) {
        console.log("WAme: Found older messages button, clicking it programmatically.");
        element.click();
        
        // Try to click clickable ancestor container
        let parent = element.parentElement;
        for (let depth = 0; depth < 3 && parent; depth++) {
          if (parent.getAttribute('role') === 'button' || parent.tagName === 'BUTTON' || parent.style.cursor === 'pointer') {
            parent.click();
            break;
          }
          parent = parent.parentElement;
        }
        return true;
      }
    }
  } catch (e) {
    console.error("WAme: Error clicking older messages button", e);
  }
  return false;
}

// Check if WhatsApp Web is currently loading older messages
function isChatLoading() {
  const container = findScrollableContainer();
  if (!container) return false;
  
  // 1. Check for standard loading spinner elements
  const spinner = container.querySelector('[data-testid="spinner"], [data-testid="circle-loader"]');
  if (spinner) return true;
  
  // 2. Check for svg loading circles outside of individual message containers to avoid false positives
  const svgs = container.querySelectorAll('svg');
  for (const svg of svgs) {
    const isInsideMsg = svg.closest('[data-testid="msg-container"], .message-in, .message-out');
    if (!isInsideMsg) {
      if (svg.getAttribute('data-testid') === 'spinner') return true;
      
      const classNameStr = (typeof svg.className === 'string') ? svg.className : (svg.className?.baseVal || '');
      if (classNameStr.includes('spinner')) return true;
      
      const parent = svg.parentElement;
      if (parent) {
        const parentClassNameStr = (typeof parent.className === 'string') ? parent.className : (parent.className?.baseVal || '');
        if (parentClassNameStr.includes('spinner') || parentClassNameStr.includes('loading')) {
          return true;
        }
      }
      
      const html = svg.innerHTML || '';
      if (html.includes('circle') && (html.includes('animateTransform') || html.includes('animate'))) {
        return true;
      }
    }
  }
  
  return false;
}

// Check if we reached the phone sync limit message
function hasReachedPhoneSyncLimit() {
  const container = findScrollableContainer();
  if (!container) return false;
  
  const limitTexts = [
    "use whatsapp on your phone to see older",
    "usa whatsapp en tu teléfono para ver",
    "use o whatsapp no seu celular para ver",
    "utilisez whatsapp sur votre téléphone pour voir"
  ];
  
  const elements = container.querySelectorAll('div, span');
  for (const el of elements) {
    if (el.children.length === 0) {
      const txt = el.textContent.toLowerCase();
      for (const limitText of limitTexts) {
        if (txt.includes(limitText)) {
          // Verify it is NOT inside a message container to avoid false positives from message contents
          const isInsideMsg = el.closest('[data-testid="msg-container"], .message-in, .message-out');
          if (!isInsideMsg) {
            return true;
          }
        }
      }
    }
  }
  return false;
}

// Extract active chat phone number or clean JID name
function getActiveChatNumberOrName() {
  const name = getChatPartnerName();
  
  const digitsOnly = name.replace(/\D/g, '');
  if (name.trim().startsWith('+') && digitsOnly.length >= 8 && digitsOnly.length <= 15) {
    return digitsOnly;
  }
  
  const headerImg = document.querySelector('#main header img');
  if (headerImg) {
    const src = headerImg.getAttribute('src') || '';
    const match = src.match(/[?&]u=(\d+)/) || src.match(/\/u\/(\d+)/) || src.match(/\/u=(\d+)/);
    if (match) {
      const phone = match[1];
      if (phone && phone.length >= 8 && phone.length <= 15) {
        return phone;
      }
    }
    
    const digitMatch = src.match(/(\d{9,15})/);
    if (digitMatch) {
      return digitMatch[1];
    }
  }
  
  return name.replace(/[^a-zA-Z0-9]/g, '_');
}

// Creates the standard BERVOS branding footer dynamically
function createBervosFooter() {
  const footer = document.createElement('div');
  footer.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-top: 1px solid var(--border-panel, rgba(0,0,0,0.08));
    padding-top: 12px;
    margin-top: 12px;
    font-size: 11px;
    width: 100%;
    box-sizing: border-box;
  `;
  if (document.body.classList.contains('dark')) {
    footer.style.borderTopColor = '#3b4a54';
  }

  const brandLink = document.createElement('a');
  brandLink.href = 'https://bervos.org';
  brandLink.target = '_blank';
  brandLink.rel = 'noopener noreferrer';
  brandLink.style.cssText = `
    display: flex;
    align-items: center;
    gap: 6px;
    text-decoration: none;
    color: var(--secondary-title, #667781);
    transition: color 0.2s;
  `;
  brandLink.onmouseenter = () => brandLink.style.color = 'var(--primary-title, #111b21)';
  brandLink.onmouseleave = () => brandLink.style.color = 'var(--secondary-title, #667781)';
  if (document.body.classList.contains('dark')) {
    brandLink.onmouseenter = () => brandLink.style.color = '#e9edef';
    brandLink.onmouseleave = () => brandLink.style.color = '#8696a0';
    brandLink.style.color = '#8696a0';
  }

  const brandLogo = document.createElement('div');
  brandLogo.style.cssText = 'width: 16px; height: 16px; display: block; flex-shrink: 0;';
  
  const isDark = document.body.classList.contains('dark');
  const filterVal = isDark ? 'none' : 'invert(1) brightness(0.3)';
  
  const logoUrl = chrome.runtime.getURL("icons/bervos-logo-16.png");
  brandLogo.innerHTML = `
    <img src="${logoUrl}" 
         style="width: 100%; height: 100%; display: block; filter: ${filterVal};" />
  `;

  const brandName = document.createElement('span');
  brandName.innerText = 'Built by BERVOS';
  brandName.style.fontWeight = '600';

  brandLink.appendChild(brandLogo);
  brandLink.appendChild(brandName);

  const versionTag = document.createElement('div');
  versionTag.style.cssText = `
    color: var(--secondary-title, #667781);
    font-family: monospace;
    background: rgba(0,0,0,0.05);
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 10px;
  `;
  if (document.body.classList.contains('dark')) {
    versionTag.style.background = 'rgba(255,255,255,0.05)';
    versionTag.style.color = '#8696a0';
  }

  try {
    const manifest = chrome.runtime.getManifest();
    versionTag.innerText = `v${manifest.version}`;
  } catch (err) {
    versionTag.innerText = 'v0.0.18';
  }

  footer.appendChild(brandLink);
  footer.appendChild(versionTag);
  return footer;
}

// Perform the download sequence
async function executeDownload(options) {
  if (window.wameIsRunning) {
    console.warn("WAme: Download process is already running.");
    return;
  }

  wameDetectedStyle = null; // Reset for this run

  const container = findScrollableContainer();
  if (!container) {
    alert("Scrollable chat container not found. Make sure you have a chat active.");
    return;
  }

  window.wameIsRunning = true;

  // Create progress UI if scrolling is needed
  const needsScroll = options.limitType !== 'none';
  let overlay = null;
  let statusText = null;

  if (needsScroll) {
    overlay = createProgressOverlay();
    statusText = document.getElementById('wame-status-text');
  }

  window.wameScrollingCancelled = false;
  window.wameScrollingPaused = false;
  window.wameCancelNoSave = false;
  window.wameSyncLimitReached = false;
  let noChangeCount = 0;
  let previousOldestMsgSig = '';
  
  // Parse picker values ("YYYY-MM-DD") as local calendar days; `new Date(str)`
  // would parse them as midnight UTC and shift the range by timezone.
  const fromDate = options.fromDate ? wameParseLocalDate(options.fromDate) : null;
  const toDate = options.toDate ? wameParseLocalDate(options.toDate) : null;

  // Set up message accumulator to combat React list virtualization DOM-scrubbing
  let accumulatedMessages = [];
  
  function checkAndApplyDateFormat(currentMessages) {
    if (!wameDetectedStyle && currentMessages && currentMessages.length > 0) {
      const raws = currentMessages.map(m => m.rawTimestamp).filter(Boolean);
      const style = detectDateFormat(raws);
      if (style) {
        wameDetectedStyle = style;
        console.log(`WAme: Auto-detected date format style: ${style}`);
        
        // Re-standardize all messages accumulated so far
        accumulatedMessages.forEach(msg => {
          if (msg.rawTimestamp) {
            msg.timestamp = standardizeTimestamp(msg.rawTimestamp, style);
            msg.signature = `${msg.timestamp}_${msg.sender}_${msg.text.substring(0, 20)}`;
          }
        });
      }
    }
  }

  // Scrape initial messages immediately
  const initialMessages = scrapeMessages();
  checkAndApplyDateFormat(initialMessages);
  
  initialMessages.forEach(msg => {
    if (!accumulatedMessages.some(acc => acc.signature === msg.signature)) {
      accumulatedMessages.push(msg);
    }
  });

  if (needsScroll) {
    try {
      // Phase 1: Scroll down to the bottom first if not already there, to capture newer messages
      const isAlreadyAtBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;
      if (!isAlreadyAtBottom && !window.wameScrollingCancelled) {
        if (statusText) statusText.innerText = "Scanning for newer messages...";
        let scrollDownNoChange = 0;
        let lastScrollHeight = container.scrollHeight;
        
        while (!window.wameScrollingCancelled) {
          if (window.wameScrollingPaused) {
            await sleep(200);
            continue;
          }
          
          const currentMessages = scrapeMessages();
          checkAndApplyDateFormat(currentMessages);
          let hasNew = false;
          currentMessages.forEach(msg => {
            if (!accumulatedMessages.some(acc => acc.signature === msg.signature)) {
              accumulatedMessages.push(msg);
              hasNew = true;
            }
          });

          // Update status
          if (currentMessages.length > 0) {
            const latestMsg = currentMessages[currentMessages.length - 1];
            statusText.innerText = `Loaded ${accumulatedMessages.length} total messages.\nNewest loaded: ${latestMsg.timestamp}`;
            
            // Date restriction check for scrolling down
            if (options.limitType === 'date' && toDate) {
              const latestMsgDate = parseMessageDate(latestMsg.timestamp);
              if (latestMsgDate) {
                const latestNormalized = new Date(latestMsgDate.getFullYear(), latestMsgDate.getMonth(), latestMsgDate.getDate());
                const toNormalized = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
                if (latestNormalized >= toNormalized) {
                  break;
                }
              }
            }
          }

          // Scroll to the bottom of the container
          container.scrollTop = container.scrollHeight;
          await sleep(150);

          // Check if we hit the bottom
          const atBottom = container.scrollTop + container.clientHeight >= container.scrollHeight - 30;
          const heightChanged = container.scrollHeight !== lastScrollHeight;
          if (!hasNew && !heightChanged && (atBottom || scrollDownNoChange > 0)) {
            scrollDownNoChange++;
            if (scrollDownNoChange >= 3) {
              break;
            }
          } else {
            scrollDownNoChange = atBottom ? 1 : 0;
            lastScrollHeight = container.scrollHeight;
          }
        }
      }

      // Phase 2: Scroll up to the top (or fromDate)
      let lastAccumulatedLength = accumulatedMessages.length;
      noChangeCount = 0;

      while (!window.wameScrollingCancelled) {
        if (window.wameScrollingPaused) {
          await sleep(200);
          continue;
        }

        // Check if WhatsApp is loading older messages from the phone database
        if (isChatLoading()) {
          statusText.innerText = `WhatsApp is loading older messages from your phone...\n(Please keep your phone active and connected)`;
          noChangeCount = 0; // Reset stagnant count since we are in active load
          await sleep(500);
          continue;
        }

        const currentMessages = scrapeMessages();
        checkAndApplyDateFormat(currentMessages);
        
        // Accumulate current DOM view messages
        currentMessages.forEach(msg => {
          if (!accumulatedMessages.some(acc => acc.signature === msg.signature)) {
            accumulatedMessages.push(msg);
          }
        });

        // Update progress check based on accumulated messages length
        if (accumulatedMessages.length > lastAccumulatedLength) {
          noChangeCount = 0;
          lastAccumulatedLength = accumulatedMessages.length;
        } else {
          noChangeCount++;
        }

        if (accumulatedMessages.length > 0) {
          let oldestTimestamp = accumulatedMessages[0].timestamp;
          for (const msg of accumulatedMessages) {
            if (msg.timestamp && msg.timestamp < oldestTimestamp) {
              oldestTimestamp = msg.timestamp;
            }
          }
          statusText.innerText = `Loaded ${accumulatedMessages.length} total messages.\nOldest loaded: ${oldestTimestamp}`;
          
          // Date restriction checks
          const oldestMsgDate = parseMessageDate(oldestTimestamp);
          if (options.limitType === 'date' && fromDate && oldestMsgDate) {
            const oldestNormalized = new Date(oldestMsgDate.getFullYear(), oldestMsgDate.getMonth(), oldestMsgDate.getDate());
            const fromNormalized = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());

            if (oldestNormalized <= fromNormalized) {
              statusText.innerText = "Reached starting date limit. Saving...";
              await sleep(1000);
              break;
            }
          }

          // Top limit detection
          const isAtTop = container.scrollTop <= 10;
          const limitReached = hasReachedPhoneSyncLimit();
          if ((isAtTop && limitReached) || noChangeCount >= 6) {
            if (limitReached) {
              window.wameSyncLimitReached = true;
              statusText.innerText = "Reached WhatsApp phone sync limit. Saving...";
            } else {
              statusText.innerText = "Reached top of chat. Saving...";
            }
            await sleep(1000);
            break;
          }
        }

        // Bounce scroll: scroll down slightly then to the top to trigger scroll activity / intersection observer
        container.scrollTop = 100;
        container.dispatchEvent(new Event('scroll'));
        await sleep(100);
        container.scrollTop = 0;
        container.dispatchEvent(new Event('scroll'));
        
        // Look for and click "older messages" button
        const clickedOlder = checkAndClickOlderMessages();

        // Adaptive polling loop: check for DOM changes every 100ms
        const pollLimit = clickedOlder ? 30 : 15; // If we clicked "older messages", wait up to 3.0s, else 1.5s
        for (let p = 0; p < pollLimit; p++) {
          await sleep(100);
          if (window.wameScrollingCancelled) break;
          
          const polledMessages = scrapeMessages();
          const polledHasNew = polledMessages.some(msg => !accumulatedMessages.some(acc => acc.signature === msg.signature));
          if (polledHasNew) {
            break; // Continue immediately to next scroll iteration
          }
        }
      }
    } catch (err) {
      console.error("WAme Scraper Loop Error:", err);
      if (statusText) statusText.innerText = `Error: ${err.message}. Saving progress...`;
      await sleep(2000);
    }
  }

  if (window.wameCancelNoSave) {
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
    window.wameIsRunning = false;
    return; // Cancel without saving
  }

  try {
    // Scrape final DOM messages to ensure nothing is missed
    const finalMessagesScraped = scrapeMessages();
    finalMessagesScraped.forEach(msg => {
      if (!accumulatedMessages.some(acc => acc.signature === msg.signature)) {
        accumulatedMessages.push(msg);
      }
    });

    // Sort accumulated messages chronologically to ensure correct ordering
    accumulatedMessages.sort((a, b) => {
      const tA = a.timestamp || '';
      const tB = b.timestamp || '';
      return tA.localeCompare(tB);
    });

    // Apply date range filters if specified
    let finalMessages = accumulatedMessages;
    if (fromDate || toDate) {
      finalMessages = finalMessages.filter((msg) => {
        const msgDate = parseMessageDate(msg.timestamp);
        if (!msgDate) return true; // Keep in case of parse errors to prevent missing messages
        
        const msgDateNorm = new Date(msgDate.getFullYear(), msgDate.getMonth(), msgDate.getDate());
        
        if (fromDate) {
          const fromDateNorm = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
          if (msgDateNorm < fromDateNorm) return false;
        }
        if (toDate) {
          const toDateNorm = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
          if (msgDateNorm > toDateNorm) return false;
        }
        return true;
      });
    }

    // Download handling
    if (finalMessages.length === 0) {
      if (needsScroll) {
        statusText.innerText = "No messages found in selected range.";
        await sleep(2000);
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
      } else {
        alert("No messages found in the active view.");
      }
      window.wameIsRunning = false;
    } else {
      const formattedContent = formatMessages(finalMessages, options.format);
      
      // Naming convention: YYYYMMDD_HHMMSS_identifier.ext
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      const cleanTimestamp = `${y}${m}${d}_${hh}${mm}${ss}`;

      const identifier = getActiveChatNumberOrName();
      const fileExt = options.format === 'csv' ? 'csv' : 'txt';
      const filename = `${cleanTimestamp}_${identifier}.${fileExt}`;

      try {
        chrome.runtime.sendMessage({
          action: "download",
          content: formattedContent,
          filename: filename
        }, (response) => {
          if (chrome.runtime.lastError) {
            console.warn("WAme: lastError detected during download message:", chrome.runtime.lastError.message);
            alert("Connection failed. Please refresh the WhatsApp Web page to reactivate WAme.");
            window.wameIsRunning = false;
            if (overlay && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
            return;
          }
          if (!response?.success) {
            console.error("WAme Download trigger error:", response?.error);
          }
        });
      } catch (err) {
        console.warn("WAme: Extension context invalidated during message sending:", err.message);
        alert("Extension connection was lost. Please refresh the WhatsApp Web page and try again.");
        window.wameIsRunning = false;
        if (overlay && overlay.parentNode) {
          overlay.parentNode.removeChild(overlay);
        }
        return;
      }

      if (needsScroll) {
        // Transition the overlay to "Done / Success" view instead of tearing it down immediately
        const spinner = document.getElementById('wame-progress-spinner');
        if (spinner) {
          spinner.style.animation = 'none';
          spinner.style.width = '40px';
          spinner.style.height = '40px';
          spinner.style.border = 'none';
          spinner.style.borderRadius = '0';
          spinner.innerHTML = `
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%;">
              <circle cx="12" cy="12" r="10" fill="#00A884"/>
              <path d="M8.5 12.5L11 15L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          `;
        }

        const title = overlay.querySelector('h3');
        if (title) title.innerText = 'Export Complete!';

        if (statusText) {
          let oldestTimestamp = '';
          for (const msg of finalMessages) {
            if (msg.timestamp) {
              if (!oldestTimestamp || msg.timestamp < oldestTimestamp) {
                oldestTimestamp = msg.timestamp;
              }
            }
          }
          if (!oldestTimestamp) oldestTimestamp = 'N/A';
          
          let newestTimestamp = '';
          for (const msg of finalMessages) {
            if (msg.timestamp) {
              if (!newestTimestamp || msg.timestamp > newestTimestamp) {
                newestTimestamp = msg.timestamp;
              }
            }
          }
          if (!newestTimestamp) newestTimestamp = 'N/A';

          const oldestDateStr = oldestTimestamp.includes(' ') ? oldestTimestamp.split(' ')[0] : oldestTimestamp;
          const newestDateStr = newestTimestamp.includes(' ') ? newestTimestamp.split(' ')[0] : newestTimestamp;
          
          statusText.style.textAlign = 'left';
          
          let summaryHtml = `
            <div style="font-weight: 600; margin-bottom: 8px; color: var(--primary-title, #111b21);">
              Saved ${finalMessages.length} messages (${oldestDateStr} to ${newestDateStr})
            </div>
          `;

          if (window.wameSyncLimitReached) {
            summaryHtml += `
              <div style="font-size: 12px; border-top: 1px solid var(--border-panel, rgba(0,0,0,0.08)); padding-top: 8px; color: #d35400; line-height: 1.4;">
                <strong>⚠️ Phone Sync Limit Reached:</strong> WhatsApp Web cannot sync messages older than ${oldestDateStr} in this browser session. 
                <br><br>
                <strong>💡 Solution:</strong> Keep the WhatsApp app open on your phone while using WhatsApp Web, or try logging out and logging back in on your browser to trigger a deeper history sync.
              </div>
            `;
          } else {
            summaryHtml += `
              <div style="font-size: 12px; border-top: 1px solid var(--border-panel, rgba(0,0,0,0.08)); padding-top: 8px; color: var(--secondary-title, #667781); line-height: 1.4;">
                <strong>💡 Tip:</strong> WhatsApp Web initially syncs a limited chat history. If this export doesn't reach the beginning, scroll up manually in this chat to load older messages from your phone, then run WAme again.
              </div>
            `;
          }
          
          statusText.innerHTML = summaryHtml;
          if (document.body.classList.contains('dark')) {
            const borderEl = statusText.querySelector('div:nth-child(2)');
            if (borderEl) borderEl.style.borderTopColor = '#3b4a54';
          }
        }

        const buttonsContainer = document.getElementById('wame-progress-buttons');
        if (buttonsContainer) {
          buttonsContainer.innerHTML = '';
          const doneBtn = document.createElement('button');
          doneBtn.innerText = 'Done';
          doneBtn.style.cssText = `
            flex: 1;
            background: var(--button-round-background, #00a884);
            color: white;
            border: none;
            padding: 8px 20px;
            border-radius: 20px;
            cursor: pointer;
            font-weight: 600;
            font-size: 13px;
            outline: none;
            transition: transform 0.1s;
          `;
          doneBtn.onmouseenter = () => doneBtn.style.transform = 'scale(1.02)';
          doneBtn.onmouseleave = () => doneBtn.style.transform = 'none';
          doneBtn.onclick = () => {
            if (overlay && overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
            window.wameIsRunning = false;
          };
          buttonsContainer.appendChild(doneBtn);
        }
      } else {
        window.wameIsRunning = false;
      }
    }
  } catch (err) {
    console.error("WAme: Error during final download preparation:", err);
    alert("An error occurred while preparing your download: " + err.message);
    window.wameIsRunning = false;
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
    }
  }
}

// Opens a dialog directly on WhatsApp Web to select export settings
function showScreenOptionsDialog() {
  let existing = document.getElementById('wame-options-dialog');
  if (existing) {
    existing.parentNode.removeChild(existing);
  }

  const overlay = document.createElement('div');
  overlay.id = 'wame-options-dialog';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: rgba(0, 0, 0, 0.45);
    backdrop-filter: blur(4px);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 10000;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  `;

  const card = document.createElement('div');
  card.style.cssText = `
    background: var(--panel-header-background, #f0f2f5);
    color: var(--primary-title, #111b21);
    padding: 24px;
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    width: 320px;
    border: 1px solid var(--border-panel, rgba(0,0,0,0.08));
    display: flex;
    flex-direction: column;
    gap: 16px;
    text-align: left;
    box-sizing: border-box;
  `;

  if (document.body.classList.contains('dark')) {
    card.style.background = '#202c33';
    card.style.color = '#e9edef';
    card.style.borderColor = '#3b4a54';
  }

  // Header Title Area
  const header = document.createElement('div');
  header.style.cssText = `
    display: flex;
    align-items: center;
    gap: 12px;
    border-bottom: 1px solid var(--border-panel, rgba(0,0,0,0.08));
    padding-bottom: 12px;
  `;
  if (document.body.classList.contains('dark')) {
    header.style.borderBottomColor = '#3b4a54';
  }

  const logo = document.createElement('div');
  logo.style.cssText = 'width: 24px; height: 24px; display: block; flex-shrink: 0;';
  logo.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="width:100%; height:100%;">
      <rect x="2" y="2" width="20" height="20" rx="4" fill="#111B21" stroke="#00A884" stroke-width="1.5"/>
      <path d="M6 17H18M6 17V14M18 17V14" stroke="#00F2FE" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M6 6L9 14L12 9L15 14L18 6" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M12 9V14M12 14L10 12M12 14L14 12" stroke="#00F2FE" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  `;
  
  const titleInfo = document.createElement('div');
  const title = document.createElement('h3');
  title.innerText = 'WAme Downloader';
  title.style.margin = '0';
  title.style.fontSize = '16px';
  title.style.fontWeight = '600';
  const subtitle = document.createElement('div');
  subtitle.innerText = 'WhatsApp Web Chat Downloader';
  subtitle.style.fontSize = '11px';
  subtitle.style.color = 'var(--secondary-title, #667781)';
  titleInfo.appendChild(title);
  titleInfo.appendChild(subtitle);
  
  header.appendChild(logo);
  header.appendChild(titleInfo);
  card.appendChild(header);

  // 1. Format pills
  const fmtGroup = document.createElement('div');
  fmtGroup.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
  
  const fmtTitle = document.createElement('div');
  fmtTitle.innerText = 'FORMAT';
  fmtTitle.style.cssText = 'font-size: 10px; font-weight: 700; color: var(--secondary-title, #667781); letter-spacing: 0.05em;';
  
  const fmtSelector = document.createElement('div');
  fmtSelector.style.cssText = 'display: flex; background: rgba(0,0,0,0.05); border-radius: 8px; padding: 2px; border: 1px solid var(--border-panel, rgba(0,0,0,0.08));';
  if (document.body.classList.contains('dark')) {
    fmtSelector.style.background = '#111b21';
    fmtSelector.style.borderColor = '#3b4a54';
  }

  const optTxt = document.createElement('div');
  optTxt.style.flex = '1';
  optTxt.innerHTML = `<input type="radio" name="wame-screen-fmt" id="wame-screen-fmt-txt" value="txt" checked style="display:none;"><label for="wame-screen-fmt-txt" style="display:block; text-align:center; padding: 6px; font-size:12px; font-weight:500; border-radius:6px; cursor:pointer; color: var(--secondary-title, #667781); transition: all 0.2s;">Plain Text (.txt)</label>`;
  
  const optCsv = document.createElement('div');
  optCsv.style.flex = '1';
  optCsv.innerHTML = `<input type="radio" name="wame-screen-fmt" id="wame-screen-fmt-csv" value="csv" style="display:none;"><label for="wame-screen-fmt-csv" style="display:block; text-align:center; padding: 6px; font-size:12px; font-weight:500; border-radius:6px; cursor:pointer; color: var(--secondary-title, #667781); transition: all 0.2s;">Structured (.csv)</label>`;
  
  fmtSelector.appendChild(optTxt);
  fmtSelector.appendChild(optCsv);
  fmtGroup.appendChild(fmtTitle);
  fmtGroup.appendChild(fmtSelector);
  card.appendChild(fmtGroup);

  const updateFmtLabels = () => {
    const isTxt = card.querySelector('#wame-screen-fmt-txt').checked;
    const txtLabel = card.querySelector('label[for="wame-screen-fmt-txt"]');
    const csvLabel = card.querySelector('label[for="wame-screen-fmt-csv"]');
    
    const activeBg = document.body.classList.contains('dark') ? 'rgba(255,255,255,0.08)' : 'white';
    const activeText = 'var(--primary-title, #111b21)';
    const inactiveText = 'var(--secondary-title, #667781)';
    
    if (isTxt) {
      txtLabel.style.background = activeBg;
      txtLabel.style.color = activeText;
      csvLabel.style.background = 'transparent';
      csvLabel.style.color = inactiveText;
    } else {
      csvLabel.style.background = activeBg;
      csvLabel.style.color = activeText;
      txtLabel.style.background = 'transparent';
      txtLabel.style.color = inactiveText;
    }
  };
  
  optTxt.querySelector('input').addEventListener('change', updateFmtLabels);
  optCsv.querySelector('input').addEventListener('change', updateFmtLabels);
  
  // 2. Depth dropdown
  const depthGroup = document.createElement('div');
  depthGroup.style.cssText = 'display:flex; flex-direction:column; gap:6px;';
  
  const depthTitle = document.createElement('div');
  depthTitle.innerText = 'DOWNLOAD DEPTH';
  depthTitle.style.cssText = 'font-size: 10px; font-weight: 700; color: var(--secondary-title, #667781); letter-spacing: 0.05em;';
  
  const select = document.createElement('select');
  select.style.cssText = `
    background: rgba(0,0,0,0.03);
    border: 1px solid var(--border-panel, rgba(0,0,0,0.08));
    color: var(--primary-title, #111b21);
    padding: 8px 10px;
    border-radius: 8px;
    font-size: 13px;
    outline: none;
    cursor: pointer;
    width: 100%;
    box-sizing: border-box;
  `;
  if (document.body.classList.contains('dark')) {
    select.style.background = '#111b21';
    select.style.borderColor = '#3b4a54';
    select.style.color = '#e9edef';
  }
  
  select.innerHTML = `
    <option value="none">Current Screen View (Quick)</option>
    <option value="date">Date Range (Auto-Scroll)</option>
    <option value="all">Complete Chat History (Auto-Scroll)</option>
  `;
  
  depthGroup.appendChild(depthTitle);
  depthGroup.appendChild(select);
  card.appendChild(depthGroup);

  // 3. Date fields
  const datePickers = document.createElement('div');
  datePickers.style.cssText = 'display: none; grid-template-columns: 1fr 1fr; gap: 10px;';
  
  const today = new Date();
  const sevenAgo = new Date();
  sevenAgo.setDate(today.getDate() - 7);
  const fromStr = sevenAgo.toISOString().split('T')[0];
  const toStr = today.toISOString().split('T')[0];

  datePickers.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:4px;">
      <label style="font-size:10px; font-weight:600; color: var(--secondary-title, #667781);">From Date</label>
      <input type="date" id="wame-screen-from" value="${fromStr}" style="background:rgba(0,0,0,0.03); border:1px solid var(--border-panel, rgba(0,0,0,0.08)); border-radius:6px; padding:6px; font-size:11px; color:inherit; outline:none; width:100%; box-sizing:border-box;">
    </div>
    <div style="display:flex; flex-direction:column; gap:4px;">
      <label style="font-size:10px; font-weight:600; color: var(--secondary-title, #667781);">To Date</label>
      <input type="date" id="wame-screen-to" value="${toStr}" style="background:rgba(0,0,0,0.03); border:1px solid var(--border-panel, rgba(0,0,0,0.08)); border-radius:6px; padding:6px; font-size:11px; color:inherit; outline:none; width:100%; box-sizing:border-box;">
    </div>
  `;
  
  if (document.body.classList.contains('dark')) {
    datePickers.querySelectorAll('input').forEach(input => {
      input.style.background = '#111b21';
      input.style.borderColor = '#3b4a54';
    });
  }

  card.appendChild(datePickers);

  select.addEventListener('change', () => {
    if (select.value === 'date') {
      datePickers.style.display = 'grid';
    } else {
      datePickers.style.display = 'none';
    }
  });

  // Footer/Buttons Row
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display: flex; gap: 10px; margin-top: 10px;';
  
  const dlBtn = document.createElement('button');
  dlBtn.innerText = 'Download';
  dlBtn.style.cssText = `
    flex: 1;
    background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
    color: #0f1419;
    border: none;
    padding: 10px;
    border-radius: 8px;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
    box-shadow: 0 4px 12px rgba(0, 242, 254, 0.25);
    transition: all 0.2s;
    outline: none;
  `;
  dlBtn.onmouseenter = () => dlBtn.style.transform = 'translateY(-1px)';
  dlBtn.onmouseleave = () => dlBtn.style.transform = 'none';
  
  const closeBtn = document.createElement('button');
  closeBtn.innerText = 'Close';
  closeBtn.style.cssText = `
    flex: 1;
    background: rgba(0, 0, 0, 0.04);
    color: var(--primary-title, #111b21);
    border: 1px solid var(--border-panel, rgba(0,0,0,0.08));
    padding: 10px;
    border-radius: 8px;
    font-weight: 600;
    cursor: pointer;
    font-size: 13px;
    outline: none;
  `;
  if (document.body.classList.contains('dark')) {
    closeBtn.style.background = 'rgba(255,255,255,0.05)';
    closeBtn.style.color = '#e9edef';
    closeBtn.style.borderColor = '#3b4a54';
  }

  dlBtn.onclick = () => {
    const format = card.querySelector('#wame-screen-fmt-txt').checked ? 'txt' : 'csv';
    const limitType = select.value;
    const fromDate = limitType === 'date' ? card.querySelector('#wame-screen-from').value : null;
    const toDate = limitType === 'date' ? card.querySelector('#wame-screen-to').value : null;
    
    overlay.parentNode.removeChild(overlay);
    executeDownload({ format, limitType, fromDate, toDate });
  };

  closeBtn.onclick = () => {
    overlay.parentNode.removeChild(overlay);
  };

  btnRow.appendChild(closeBtn);
  btnRow.appendChild(dlBtn);
  card.appendChild(btnRow);
  card.appendChild(createBervosFooter());
  overlay.appendChild(card);
  document.body.appendChild(overlay);
  
  updateFmtLabels();
}

// Injects the quick-download button into the header bar
function checkAndInjectButton() {
  const header = document.querySelector('#main header');
  if (!header) return;

  // Locate the native buttons container in header (usually siblings of Menu/Search)
  const anchorMenu = header.querySelector('[data-testid="conversation-menu-button"]') || 
                     header.querySelector('[data-testid="menu"]') ||
                     header.querySelector('[aria-label="Menu"]');
  if (!anchorMenu) return;

  const buttonsContainer = anchorMenu.parentElement;
  if (!buttonsContainer) return;

  // If button already exists, update its click listener to the newly injected closure
  const existingBtn = buttonsContainer.querySelector('.wame-download-btn');
  if (existingBtn) {
    existingBtn.onclick = () => {
      showScreenOptionsDialog();
    };
    return;
  }

  // Prevent parent container wrapping (ensures Search, Download, and Menu stay in one horizontal line)
  buttonsContainer.style.flexWrap = 'nowrap';
  buttonsContainer.style.display = 'flex';
  buttonsContainer.style.alignItems = 'center';

  const btn = document.createElement('div');
  btn.className = 'wame-download-btn';
  btn.setAttribute('role', 'button');
  btn.setAttribute('title', 'Download Chat Options');
  btn.setAttribute('aria-label', 'Download Chat Options');
  btn.style.cssText = `
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    padding: 8px;
    border-radius: 50%;
    width: 40px;
    height: 40px;
    box-sizing: border-box;
    margin: 0;
    transition: background-color 0.15s;
  `;

  // Copy SVG icon style classes from other buttons in the header to match animations/paddings
  const sibling = buttonsContainer.querySelector('[role="button"]');
  if (sibling) {
    sibling.classList.forEach((cls) => {
      if (cls !== 'wame-download-btn') btn.classList.add(cls);
    });
  }

  // Draw modern SVG Download icon matching Whatsapp Web icon colors
  btn.innerHTML = `
    <span>
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--icon-primary, #54656f);">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
        <polyline points="7 10 12 15 17 10"></polyline>
        <line x1="12" y1="15" x2="12" y2="3"></line>
      </svg>
    </span>
  `;

  // Clicking header button opens the interactive download dialog
  btn.onclick = () => {
    showScreenOptionsDialog();
  };

  // Insert button right before the chat menu button
  buttonsContainer.insertBefore(btn, anchorMenu);
}

// Listen for download queries from the extension popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "start-download") {
    executeDownload(message.options)
      .then(() => sendResponse({ success: true }))
      .catch((err) => sendResponse({ success: false, error: err.toString() }));
    return true; // Keep connection open for async response
  }
});

// Watch DOM mutations to auto-inject button on page load or active chat switches
if (window.wameObserver) {
  window.wameObserver.disconnect();
}
window.wameObserver = new MutationObserver(() => {
  checkAndInjectButton();
});
window.wameObserver.observe(document.body, {
  childList: true,
  subtree: true
});

// Run initial check
checkAndInjectButton();
})();

