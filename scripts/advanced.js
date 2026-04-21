// ==UserScript==
// @name         TypingClub AutoTyper
// @namespace    https://typingclub.com/
// @version      1.0.2
// @description  Automates TypingClub lessons with human-like typing and WPM/accuracy control.
// @author       https://github.com/1mpactin9/AutoTyper
// @match        *://*.typingclub.com/*
// @match        *://*.edclub.com/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function () {
  "use strict";
  const EXECUTABLE_SELECTORS = new Set([
    "cmn-code",
    "cmn-definition",
    "cmn-drum",
    "cmn-guide2",
    "cmn-practice",
    "cmn-tip",
    "cmn-travel1",
    "qwerty-caps",
    "qwerty-symbols3",
    "qwerty-z",
    "qwerty-numbers",
  ]);

  const state = {
    running: false,
    queue: [],
    scrapeData: {},
    currentLessonIdx: 0,
    abortController: null,
    scriptNavigating: false,
    liveConfig: null,
    completedLessons: new Set(),
  };

  function log(level, message) {
    console.log(`[AutoTyper] [${level}] ${message}`);
  }

  function detectPage() {
    if (document.querySelector(".lparena")) return "MENU";
    if (document.querySelector(".LPVIDEO")) return "VIDEO";
    if (document.getElementById("instruction")) return "UNEXECUTABLE_1";
    if (document.querySelector(".TPGAME")) return "GAME";
    if (
      document.querySelector(".TP_APP1.TPCMN") ||
      document.body.classList.contains("theme-codder")
    ) {
      if (document.querySelector(".classic-typing-container"))
        return "EXECUTABLE";
      return "UNEXECUTABLE_2";
    }
    if (document.querySelector(".stars-box")) return "RESULTS";
    return "UNKNOWN";
  }

  function isMenuPage() {
    return detectPage() === "MENU";
  }
  function isResultsPage() {
    return detectPage() === "RESULTS" || !!document.querySelector(".stars-box");
  }

  function getLessonExecutability(boxEl) {
    const icon = boxEl.querySelector(".lesson_icon");
    if (!icon) return false;
    const classes = Array.from(icon.classList);
    const eClass = classes.find((c) => c.startsWith("e-"));
    if (!eClass) return false;
    const base = eClass.split("-")[1];
    const specificClass = classes.find(
      (c) => c.startsWith(`${base}-`) && c !== eClass,
    );
    if (!specificClass) return false;
    const key = specificClass.replace(`${base}-`, "");
    const fullKey = `${base}-${key}`;
    for (const exec of EXECUTABLE_SELECTORS) {
      if (
        fullKey === exec ||
        specificClass.includes(exec.split("-").slice(1).join("-"))
      )
        return true;
    }
    return false;
  }

  function scrapeLessons(minLesson, maxLesson, redoThreshold) {
    const boxes = document.querySelectorAll(".box");
    const results = {};

    Array.from(boxes).forEach((box, index) => {
      const numEl = box.querySelector(".lsn_num");
      const num = numEl ? parseInt(numEl.textContent.trim()) : index + 1;
      if (isNaN(num) || num < minLesson || num > maxLesson) return;

      const name =
        box.querySelector(".lsn_name")?.textContent.trim() || "Unknown";
      const starsEl = box.querySelector(".stars");
      const hasSilver = !!box.querySelector(".platinum-star");
      const isCompletedCheck = !!box.querySelector(".completion-check");
      const hasProgress = box.parentElement?.classList.contains("has_progress");

      let starRating = null;
      let completed = false;

      if (hasSilver) {
        starRating = 6;
        completed = true;
      } else if (starsEl) {
        const match = starsEl.className.match(/stars-(\d)/);
        if (match) {
          const val = parseInt(match[1]);
          if (val > 0) {
            starRating = val;
            completed = true;
          } else if (isCompletedCheck || hasProgress) {
            starRating = 0;
            completed = true;
          }
        }
      } else if (isCompletedCheck || hasProgress) {
        starRating = 0;
        completed = true;
      }

      const executable = getLessonExecutability(box);
      results[num] = { name, star: starRating, completed, executable };
    });

    const queue = [];
    Object.entries(results).forEach(([numStr, data]) => {
      const num = parseInt(numStr);
      if (!data.executable) return;
      if (!data.completed) {
        queue.push(num);
        return;
      }
      if (redoThreshold === 6) {
        queue.push(num);
        return;
      }
      if (redoThreshold === 0) return;
      if (data.star !== null && data.star < redoThreshold) {
        queue.push(num);
        return;
      }
    });

    queue.sort((a, b) => a - b);
    state.scrapeData = results;
    return queue;
  }
  function goToMenu() {
    if (isMenuPage()) return true;
    state.scriptNavigating = true;
    const menuBtn = document.querySelector(".menu-btn");
    if (menuBtn) {
      menuBtn.click();
      setTimeout(() => {
        state.scriptNavigating = false;
      }, 500);
      return true;
    }
    const match = location.href.match(
      /^(https?:\/\/[^/]+\/sportal\/program-\d+)/,
    );
    if (match) {
      location.href = match[1] + ".game";
      return true;
    }
    state.scriptNavigating = false;
    return false;
  }

  function clickLesson(num) {
    const arena = document.querySelector(".lparena");
    if (!arena) return false;
    const numElements = Array.from(arena.querySelectorAll(".lsn_num"));
    const target = numElements.find(
      (el) => el.innerText.trim() === String(num),
    );
    if (!target) return false;
    const box = target.closest(".box-container") || target.closest(".box");
    if (!box) return false;
    box.click();
    return true;
  }

  const ALPHABET = "abcdefghijklmnopqrstuvwxyz";

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function getRandomWrongChar(correctChar) {
    let c = ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
    return c === correctChar ? (c === "a" ? "b" : "a") : c;
  }

  function getChars() {
    return Array.from(
      document.querySelectorAll(".token span.token_unit"),
      (el) => {
        if (
          el.firstChild?.classList?.contains("_enter") ||
          el.classList.contains("_enter")
        )
          return "\n";
        const char = el.textContent[0];
        return char === "\u00A0" ? " " : char;
      },
    );
  }

  function typeChar(inputField, char) {
    inputField.focus();
    const isEnter = char === "\n";
    const isSpace = char === " ";
    const isBackspace = char === "Backspace";

    const eventKey = isEnter ? "Enter" : isSpace ? " " : char;
    const eventCode = isEnter
      ? "Enter"
      : isSpace
        ? "Space"
        : isBackspace
          ? "Backspace"
          : `Key${char.toUpperCase()}`;
    const eventKeyCode = isEnter
      ? 13
      : isSpace
        ? 32
        : isBackspace
          ? 8
          : char.charCodeAt(0);

    const opts = {
      key: eventKey,
      code: eventCode,
      keyCode: eventKeyCode,
      which: eventKeyCode,
      bubbles: true,
      cancelable: true,
    };
    inputField.dispatchEvent(new KeyboardEvent("keydown", opts));

    if (!isEnter) {
      const nativeSetter = Object.getOwnPropertyDescriptor(
        window.HTMLInputElement.prototype,
        "value",
      )?.set;
      const newValue = isBackspace
        ? inputField.value.slice(0, -1)
        : inputField.value + char;
      if (nativeSetter) {
        nativeSetter.call(inputField, newValue);
      } else {
        inputField.value = newValue;
      }
      inputField.dispatchEvent(
        new InputEvent("input", {
          data: isBackspace ? null : char,
          inputType: isBackspace ? "deleteContentBackward" : "insertText",
          bubbles: true,
        }),
      );
    }

    inputField.dispatchEvent(new KeyboardEvent("keyup", opts));
  }

  async function runTypingSession(cfg, abortSignal) {
    const inputField =
      document.querySelector('input[aria-hidden="true"]') ||
      document.activeElement;
    if (!inputField) return false;

    const characters = getChars();
    if (characters.length === 0) return false;

    const N = characters.length;
    const liveCfg = getConfig();
    const fakeValid = Math.floor((liveCfg.fakeAccuracy / 100) * N);
    const realValid = Math.min(
      Math.floor((liveCfg.realAccuracy / 100) * N),
      fakeValid,
    );

    const actions = [
      ...Array(realValid).fill("A"),
      ...Array(N - fakeValid).fill("B"),
      ...Array(fakeValid - realValid).fill("C"),
    ];
    for (let i = actions.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [actions[i], actions[j]] = [actions[j], actions[i]];
    }

    const sequence = [];
    let totalWeight = 0;
    for (let i = 0; i < N; i++) {
      const char = characters[i];
      if (actions[i] === "A") {
        sequence.push({ char, w: 1 });
        totalWeight += 1;
      } else if (actions[i] === "B") {
        sequence.push({ char: getRandomWrongChar(char), w: 1 });
        totalWeight += 1;
      } else {
        sequence.push({ char: getRandomWrongChar(char), w: 0.8 });
        sequence.push({ char: "Backspace", w: 0.4 });
        sequence.push({ char, w: 1.5 });
        totalWeight += 2.7;
      }
    }

    const getTargetDuration = () => {
      const cfg = getConfig();
      return (realValid * 12000) / cfg.wpm;
    };

    let expectedTime = Date.now();

    for (let i = 0; i < sequence.length; i++) {
      if (abortSignal?.aborted) return false;

      if (i === 0) {
        expectedTime = Date.now();
      } else {
        const targetDurationMs = getTargetDuration();
        const delay =
          (sequence[i].w / totalWeight) *
          targetDurationMs *
          (1 + (Math.random() * 0.4 - 0.2));
        expectedTime += delay;
        const wait = expectedTime - Date.now();
        if (wait > 0) await sleep(wait);
      }

      typeChar(inputField, sequence[i].char);
    }

    return true;
  }

  function scrapeResults() {
    const text = document.querySelector(".TP_APP1.TPCMN")?.innerText || "";
    if (!text) return null;
    const getMatch = (regex, idx = 1) =>
      (text.match(regex) || [])[idx] || "N/A";
    return {
      stars: getMatch(/earned (\d+) stars/i),
      wpm: getMatch(/speed of (\d+) wpm/i),
    };
  }

  function waitForPage(pageType, timeoutMs = 20000) {
    return new Promise((resolve, reject) => {
      if (detectPage() === pageType) return resolve();
      const obs = new MutationObserver(() => {
        if (detectPage() === pageType) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
      });
      setTimeout(() => {
        obs.disconnect();
        reject(new Error(`Timeout waiting for page: ${pageType}`));
      }, timeoutMs);
    });
  }

  function waitForResults(timeoutMs = 60000) {
    return new Promise((resolve, reject) => {
      if (isResultsPage()) return resolve();
      const obs = new MutationObserver(() => {
        if (isResultsPage()) {
          obs.disconnect();
          resolve();
        }
      });
      obs.observe(document.body, { childList: true, subtree: true });
      setTimeout(() => {
        obs.disconnect();
        reject(new Error("Timeout waiting for results page"));
      }, timeoutMs);
    });
  }

  async function runAutomation() {
    const cfg = getConfig();
    state.abortController = new AbortController();
    const sig = state.abortController.signal;

    for (let i = state.currentLessonIdx; i < state.queue.length; i++) {
      if (sig.aborted || !state.running) break;
      state.currentLessonIdx = i;

      const lessonNum = state.queue[i];
      updateStatusBadge(i);

      const currentPage = detectPage();
      let pageType;
      if (currentPage === "EXECUTABLE") {
        pageType = "EXECUTABLE";
      } else {
        if (!isMenuPage()) {
          goToMenu();
          try {
            await waitForPage("MENU", 15000);
          } catch {
            break;
          }
          await sleep(800);
        }

        const clicked = clickLesson(lessonNum);
        if (!clicked) {
          continue;
        }

        await sleep(2000);
        await new Promise((r) => setTimeout(r, 1000));
        pageType = detectPage();
      }

      if (pageType !== "EXECUTABLE") {
        removeFromQueueTextarea(lessonNum);
        continue;
      }

      const success = await runTypingSession(cfg, sig);
      if (!success) {
        if (!state.running) break;
        continue;
      }

      try {
        await waitForResults(90000);
      } catch {
        continue;
      }

      await sleep(1500);
      state.completedLessons.add(lessonNum);
      removeFromQueueTextarea(lessonNum);

      const nextLesson = state.queue[i + 1];
      if (nextLesson && nextLesson === lessonNum + 1) {
        await sleep(600);
        document.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
          }),
        );
        document.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: "Enter",
            code: "Enter",
            keyCode: 13,
            bubbles: true,
          }),
        );
        const transitioned = await new Promise((resolve) => {
          const start = Date.now();
          const check = setInterval(() => {
            const pg = detectPage();
            if (
              pg === "EXECUTABLE" ||
              pg === "MENU" ||
              pg === "VIDEO" ||
              pg === "GAME" ||
              pg === "UNEXECUTABLE_1" ||
              pg === "UNEXECUTABLE_2"
            ) {
              clearInterval(check);
              resolve(pg);
            }
            if (Date.now() - start > 8000) {
              clearInterval(check);
              resolve(null);
            }
          }, 200);
        });
        if (!transitioned || transitioned === "MENU") {
          if (!transitioned) {
            goToMenu();
            try {
              await waitForPage("MENU", 15000);
            } catch {
              break;
            }
          }
          await sleep(800);
        }
      } else {
        await sleep(500);
        goToMenu();
        try {
          await waitForPage("MENU", 15000);
        } catch {
          break;
        }
        await sleep(800);
      }
    }

    stopAutomation();
  }

  function stopAutomation() {
    state.running = false;
    state.abortController?.abort();
    updateStartStopBtn(false);
    updateStatusBadge(null);
  }

  function readConfigFromUI() {
    return {
      wpm: parseInt(document.getElementById("at-wpm")?.value) || 80,
      realAccuracy:
        parseFloat(document.getElementById("at-real-acc")?.value) || 100,
      fakeAccuracy:
        parseFloat(document.getElementById("at-fake-acc")?.value) || 98,
    };
  }

  function getConfig() {
    return state.liveConfig || readConfigFromUI();
  }

  function removeFromQueueTextarea(lessonNum) {
    const box = document.getElementById("at-queue-box");
    if (!box) return;
    const updated = box.value
      .split(",")
      .map((s) => parseInt(s.trim()))
      .filter((n) => !isNaN(n) && n > 0 && n !== lessonNum);
    box.value = updated.join(", ");
    updateQueueCount(updated.length);
  }

  function buildUI() {
    document.getElementById("at-panel")?.remove();

    const panel = document.createElement("div");
    panel.id = "at-panel";
    panel.innerHTML = `
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;600&display=swap');

      #at-panel {
        position: fixed;
        z-index: 2147483647;
        bottom: 28px;
        right: 28px;
        width: 300px;
        font-family: 'Inter', system-ui, sans-serif;
        font-size: 12px;
        background: rgba(10, 10, 14, 0.97);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 14px;
        box-shadow: 0 24px 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03) inset;
        color: #b0b0c0;
        overflow: hidden;
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        transition: opacity 0.2s, transform 0.2s;
      }
      #at-panel.at-collapsed { width: 160px; }
      #at-panel * { box-sizing: border-box; }

      /* ---- TITLEBAR ---- */
      #at-titlebar {
        display: flex; align-items: center; gap: 8px;
        padding: 11px 13px;
        cursor: grab;
        background: rgba(255,255,255,0.025);
        border-bottom: 1px solid rgba(255,255,255,0.06);
        user-select: none;
      }
      #at-titlebar:active { cursor: grabbing; }
      .at-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
      .at-dot-red   { background: #ff5f57; }
      .at-dot-amber { background: #ffbd2e; }
      .at-dot-green { background: #28c840; }
      #at-title-text {
        font-family: 'JetBrains Mono', monospace;
        font-size: 10px; font-weight: 600;
        letter-spacing: 1.5px; color: rgba(255,255,255,0.5);
        text-transform: uppercase; flex: 1;
      }
      #at-status-badge {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px; font-weight: 600;
        padding: 2px 6px; border-radius: 4px;
        background: rgba(124,111,255,0.15);
        color: #7c6fff; letter-spacing: 0.5px;
        display: none;
      }
      #at-status-badge.visible { display: inline-block; }
      #at-collapse-btn {
        background: none; border: none; cursor: pointer;
        color: rgba(255,255,255,0.25); font-size: 14px;
        padding: 0; line-height: 1; transition: color 0.15s;
        flex-shrink: 0;
      }
      #at-collapse-btn:hover { color: rgba(255,255,255,0.6); }

      /* ---- BODY ---- */
      #at-body {
        padding: 13px 13px 14px;
        display: flex; flex-direction: column; gap: 11px;
        transition: all 0.2s;
      }
      #at-panel.at-collapsed #at-body { display: none; }

      /* ---- START BTN ---- */
      #at-btn-start {
        width: 100%; padding: 9px;
        border: none; border-radius: 8px; cursor: pointer;
        font-family: 'Inter', sans-serif; font-size: 12px; font-weight: 600;
        letter-spacing: 0.3px;
        background: linear-gradient(135deg, #7c6fff 0%, #5548d9 100%);
        color: #fff;
        box-shadow: 0 2px 16px rgba(124,111,255,0.35);
        transition: all 0.18s;
      }
      #at-btn-start:hover { box-shadow: 0 4px 24px rgba(124,111,255,0.55); transform: translateY(-1px); }
      #at-btn-start:active { transform: translateY(0); }
      #at-btn-start.running {
        background: linear-gradient(135deg, #ff4f6f 0%, #b0263e 100%);
        box-shadow: 0 2px 16px rgba(255,79,111,0.35);
      }
      #at-btn-start.running:hover { box-shadow: 0 4px 24px rgba(255,79,111,0.55); }

      /* ---- DIVIDER ---- */
      .at-sep { height: 1px; background: rgba(255,255,255,0.055); margin: 1px 0; }

      /* ---- SECTION LABEL ---- */
      .at-section-label {
        font-size: 9px; font-weight: 600; letter-spacing: 1.2px;
        text-transform: uppercase; color: rgba(255,255,255,0.2);
        margin-bottom: -4px;
      }

      /* ---- SLIDERS ---- */
      .at-slider-group { display: flex; flex-direction: column; gap: 7px; }
      .at-slider-row { display: flex; flex-direction: column; gap: 4px; }
      .at-slider-header { display: flex; justify-content: space-between; align-items: baseline; }
      .at-slider-label {
        font-size: 10px; font-weight: 500; color: rgba(255,255,255,0.4);
      }
      .at-slider-value {
        font-family: 'JetBrains Mono', monospace;
        font-size: 11px; font-weight: 600; color: rgba(255,255,255,0.75);
        min-width: 36px; text-align: right;
      }
      .at-slider {
        -webkit-appearance: none; appearance: none;
        width: 100%; height: 3px; border-radius: 2px; outline: none; cursor: pointer;
        background: rgba(255,255,255,0.1);
        transition: background 0.2s;
      }
      .at-slider::-webkit-slider-thumb {
        -webkit-appearance: none; appearance: none;
        width: 13px; height: 13px; border-radius: 50%;
        background: #7c6fff;
        box-shadow: 0 0 0 2px rgba(124,111,255,0.3);
        cursor: grab; transition: transform 0.15s, box-shadow 0.15s;
      }
      .at-slider::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.2); }
      .at-slider::-moz-range-thumb {
        width: 13px; height: 13px; border-radius: 50%; border: none;
        background: #7c6fff; cursor: grab;
      }
      .at-slider.acc-slider::-webkit-slider-thumb { background: #06d6a0; box-shadow: 0 0 0 2px rgba(6,214,160,0.3); }
      .at-slider.acc-slider::-moz-range-thumb { background: #06d6a0; }

      /* ---- SCRAP CONTROLS ---- */
      .at-scrap-grid {
        display: grid;
        grid-template-columns: 1fr 1fr 72px;
        gap: 6px; align-items: end;
      }
      .at-field { display: flex; flex-direction: column; gap: 4px; }
      .at-field-label {
        font-size: 9px; font-weight: 600; letter-spacing: 1px;
        text-transform: uppercase; color: rgba(255,255,255,0.2);
      }
      .at-num-input {
        background: rgba(255,255,255,0.05);
        border: 1px solid rgba(255,255,255,0.09);
        border-radius: 6px;
        color: rgba(255,255,255,0.75);
        font-family: 'JetBrains Mono', monospace; font-size: 11px;
        padding: 5px 7px; width: 100%; outline: none;
        transition: border-color 0.15s;
      }
      .at-num-input:focus { border-color: rgba(124,111,255,0.5); }
      #at-btn-scrap {
        background: rgba(124,111,255,0.12);
        border: 1px solid rgba(124,111,255,0.25);
        border-radius: 6px; cursor: pointer;
        color: #9b8fff; font-family: 'Inter', sans-serif;
        font-size: 11px; font-weight: 600;
        padding: 5px 8px; transition: all 0.15s;
        white-space: nowrap;
      }
      #at-btn-scrap:hover { background: rgba(124,111,255,0.22); border-color: rgba(124,111,255,0.45); color: #bdb0ff; }

      /* ---- QUEUE ---- */
      .at-queue-header { display: flex; justify-content: space-between; align-items: center; }
      .at-queue-count {
        font-family: 'JetBrains Mono', monospace;
        font-size: 9px; color: rgba(255,255,255,0.25);
      }
      .at-queue-count span { color: #7c6fff; }
      #at-queue-box {
        background: rgba(255,255,255,0.04);
        border: 1px solid rgba(255,255,255,0.08);
        border-radius: 7px;
        color: rgba(255,255,255,0.6);
        font-family: 'JetBrains Mono', monospace; font-size: 10.5px; line-height: 1.5;
        padding: 7px 9px; width: 100%;
        resize: vertical; min-height: 80px; max-height: 200px;
        outline: none; transition: border-color 0.15s;
      }
      #at-queue-box:focus { border-color: rgba(124,111,255,0.4); }
      #at-queue-box::placeholder { color: rgba(255,255,255,0.15); }

      /* ---- RESIZE HANDLE ---- */
      #at-resize-handle {
        position: absolute;
        bottom: 0; left: 0; right: 0;
        height: 6px; cursor: ns-resize;
        background: transparent;
      }
      #at-resize-handle::after {
        content: '';
        display: block;
        width: 32px; height: 2px;
        border-radius: 1px;
        background: rgba(255,255,255,0.08);
        margin: 2px auto 0;
      }
    </style>

    <div id="at-titlebar">
      <span class="at-dot at-dot-red" id="at-dot-red" title="Close" style="cursor:pointer"></span>
      <span class="at-dot at-dot-amber" id="at-dot-amber" title="Collapse" style="cursor:pointer"></span>
      <span class="at-dot at-dot-green" id="at-dot-green" style="cursor:default;opacity:0.3"></span>
      <span id="at-title-text">AutoTyper</span>
      <span id="at-status-badge">IDLE</span>
      <button id="at-collapse-btn" title="Collapse">▾</button>
    </div>

    <div id="at-body">

      <button id="at-btn-start">▶ &nbsp;Start</button>

      <div class="at-sep"></div>

      <!-- WPM Slider -->
      <div class="at-section-label">Speed</div>
      <div class="at-slider-group">
        <div class="at-slider-row">
          <div class="at-slider-header">
            <span class="at-slider-label">Target WPM</span>
            <span class="at-slider-value" id="at-wpm-val">80</span>
          </div>
          <input type="range" class="at-slider" id="at-wpm" min="20" max="250" value="80" step="1">
        </div>
      </div>

      <!-- Accuracy Sliders -->
      <div class="at-section-label">Accuracy</div>
      <div class="at-slider-group">
        <div class="at-slider-row">
          <div class="at-slider-header">
            <span class="at-slider-label">Fake Accuracy</span>
            <span class="at-slider-value" id="at-fake-acc-val">100%</span>
          </div>
          <input type="range" class="at-slider acc-slider" id="at-fake-acc" min="80" max="100" value="100" step="0.5">
        </div>
        <div class="at-slider-row">
          <div class="at-slider-header">
            <span class="at-slider-label">Real Accuracy</span>
            <span class="at-slider-value" id="at-real-acc-val">98%</span>
          </div>
          <input type="range" class="at-slider acc-slider" id="at-real-acc" min="80" max="100" value="98" step="0.5">
        </div>
      </div>

      <div class="at-sep"></div>

      <!-- Scrap -->
      <div class="at-section-label">Scrape</div>
      <div class="at-scrap-grid">
        <div class="at-field">
          <span class="at-field-label">From</span>
          <input class="at-num-input" id="at-scrap-min" type="number" min="1" value="1">
        </div>
        <div class="at-field">
          <span class="at-field-label">To</span>
          <input class="at-num-input" id="at-scrap-max" type="number" min="1" value="1200">
        </div>
        <button id="at-btn-scrap">⟳ Scrape</button>
      </div>
      <div class="at-scrap-grid" style="grid-template-columns:1fr auto;gap:6px;align-items:end">
        <div class="at-field">
          <span class="at-field-label">Redo if stars ≤</span>
          <input class="at-num-input" id="at-redo-threshold" type="number" min="0" max="6" value="0">
        </div>
      </div>

      <!-- Queue -->
      <div class="at-queue-header">
        <span class="at-section-label" style="margin-bottom:0">Queue</span>
        <span class="at-queue-count" id="at-queue-count"><span>0</span> lessons</span>
      </div>
      <textarea id="at-queue-box" placeholder="Lesson numbers, comma-separated&#10;e.g. 1, 2, 5, 10, 22"></textarea>

    </div>

    <div id="at-resize-handle"></div>
    `;

    document.body.appendChild(panel);

    const titlebar = panel.querySelector("#at-titlebar");
    let dragging = false,
      ox = 0,
      oy = 0;

    titlebar.addEventListener("mousedown", (e) => {
      if (e.target.closest("button") || e.target.classList.contains("at-dot"))
        return;
      dragging = true;
      const r = panel.getBoundingClientRect();
      ox = e.clientX - r.left;
      oy = e.clientY - r.top;
      panel.style.transition = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!dragging) return;
      let nx = e.clientX - ox;
      let ny = e.clientY - oy;
      const maxX = window.innerWidth - panel.offsetWidth;
      const maxY = window.innerHeight - panel.offsetHeight;
      nx = Math.max(0, Math.min(maxX, nx));
      ny = Math.max(0, Math.min(maxY, ny));
      panel.style.left = nx + "px";
      panel.style.top = ny + "px";
      panel.style.right = "auto";
      panel.style.bottom = "auto";
    });

    document.addEventListener("mouseup", () => {
      if (dragging) {
        panel.style.transition = "";
        dragging = false;
      }
    });

    const resizeHandle = panel.querySelector("#at-resize-handle");
    let resizing = false,
      resizeStartY = 0,
      resizeStartH = 0;

    resizeHandle.addEventListener("mousedown", (e) => {
      resizing = true;
      resizeStartY = e.clientY;
      resizeStartH = panel.offsetHeight;
      panel.style.transition = "none";
      e.preventDefault();
    });

    document.addEventListener("mousemove", (e) => {
      if (!resizing) return;
      const delta = e.clientY - resizeStartY;
      const newH = Math.max(160, resizeStartH + delta);
      panel.style.height = newH + "px";
      panel.style.maxHeight = newH + "px";
      const queueBox = panel.querySelector("#at-queue-box");
      if (queueBox) {
        const bodyPad = 27 * 2;
        const fixed =
          panel.querySelector("#at-body").scrollHeight - queueBox.offsetHeight;
        const remaining =
          newH -
          panel.querySelector("#at-titlebar").offsetHeight -
          fixed -
          bodyPad;
        if (remaining > 60) {
          queueBox.style.minHeight = remaining + "px";
          queueBox.style.maxHeight = remaining + "px";
        }
      }
    });

    document.addEventListener("mouseup", () => {
      if (resizing) {
        panel.style.transition = "";
        resizing = false;
      }
    });

    document.getElementById("at-dot-red").addEventListener("click", () => {
      panel.style.opacity = "0";
      panel.style.pointerEvents = "none";
      panel.style.transform = "scale(0.92)";
      const restore = () => {
        panel.style.opacity = "1";
        panel.style.pointerEvents = "";
        panel.style.transform = "";
        document.removeEventListener("keydown", restoreKey);
      };
      const restoreKey = (e) => {
        if (e.altKey && e.key === "t") {
          restore();
        }
      };
      document.addEventListener("keydown", restoreKey);
      const hint = document.createElement("div");
      hint.id = "at-restore-hint";
      hint.style.cssText = `
        position:fixed; bottom:28px; right:28px; z-index:2147483646;
        font-family:'JetBrains Mono',monospace; font-size:10px;
        color:rgba(255,255,255,0.4); background:rgba(10,10,14,0.9);
        padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.07);
        cursor:pointer; letter-spacing:0.5px;
      `;
      hint.textContent = "Alt+T to restore";
      hint.addEventListener("click", restore);
      document.body.appendChild(hint);
      const origRestore = restore;
      const newRestore = () => {
        origRestore();
        hint.remove();
      };
      hint.addEventListener("click", newRestore);
      document.addEventListener("keydown", (e) => {
        if (e.altKey && e.key === "t") {
          hint.remove();
        }
      });
    });

    const collapseBtn = panel.querySelector("#at-collapse-btn");
    const bodyEl = panel.querySelector("#at-body");
    let collapsed = false;
    const doCollapse = () => {
      collapsed = !collapsed;
      panel.classList.toggle("at-collapsed", collapsed);
      collapseBtn.textContent = collapsed ? "▸" : "▾";
    };
    document
      .getElementById("at-dot-amber")
      .addEventListener("click", doCollapse);
    collapseBtn.addEventListener("click", doCollapse);

    function wireSlider(id, displayId, suffix = "", decimals = 0) {
      const slider = document.getElementById(id);
      const display = document.getElementById(displayId);
      const fmt = (v) =>
        decimals > 0
          ? parseFloat(v).toFixed(decimals) + suffix
          : parseInt(v) + suffix;

      const updateTrack = () => {
        const pct =
          ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
        const color = id.includes("acc") ? "#06d6a0" : "#7c6fff";
        slider.style.background = `linear-gradient(to right, ${color} ${pct}%, rgba(255,255,255,0.1) ${pct}%)`;
        display.textContent = fmt(slider.value);
      };

      let debounceTimer = null;
      slider.addEventListener("input", () => {
        updateTrack();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.liveConfig = readConfigFromUI();
        }, 600);
      });

      updateTrack();
    }

    wireSlider("at-wpm", "at-wpm-val", " wpm");
    wireSlider("at-real-acc", "at-real-acc-val", "%", 1);
    wireSlider("at-fake-acc", "at-fake-acc-val", "%", 1);

    document.getElementById("at-btn-start").addEventListener("click", () => {
      if (state.running) {
        stopAutomation();
      } else {
        const raw = document.getElementById("at-queue-box").value;
        const parsed = raw
          .split(",")
          .map((s) => parseInt(s.trim()))
          .filter((n) => !isNaN(n) && n > 0);
        if (parsed.length === 0) return;
        state.queue = parsed;
        state.currentLessonIdx = 0;
        state.liveConfig = readConfigFromUI();
        state.running = true;
        updateStartStopBtn(true);
        runAutomation().catch(() => stopAutomation());
      }
    });

    document.getElementById("at-btn-scrap").addEventListener("click", () => {
      if (!isMenuPage()) return;
      const min = parseInt(document.getElementById("at-scrap-min").value) || 1;
      const max =
        parseInt(document.getElementById("at-scrap-max").value) || 9999;
      const redo =
        parseInt(document.getElementById("at-redo-threshold").value) ?? 0;
      const queue = scrapeLessons(min, max, redo);
      document.getElementById("at-queue-box").value = queue.join(", ");
      updateQueueCount(queue.length);
    });

    document.getElementById("at-queue-box").addEventListener("input", () => {
      const raw = document.getElementById("at-queue-box").value;
      const parsed = raw
        .split(",")
        .map((s) => parseInt(s.trim()))
        .filter((n) => !isNaN(n) && n > 0);
      updateQueueCount(parsed.length);
    });
  }

  function updateStartStopBtn(running) {
    const btn = document.getElementById("at-btn-start");
    if (!btn) return;
    btn.innerHTML = running ? "■ &nbsp;Stop" : "▶ &nbsp;Start";
    btn.classList.toggle("running", running);
    const badge = document.getElementById("at-status-badge");
    if (badge) {
      badge.textContent = running ? "RUNNING" : "IDLE";
      badge.classList.toggle("visible", running);
    }
  }

  function updateStatusBadge(idx) {
    const badge = document.getElementById("at-status-badge");
    if (!badge) return;
    if (idx === null) {
      badge.textContent = "IDLE";
      badge.classList.remove("visible");
      return;
    }
    badge.textContent = `#${state.queue[idx]}`;
    badge.classList.add("visible");
  }

  function updateQueueCount(count) {
    const el = document.getElementById("at-queue-count");
    if (el) el.innerHTML = `<span>${count}</span> lessons`;
  }

  function setupInterferenceDetection() {
    document.addEventListener(
      "click",
      (e) => {
        if (!state.running) return;
        if (state.scriptNavigating) return;
        const menuBtn = e.target.closest(".menu-btn");
        if (menuBtn) stopAutomation();
      },
      true,
    );

    document.addEventListener(
      "keydown",
      (e) => {
        if (!state.running) return;
        if (!e.isTrusted) return;
        const typingInput = document.querySelector('input[aria-hidden="true"]');
        if (typingInput && e.target === typingInput) stopAutomation();
      },
      true,
    );
  }

  function init() {
    if (
      !location.href.includes("typingclub.com") &&
      !location.href.includes("edclub.com")
    )
      return;
    buildUI();
    setupInterferenceDetection();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
