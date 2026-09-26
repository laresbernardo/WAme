// JavaScript for WAme Chat Downloader Popup Dashboard

document.addEventListener("DOMContentLoaded", async () => {
  // Elements
  const pluginVersionEl = document.getElementById("plugin-version");
  const limitTypeSelect = document.getElementById("limit-type");
  const datePickerArea = document.getElementById("date-picker-area");
  const fromDateInput = document.getElementById("from-date");
  const toDateInput = document.getElementById("to-date");
  const downloadBtn = document.getElementById("btn-download");
  const statusDisplay = document.getElementById("status-display");

  // 1. Initialize Dynamic Version Label
  try {
    const manifest = chrome.runtime.getManifest();
    pluginVersionEl.textContent = `v${manifest.version}`;
  } catch (err) {
    pluginVersionEl.textContent = "v0.0.1";
  }

  // 2. Pre-populate Date Picker Values (Default: past 7 days)
  const today = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(today.getDate() - 7);

  // Format defaults as local calendar days; toISOString() is UTC and can shift
  // the day depending on the user's timezone.
  fromDateInput.value = wameToLocalISODate(sevenDaysAgo);
  toDateInput.value = wameToLocalISODate(today);

  // 3. Conditional Date Range View rendering
  limitTypeSelect.addEventListener("change", () => {
    if (limitTypeSelect.value === "date") {
      datePickerArea.style.display = "grid";
    } else {
      datePickerArea.style.display = "none";
    }
  });

  // Helper to display status banner messages
  function showStatus(message, type = "info") {
    statusDisplay.textContent = message;
    statusDisplay.className = `status-banner status-${type}`;
    statusDisplay.style.display = "block";
  }

  function hideStatus() {
    statusDisplay.style.display = "none";
  }

  // 4. Validate Active Tab & Bind Button Click Handler
  downloadBtn.addEventListener("click", async () => {
    hideStatus();
    downloadBtn.disabled = true;

    try {
      // Get the currently focused tab in current window
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      if (!activeTab || !activeTab.url) {
        showStatus("Could not determine active tab.", "error");
        downloadBtn.disabled = false;
        return;
      }

      // Check if user is on WhatsApp Web
      const url = new URL(activeTab.url);
      if (url.hostname !== "web.whatsapp.com") {
        showStatus("Please navigate to web.whatsapp.com to use this downloader.", "error");
        downloadBtn.disabled = false;
        return;
      }

      // Gather form settings
      const format = document.querySelector('input[name="format"]:checked').value;
      const limitType = limitTypeSelect.value;
      const fromDate = limitType === "date" ? fromDateInput.value : null;
      const toDate = limitType === "date" ? toDateInput.value : null;

      showStatus("Initiating download flow in WhatsApp tab...", "info");

      // Dispatch request to content script running in the active tab
      const sendMessageToTab = (tabId, msg) => {
        return new Promise((resolve, reject) => {
          chrome.tabs.sendMessage(tabId, msg, (response) => {
            if (chrome.runtime.lastError) {
              reject(chrome.runtime.lastError);
            } else {
              resolve(response);
            }
          });
        });
      };

      const handleResponse = (response) => {
        if (response && response.success) {
          showStatus("Download started successfully!", "success");
          setTimeout(() => {
            hideStatus();
            downloadBtn.disabled = false;
            // Close popup window upon successful trigger
            window.close();
          }, 1500);
        } else {
          const errMsg = response?.error || "Unknown error occurred.";
          showStatus(`Failed: ${errMsg}`, "error");
          downloadBtn.disabled = false;
        }
      };

      const msgPayload = {
        action: "start-download",
        options: { format, limitType, fromDate, toDate }
      };

      try {
        const response = await sendMessageToTab(activeTab.id, msgPayload);
        handleResponse(response);
      } catch (err) {
        console.warn("Initial connection failed. Attempting to programmatically inject content script...", err.message);
        try {
          // Dynamically inject content.js using scripting API
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ["content.js"]
          });
          // Wait a short time for initialization
          await new Promise(resolve => setTimeout(resolve, 250));
          // Retry message
          const response = await sendMessageToTab(activeTab.id, msgPayload);
          handleResponse(response);
        } catch (retryErr) {
          console.warn("WAme Popup Connection Warning (context disconnected):", retryErr.message);
          showStatus(
            "Connection failed. Please refresh WhatsApp Web page and try again.",
            "error"
          );
          downloadBtn.disabled = false;
        }
      }
    } catch (error) {
      console.warn("WAme Popup Click Error:", error);
      showStatus(`Error: ${error.message}`, "error");
      downloadBtn.disabled = false;
    }
  });

  // Check initial state: disable button if not on WhatsApp Web
  try {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (activeTab && activeTab.url) {
      const url = new URL(activeTab.url);
      if (url.hostname !== "web.whatsapp.com") {
        showStatus("Open WhatsApp Web to enable downloading.", "info");
        downloadBtn.disabled = true;
      }
    }
  } catch (e) {
    // Fail silently in case tabs cannot be queried on startup
  }
});

