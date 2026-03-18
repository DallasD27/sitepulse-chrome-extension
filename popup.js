function getTodayKey() {
  return new Date().toISOString().split("T")[0];
}

function formatTime(milliseconds) {
  const totalSeconds = Math.floor(milliseconds / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `${hours}h ${minutes}m ${seconds}s`;
}

function getLast7Days() {
  const days = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push(date.toISOString().split("T")[0]);
  }

  return days;
}

async function loadTrackedSites() {
  const result = await chrome.storage.local.get("trackedSites");
  const trackedSites = result.trackedSites || [];
  const siteList = document.getElementById("siteList");

  siteList.innerHTML = "";

  if (trackedSites.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "No sites added yet.";
    siteList.appendChild(li);
    return;
  }

  trackedSites.forEach((site) => {
    const li = document.createElement("li");

    const span = document.createElement("span");
    span.textContent = site;

    const button = document.createElement("button");
    button.textContent = "Remove";
    button.className = "remove-btn";
    button.addEventListener("click", async () => {
      const updatedSites = trackedSites.filter((s) => s !== site);
      await chrome.storage.local.set({ trackedSites: updatedSites });
    });

    li.appendChild(span);
    li.appendChild(button);
    siteList.appendChild(li);
  });
}

async function loadTodayTime() {
  const result = await chrome.storage.local.get("timeLogs");
  const timeLogs = result.timeLogs || {};
  const today = getTodayKey();
  const todayLogs = timeLogs[today] || {};
  const timeList = document.getElementById("timeList");

  timeList.innerHTML = "";

  const entries = Object.entries(todayLogs).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "No tracked time yet today.";
    timeList.appendChild(li);
    return;
  }

  entries.forEach(([site, time]) => {
    const li = document.createElement("li");

    const siteSpan = document.createElement("span");
    siteSpan.textContent = site;

    const timeSpan = document.createElement("span");
    timeSpan.textContent = formatTime(time);

    li.appendChild(siteSpan);
    li.appendChild(timeSpan);
    timeList.appendChild(li);
  });
}

async function loadWeeklyTime() {
  const result = await chrome.storage.local.get("timeLogs");
  const timeLogs = result.timeLogs || {};
  const weeklyList = document.getElementById("weeklyList");
  const last7Days = getLast7Days();
  const weeklyTotals = {};

  weeklyList.innerHTML = "";

  last7Days.forEach((day) => {
    const dayLogs = timeLogs[day] || {};

    Object.entries(dayLogs).forEach(([site, time]) => {
      if (!weeklyTotals[site]) {
        weeklyTotals[site] = 0;
      }
      weeklyTotals[site] += time;
    });
  });

  const entries = Object.entries(weeklyTotals).sort((a, b) => b[1] - a[1]);

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-state";
    li.textContent = "No tracked time yet this week.";
    weeklyList.appendChild(li);
    return;
  }

  entries.forEach(([site, time]) => {
    const li = document.createElement("li");

    const siteSpan = document.createElement("span");
    siteSpan.textContent = site;

    const timeSpan = document.createElement("span");
    timeSpan.textContent = formatTime(time);

    li.appendChild(siteSpan);
    li.appendChild(timeSpan);
    weeklyList.appendChild(li);
  });
}

document.getElementById("addSiteBtn").addEventListener("click", async () => {
  const input = document.getElementById("siteInput");
  let newSite = input.value.trim().toLowerCase();

  newSite = newSite.replace(/^https?:\/\//, "").replace(/^www\./, "").split("/")[0];

  if (!newSite) return;

  const result = await chrome.storage.local.get("trackedSites");
  const trackedSites = result.trackedSites || [];

  if (!trackedSites.includes(newSite)) {
    trackedSites.push(newSite);
    await chrome.storage.local.set({ trackedSites });
  }

  input.value = "";
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== "local") return;

  if (changes.trackedSites) {
    loadTrackedSites();
  }

  if (changes.timeLogs) {
    loadTodayTime();
    loadWeeklyTime();
  }
});

document.addEventListener("DOMContentLoaded", async () => {
  await loadTrackedSites();
  await loadTodayTime();
  await loadWeeklyTime();
});