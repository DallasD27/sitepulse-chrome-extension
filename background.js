let currentTabId = null;
let currentDomain = null;
let startTime = null;
let intervalId = null;

function getDomain(url) {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return null;
  }
}

function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

async function getTrackedSites() {
  const result = await chrome.storage.local.get("trackedSites");
  return result.trackedSites || [];
}

async function saveTime(domain, milliseconds) {
  if (!domain || milliseconds <= 0) return;

  const today = getTodayKey();
  const result = await chrome.storage.local.get("timeLogs");
  const timeLogs = result.timeLogs || {};

  if (!timeLogs[today]) {
    timeLogs[today] = {};
  }

  if (!timeLogs[today][domain]) {
    timeLogs[today][domain] = 0;
  }

  timeLogs[today][domain] += milliseconds;

  await chrome.storage.local.set({ timeLogs });
}

function clearTrackingInterval() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function startTrackingInterval() {
  clearTrackingInterval();

  intervalId = setInterval(async () => {
    if (!currentDomain || !startTime) return;

    const now = Date.now();
    const elapsed = now - startTime;
    startTime = now;

    await saveTime(currentDomain, elapsed);
  }, 1000);
}

async function stopTracking() {
  clearTrackingInterval();
  currentTabId = null;
  currentDomain = null;
  startTime = null;
}

async function startTracking(tabId, url) {
  const domain = getDomain(url);
  if (!domain) return;

  const trackedSites = await getTrackedSites();

  if (!trackedSites.includes(domain)) {
    await stopTracking();
    return;
  }

  if (currentTabId === tabId && currentDomain === domain) {
    return;
  }

  await stopTracking();

  currentTabId = tabId;
  currentDomain = domain;
  startTime = Date.now();
  startTrackingInterval();
}

async function handleTabChange(tabId) {
  try {
    const tab = await chrome.tabs.get(tabId);

    if (!tab.active || !tab.url) {
      await stopTracking();
      return;
    }

    await startTracking(tabId, tab.url);
  } catch {
    await stopTracking();
  }
}

chrome.tabs.onActivated.addListener(async (activeInfo) => {
  await handleTabChange(activeInfo.tabId);
});

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (tab.active && changeInfo.url) {
    await startTracking(tabId, changeInfo.url);
  }
});

chrome.windows.onFocusChanged.addListener(async (windowId) => {
  if (windowId === chrome.windows.WINDOW_ID_NONE) {
    await stopTracking();
    return;
  }

  const tabs = await chrome.tabs.query({ active: true, windowId });
  if (tabs.length > 0) {
    await startTracking(tabs[0].id, tabs[0].url);
  }
});

chrome.runtime.onInstalled.addListener(async () => {
  const result = await chrome.storage.local.get(["trackedSites", "timeLogs"]);

  if (!result.trackedSites) {
    await chrome.storage.local.set({
      trackedSites: ["youtube.com", "github.com"]
    });
  }

  if (!result.timeLogs) {
    await chrome.storage.local.set({
      timeLogs: {}
    });
  }
});