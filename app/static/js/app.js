/* global dayjs, dayjs_plugin_utc */

(() => {
  if (typeof dayjs !== "undefined" && typeof dayjs_plugin_utc !== "undefined") {
    dayjs.extend(dayjs_plugin_utc);
  }

  const STORAGE_KEY = "countdown-target";
  const RESYNC_INTERVAL_MS = 5 * 60 * 1000;

  const bootstrapEl = document.getElementById("app-bootstrap");
  const bootstrapData = bootstrapEl
    ? JSON.parse(bootstrapEl.textContent || "{}")
    : {};

  let clockOffsetMs =
    typeof bootstrapData.serverNowUtcMs === "number"
      ? Date.now() - bootstrapData.serverNowUtcMs
      : 0;

  const selectors = {
    form: document.getElementById("countdown-form"),
    labelInput: document.getElementById("event-label"),
    datetimeInput: document.getElementById("target-datetime"),
    error: document.getElementById("form-error"),
    status: document.getElementById("status-message"),
    countdownLabel: document.getElementById("active-label"),
    resetBtn: document.getElementById("reset-button"),
    unitDays: document.querySelector("[data-unit='days']"),
    unitHours: document.querySelector("[data-unit='hours']"),
    unitMinutes: document.querySelector("[data-unit='minutes']"),
    unitSeconds: document.querySelector("[data-unit='seconds']"),
    storageWarning: document.getElementById("storage-warning"),
  };

  const state = {
    targetMs: null,
    label: "",
    rafId: null,
    fallbackIntervalId: null,
    resyncIntervalId: null,
    lastRenderedSecond: null,
    active: false,
    storageAvailable: true,
  };

  function currentUtcMs() {
    return Date.now() - clockOffsetMs;
  }

  function clearError() {
    if (selectors.error) {
      selectors.error.textContent = "";
      selectors.error.hidden = true;
    }
  }

  function showError(text) {
    if (selectors.error) {
      selectors.error.textContent = text;
      selectors.error.hidden = false;
    }
  }

  function showStorageWarning() {
    if (selectors.storageWarning) {
      selectors.storageWarning.hidden = false;
    }
  }

  function markStorageUnavailable() {
    if (!state.storageAvailable) {
      return;
    }
    state.storageAvailable = false;
    showStorageWarning();
  }

  function storageWrite(payload) {
    if (!state.storageAvailable) {
      return;
    }
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      markStorageUnavailable();
    }
  }

  function storageClear() {
    if (!state.storageAvailable) {
      return;
    }
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      markStorageUnavailable();
    }
  }

  function announceStatus(message) {
    if (selectors.status) {
      selectors.status.textContent = message;
    }
  }

  function formatUnit(value) {
    return String(value).padStart(2, "0");
  }

  function updateCountdownView(diffMs) {
    const totalSeconds = Math.max(0, Math.floor(diffMs / 1000));
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (selectors.unitDays) selectors.unitDays.textContent = formatUnit(days);
    if (selectors.unitHours) selectors.unitHours.textContent = formatUnit(hours);
    if (selectors.unitMinutes)
      selectors.unitMinutes.textContent = formatUnit(minutes);
    if (selectors.unitSeconds)
      selectors.unitSeconds.textContent = formatUnit(seconds);
  }

  function stopTicker() {
    if (state.rafId) {
      cancelAnimationFrame(state.rafId);
      state.rafId = null;
    }
    if (state.fallbackIntervalId) {
      clearInterval(state.fallbackIntervalId);
      state.fallbackIntervalId = null;
    }
  }

  function cancelResync() {
    if (state.resyncIntervalId) {
      clearInterval(state.resyncIntervalId);
      state.resyncIntervalId = null;
    }
  }

  function handleServerSync(serverNowUtcMs) {
    clockOffsetMs = Date.now() - serverNowUtcMs;
    state.lastRenderedSecond = null;
    if (state.active) {
      tick();
    }
  }

  async function fetchServerTime() {
    try {
      const response = await fetch("/api/time", { cache: "no-store" });
      if (!response.ok) {
        return;
      }
      const data = await response.json();
      if (typeof data.serverNowUtcMs === "number") {
        handleServerSync(data.serverNowUtcMs);
      }
    } catch (error) {
      // Network failures are non-fatal; continue using current offset.
    }
  }

  function scheduleResync() {
    cancelResync();
    state.resyncIntervalId = window.setInterval(
      fetchServerTime,
      RESYNC_INTERVAL_MS
    );
  }

  function stopCountdown(options = {}) {
    const { timeReached = false, skipStorage = false } = options;
    stopTicker();
    cancelResync();
    state.active = false;
    state.targetMs = null;
    state.label = "";
    state.lastRenderedSecond = null;
    updateCountdownView(0);

    if (!skipStorage) {
      storageClear();
    }

    if (selectors.countdownLabel) {
      selectors.countdownLabel.textContent = "";
    }

    announceStatus(
      timeReached
        ? "Time's up! Set a new countdown to keep things moving."
        : "Countdown cleared."
    );
  }

  function tick() {
    if (!state.active || typeof state.targetMs !== "number") {
      return;
    }

    const nowUtc = currentUtcMs();
    const diffMs = state.targetMs - nowUtc;

    const currentSecond = Math.floor(nowUtc / 1000);
    if (state.lastRenderedSecond !== currentSecond) {
      state.lastRenderedSecond = currentSecond;
      updateCountdownView(diffMs);
    }

    if (diffMs <= 0) {
      stopCountdown({ timeReached: true });
      return;
    }

    state.rafId = requestAnimationFrame(tick);
  }

  function startTicker() {
    stopTicker();
    state.lastRenderedSecond = null;
    state.rafId = requestAnimationFrame(tick);
    state.fallbackIntervalId = window.setInterval(tick, 1000);
  }

  function setCountdownLabel(text) {
    if (selectors.countdownLabel) {
      selectors.countdownLabel.textContent =
        text && text.length > 0 ? text : "Countdown in progress";
    }
  }

  function startCountdown(targetIso, label, options = {}) {
    const { persist = true, resumed = false } = options;
    const target = dayjs.utc(targetIso);
    if (!target.isValid()) {
      showError("Please provide a valid date and time.");
      return;
    }

    const targetMs = target.valueOf();
    const nowUtc = currentUtcMs();

    if (targetMs <= nowUtc) {
      showError("Choose a future date and time to begin the countdown.");
      return;
    }

    clearError();
    state.targetMs = targetMs;
    state.label = label;
    state.active = true;

    if (persist) {
      storageWrite({ targetIso, label });
    }

    setCountdownLabel(label);

    const announcement = resumed ? "Countdown resumed." : "Countdown running.";
    announceStatus(announcement);

    startTicker();
    scheduleResync();
  }

  function handleFormSubmit(event) {
    event.preventDefault();

    const label = selectors.labelInput
      ? selectors.labelInput.value.trim()
      : "";
    const rawDateValue = selectors.datetimeInput
      ? selectors.datetimeInput.value
      : "";

    if (!rawDateValue) {
      showError("Enter a target date and time to continue.");
      return;
    }

    const parsed = dayjs(rawDateValue);
    if (!parsed.isValid()) {
      showError("Please provide a valid date and time.");
      return;
    }

    const isoValue = parsed.utc().toISOString();
    startCountdown(isoValue, label);
  }

  function handleResetClick() {
    stopCountdown({ timeReached: false });
    if (selectors.form) {
      selectors.form.reset();
    }
  }

  function hydrateFromStorage() {
    if (!state.storageAvailable) {
      return false;
    }
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return false;
      }
      const saved = JSON.parse(raw);
      if (!saved || typeof saved.targetIso !== "string") {
        storageClear();
        return false;
      }

      const target = dayjs.utc(saved.targetIso);
      if (!target.isValid()) {
        storageClear();
        return false;
      }
      if (target.valueOf() <= currentUtcMs()) {
        storageClear();
        return false;
      }

      if (selectors.labelInput) {
        selectors.labelInput.value = saved.label || "";
      }
      if (selectors.datetimeInput) {
        selectors.datetimeInput.value = target
          .local()
          .format("YYYY-MM-DDTHH:mm");
      }

      startCountdown(saved.targetIso, saved.label || "", {
        persist: false,
        resumed: true,
      });
      return true;
    } catch (error) {
      markStorageUnavailable();
      return false;
    }
  }

  function handleFocus() {
    fetchServerTime();
    if (state.active) {
      state.lastRenderedSecond = null;
      tick();
    }
  }

  function init() {
    if (selectors.form) {
      selectors.form.addEventListener("submit", handleFormSubmit);
    }
    if (selectors.resetBtn) {
      selectors.resetBtn.addEventListener("click", handleResetClick);
    }

    if (selectors.storageWarning) {
      selectors.storageWarning.hidden = true;
    }

    clearError();
    updateCountdownView(0);

    const resumed = hydrateFromStorage();
    if (!resumed) {
      announceStatus("Set a target date to begin.");
    }

    fetchServerTime();
    window.addEventListener("focus", handleFocus);
  }

  init();
})();
