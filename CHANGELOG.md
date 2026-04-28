# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), 
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.1.0 - 2026-04-28
Deprecated update, scripts are still avaliable but not recommend to use.

## 1.0.3 - 2026-04-25 <span style="color:red">DEPRECATED</span>
### <span style="color:red">ALL versions below are not recommended in use.</span>
### Added
- **Fully Automatic — WPM & Accuracy only:** The UI now only exposes the 3 sliders (WPM, Fake Accuracy, Real Accuracy). Everything else happens automatically once you click Start.
- **Flow:** Navigates to the menu page (waitForPage("MENU")), scrapes lessons 1–9999 on the live DOM, builds the queue, then immediately begins automation. The status badge shows NAVIGATING… → SCRAPING… → #N during each lesson.
- **Auto / AFK Mode Toggle:** Auto Mode (⚡ purple): uses EXECUTABLE_SELECTORS as before — only executable incomplete lessons are queued. AFK Mode (💤 amber): queues all incomplete lessons regardless of type. When an inexecutable page is hit at runtime, it's auto-skipped and permanently logged via: console.log with the program ID (e.g. [program-4521]), localStorage under key at_skipped_program-XXXX (program-namespaced, so it never interferes with other programs). Mode can't be switched while running.

### Changed
- **Scrape → Progress Bar:** Removed the textarea, Scrape button, Min/Max/Redo inputs entirely. Replaced with a smooth animated progress bar (#at-progress-fill) and a X / Y lessons counter that updates live as the queue is processed.
- **Progress Based on Queue:** The bar tracks processedCount / queue.length — only lessons in the current run's queue. Skipped lessons (in AFK mode) also increment the counter so the bar always moves forward.
- Rework windows management
- These changes are applies to advanced.js generating beta.js

## 1.0.2 - 2026-04-21
### Added
- Feature highlights to the README.
- Integrated "Note" and "Important" alert blocks in documentation.

### Fixed
- Small corrections in contributor crediting.
- Minor hotfix adjustments.

## 1.0.1 - 2026-04-20
### Changed
- **Typing Engine:** New advanced script engine implemented; the core loop is now a direct port of the basic script for improved stability.
- **Accuracy Logic:** Migrated to a Fisher-Yates shuffle for error distribution. Actions are pre-computed upfront, ensuring a statistically exact 99.7% accuracy.
- **WPM Control:** Refactored core calculation logic using `targetDurationMs` to account for backspace inflation.
- **Input Handling:** Implemented `nativeInputValueSetter` via `Object.getOwnPropertyDescriptor` to bypass React-style input hijacking.
- **Drift Correction:** Added `expectedTime` clock-drift correction to prevent compounding execution delays.
- Corrected advanced script version numbering.
- Fixed a logic error where real and fake accuracy parameters were inverted.

## 1.0.0 - 2026-04-19
### Added
- **UI Redesign:** macOS-style traffic light titlebar controls (Red: hide/fade; Amber: collapse).
- **Dynamic Resizing:** Added vertical resize handle; textarea now scales dynamically with panel height.
- **Visual Feedback:** Added filled-track progress sliders (Purple for Speed, Green for Accuracy).
- **Status Tracking:** Integrated `at-status-badge` in the titlebar to show active lesson numbers.
- **Animations:** Smooth CSS transitions for panel visibility and dragging.

### Changed
- Replaced numeric inputs with styled range sliders featuring a 600ms debounce.
- Updated font stack to Inter and JetBrains Mono.
- Optimized drag interaction to ignore button/dot elements.
- Refined grid layout for scrap range and threshold settings.

### Removed
- In-panel log container and associated export/clear functions (logging is now console-only).
- Restart / Go to Menu button (deprecated in favor of new flow).
- Unused helper functions: `isExecutablePage`, `waitForElement`, and `logBuffer`.

## 0.3.2 - 2026-04-19
### Added
- `state.completedLessons` Set to track session progress.
- `state.liveConfig` to handle real-time parameter updates during a running session.
- Automatic removal of completed or unexecutable lessons from the queue textarea.
- 800ms debounce on UI configuration changes.

### Changed
- `runTypingSession` now polls `getConfig` on every character iteration for real-time adjustments.
- Start handler now snapshots the current queue rather than rebuilding from raw scrape data.

### Fixed
- Persistent scrap range inputs: values no longer reset when starting or stopping the script.

## 0.3.1 - 2026-04-19
### Added
- `state.scriptNavigating` flag to prevent the interference detector from triggering during programmatic navigation.
- Smart polling (200ms intervals) for page transitions after pressing Enter.
- Key event parity: Enter key now dispatches both `keydown` and `keyup`.

### Changed
- Optimized `goToMenu` to prevent redundant page reloads.
- Abort signals are now fresh per invocation to prevent stale signal bleeding.

### Fixed
- Interference detector false positives during post-lesson navigation.
- Stale `AbortController` issues when restarting sessions.

## 0.3.0 - 2026-04-19
### Added
- **Core Automation:** Initial release of the full userscript scaffolding.
- **Page Intelligence:** Implemented `detectPage` for 8 distinct site states.
- **Scraper Engine:** Added `scrapeLessons` with star rating and executability detection.
- **Complexity Heuristic:** Speed adjustments based on word length and character doubling.
- **Typing Engine:** Support for speed ramping (start/end), random variation waves, and simulated errors.
- **Safety:** Added interference detection (user overrides) and `AbortController` support.

## 0.2.1 - 2026-04-18
### Added
- Manual testing phase initiated for WPM/Accuracy data recording.

### Removed
- AI testing materials and dummy data.

## 0.2.0 - 2026-04-14
### Added
- Beta release of the fully automated automation script.

## 0.1.1 - 2026-04-12
### Added
- Project LICENSE file.

### Changed
- Major repository reorganization and folder renaming.

## 0.1.0 - 2026-04-02
### Added
- Hack directory reference links in README.

## 0.0.5 - 2025-12-30
### Added
- README initialization with fancy headers and custom badges.
- Installation tutorials for encryption scripts.

## 0.0.4 - 2025-12-23
### Added
- Initial Fake Accuracy system.
- Character-count based evaluation for calculation accuracy.

### Changed
- Created customized personal configuration variants.

## 0.0.3 - 2025-12-22
### Added
- Core logic for basic single-lesson typing.
- Real accuracy simulation.
- Documentation comments for user configurations.

### Changed
- Refactored character extraction for special character support.

## 0.0.2 - 2025-12-21
### Added
- Initial key event simulation implementation.
- Testing for basic delay systems.

## 0.0.1 - 2025-12-13
### Added
- Logic prototyping for typing simulation.
- Simplified `requirements.txt` for Encryption Method.

### Changed
- Initial file structure arrangement.