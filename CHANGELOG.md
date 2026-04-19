# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## Unreleased

### Added

- Pause Simulation: Random 1–3 second "breather" pauses between paragraphs to better mimic human behavior.

### Changed

- Refine and enhance the current wpmToDelay math to increase accuracy and improve consistency, while adding random jitter between keydown and keyup events for anti-cheat and upgraded status badge to show progress

## 1.0.0 - 2026-04-19

Public release. Complete UI redesign with no breaking changes to core automation logic.

### Added

- macOS-style traffic light dots in the titlebar: red hides the panel with a fade-out animation and shows an "Alt+T to restore" chip in the corner; amber collapses or expands the panel body.
- Vertical resize handle at the bottom of the panel — dragging it taller causes the queue textarea to grow and fill the extra space dynamically.
- Filled-track progress visualization on all sliders — purple for speed controls, green for accuracy controls.
- Collapse button (▾/▸) retained alongside the amber dot as an alternative collapse trigger.
- `at-status-badge` element in the titlebar that shows the current lesson number while running and hides when idle.

### Changed

- Replaced all four number inputs (WPM, Variation, Real Accuracy, Fake Accuracy) with styled range sliders that display the live value inline and update `state.liveConfig` with a 600 ms debounce.
- Queue textarea `min-height` raised to 80 px with a `max-height` of 200 px; grows further when the panel is resized.
- Drag interaction now uses a grab/grabbing cursor and ignores mousedown events originating from buttons or dot elements.
- Panel hide/show uses CSS `opacity`, `pointer-events`, and `transform` transitions instead of `display` toggling for a smoother feel.
- Titlebar drag sets `panel.style.transition = 'none'` while dragging and restores it on mouseup to avoid lag.
- Scrap range inputs and redo threshold are now a compact three-column grid.
- Font stack switched to Inter + JetBrains Mono for a cleaner public-facing appearance.

### Removed

- In-panel log container, log clear button, and log export button — logging is now console-only (`console.log`).
- Restart / Go to Menu button.
- All `log()` calls that previously wrote to the UI log panel.
- Unused `logBuffer` array and `appendLogToUI()` function.
- Unused `isExecutablePage()` helper.
- `waitForElement()` helper (was unused after earlier refactor).

---

## 0.3.2 - 2026-04-19

### Added

- `state.completedLessons` — a `Set` that tracks lessons finished in the current session.
- `removeFromQueueTextarea(lessonNum)` — removes a specific lesson number from the queue textarea and updates the count indicator immediately after a lesson completes or is determined to be unexecutable.
- Live config debounce on all four parameter inputs: changes apply to the running session after the user stops typing for 800 ms, preventing partial values (e.g. `8` while typing `80`) from being applied mid-session.
- `readConfigFromUI()` — extracted from `getConfig()` so that the start handler can snapshot the current UI values into `state.liveConfig` at session start.
- `state.liveConfig` — holds the currently active config; updated by the debounce handler during a running session and snapshotted fresh on each Start.

### Changed

- `getConfig()` now returns `state.liveConfig` when set, falling back to a live read of the UI otherwise.
- `runTypingSession()` calls `getConfig()` on every character iteration instead of once at session start, so mid-lesson WPM or accuracy changes take effect on the very next keystroke after the debounce settles.
- Start button handler reads whatever lesson numbers are currently in the queue textarea rather than rebuilding from `state.scrapeData`, so previously completed and auto-removed lessons are not re-queued on restart.
- Unexecutable lessons (wrong page type after navigation) now call `removeFromQueueTextarea()` in addition to being skipped, so they never appear in the queue on subsequent runs.
- Restart button checks `isMenuPage()` before calling `goToMenu()`; if already on the menu page it logs a message and does nothing, preventing a full page reload that would clear scraped data.

### Fixed

- Scrap range inputs (`at-scrap-min`, `at-scrap-max`) are no longer touched by the Start or Stop handlers, so the user's chosen range persists across sessions without needing to re-enter it.

---

## 0.3.1 - 2026-04-19

### Added

- `state.scriptNavigating` flag — set to `true` immediately before the script programmatically clicks `.menu-btn` and cleared after 500 ms, so the interference detector can distinguish script navigation from genuine user clicks.
- Transition detection after Enter key: after pressing Enter on the results screen the script polls `detectPage()` every 200 ms for up to 8 seconds and branches on the result (`EXECUTABLE`, `MENU`, other, or timeout) rather than blindly sleeping.
- Fallback path when Enter does not navigate: if `detectPage()` never transitions away from the results screen within 8 s the script falls back to `goToMenu()` and waits for the menu page.
- Fast-path detection at the top of the automation loop: if `detectPage()` already returns `EXECUTABLE` at the start of a loop iteration (meaning Enter navigation succeeded), the script skips the menu-navigation and lesson-click steps entirely.

### Changed

- `goToMenu()` now returns early without clicking or navigating if `isMenuPage()` is already true, preventing an unnecessary page reload.
- `goToMenu()` sets `state.scriptNavigating = true` before calling `.menu-btn.click()` and clears it via `setTimeout` so the interference listener ignores the event.
- `runAutomation()` creates a fresh `AbortController` on every invocation, so a signal that was aborted in a previous session cannot bleed into a new one.
- Loop structure split into two branches — `EXECUTABLE` fast-path and the normal menu → click → wait path — with `pageType` declared in the appropriate scope for each branch.
- Enter key dispatch now fires both `keydown` and `keyup` events instead of only `keydown`.

### Fixed

- After completing a lesson and pressing Enter, the automation no longer triggers the interference detector: `state.scriptNavigating` suppresses the `.menu-btn` click listener while the script itself navigates.
- Restarting automation after a stop no longer immediately aborts: the stale `AbortController` from the previous run is replaced before the new typing session begins.
- Restart button on the menu page no longer causes the page to reload: `isMenuPage()` check prevents `goToMenu()` from being called unnecessarily.

---

## 0.3.0 - 2026-04-19

Initial release.

### Added

- Tampermonkey userscript scaffolding targeting `*.typingclub.com` and `*.edclub.com`.
- **Page detection** (`detectPage()`) identifying six distinct states: `MENU`, `EXECUTABLE`, `VIDEO`, `GAME`, `UNEXECUTABLE_1`, `UNEXECUTABLE_2`, `RESULTS`, and `UNKNOWN`.
- **Lesson executability check** (`getLessonExecutability()`) reading icon classes from `.lesson_icon` elements on the menu page against a curated set of known executable lesson types.
- **Menu scraper** (`scrapeLessons()`) extracting lesson number, name, star rating (0–5 or 6 for silver/platinum), completion status, and executability for each `.box` element within a user-specified range.
- **Redo threshold filter**: lessons are added to the queue only if they are incomplete, or if their star rating is strictly below the user-configured threshold (0 = incomplete only, 6 = redo all).
- **Navigation helpers**: `goToMenu()` with URL-pattern fallback and `clickLesson()` that finds a lesson box by its number element and simulates a click.
- **WPM-to-delay formula** (`wpmToDelay()`): fitted from test data as `⌊10 800 / wpm⌋` ms average inter-key delay.
- **Word complexity heuristic** (`getWordComplexity()`): common short words type at 0.8× the base delay, words of 8+ characters at 1.15×, words with doubled letters at 1.1×.
- **Typing engine** (`runTypingSession()`) with:
  - Per-character `KeyboardEvent` (`keydown`/`keyup`) and `InputEvent` (`insertText` / `deleteContentBackward`) dispatch.
  - Speed ramp-up over the first 10 % of characters and ramp-down over the last 10 %.
  - Random variation wave around the base delay using the Variation parameter.
  - Real accuracy simulation: randomly substitutes a wrong character that is not corrected.
  - Fake accuracy simulation: types a wrong character then immediately backspaces it.
  - Live config re-read on every character so mid-lesson parameter changes take effect immediately.
- **Results scraper** (`scrapeResults()`) parsing lesson name, score, star count, displayed accuracy, real accuracy, WPM, and duration from `.TP_APP1.TPCMN` inner text.
- **Wait helpers**: `waitForElement()`, `waitForPage()`, and `waitForResults()` using `MutationObserver` with configurable timeouts.
- **Main automation loop** (`runAutomation()`) with:
  - Sequential Enter-key navigation between back-to-back lessons.
  - Automatic return to the menu page for non-sequential lessons.
  - Per-lesson page type validation before typing begins.
  - Clean abort via `AbortController` signal checked on every character.
- **Interference detection**: stops the automation if the user clicks `.menu-btn` or dispatches a trusted `keydown` event on the typing input field.
- **Floating UI panel** with:
  - Draggable titlebar.
  - Collapse / expand toggle.
  - Start / Stop toggle button that changes color and label based on running state.
  - Restart / Go to Menu button.
  - Number inputs for WPM, Variation, Real Accuracy, and Fake Accuracy.
  - Lesson range inputs (min / max) and redo threshold input for scraping.
  - Scrape button that populates the queue textarea (menu page only).
  - Editable queue textarea showing comma-separated lesson numbers with a live count indicator.
  - Color-coded in-panel log with timestamps and level badges (`ERROR`, `WARNING`, `SUCCESS`, `INFO`, `SKIP`, `PROGRESS`).
  - Log clear button and log export button (downloads a `.txt` file).
- **Status indicator** in the titlebar showing the current lesson number and position in the queue while running.
- Console logging mirroring all UI log entries via `console.log`.

## 0.2.1 - 2026-4-18

### Added

- Begin manual testing and recording data for wpm acc systems, code features and detection mechanisms

### Removed

- Removed AI testing materials

## 0.2.0 - 2026-4-14

### Added

- Beta changes and test files for the new fully automated script

## 0.1.1 - 2026-4-12

### Added

- LICENSE

### Changed

- Completed reorganized repository layout
- Renamed folders and rearranged files

## 0.1.0 - 2026-4-2

### Added

- Added hack directory link to Readme

## 0.0.5 - 2025-12-30

### Added

- Added Readme
- Added fancy headers and custom badges
- Added links and tutorials to Readme
- Added encryption features to Readme
- Added installation tutorial for ecnryption scripts to Readme

## 0.0.4 - 2025-12-23

### Added

- Fake accuracy system
- Enhanced various calculation method to first grabbing the total characters then evaluating to enusure accuracy

### Changed

- Created a custom script with my own settings

## 0.0.3 - 2025-12-22

### Added

- Core logic and feature for the basic single lesson script
- Added comments for details on configurations
- Finalized WPM system
- Added real accuracy system

### Changed

- Refactor character extraction
- Modify typing logic for improved handling of special characters

## 0.0.2 - 2025-12-21

### Added

- Completed initial implementation of key event simulation
- Testing newly implemented delay system

## 0.0.1 - 2025-12-13

### Added

- Figuring out the core logic for typing simulation
- Simplified requirements file for Encryption Method

### Changed

- Rearranged all the files and folders