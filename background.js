// Service worker (background.js) for WAme Chat Downloader

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "download") {
    (async () => {
      try {
        const { content, filename } = message;
        
        // Convert the content string to base64 safely supporting UTF-8 characters
        const base64Data = btoa(unescape(encodeURIComponent(content)));
        const isCsv = filename.toLowerCase().endsWith(".csv");
        const mimeType = isCsv ? "text/csv" : "text/plain";
        const dataUrl = `data:${mimeType};charset=utf-8;base64,${base64Data}`;
        
        // Trigger download via chrome.downloads API
        await chrome.downloads.download({
          url: dataUrl,
          filename: filename,
          saveAs: true
        });
        
        sendResponse({ success: true });
      } catch (error) {
        console.error("WAme Background: Download failed", error);
        sendResponse({ success: false, error: error.toString() });
      }
    })();
    return true; // Keep the messaging channel open for asynchronous sendResponse
  }
});
