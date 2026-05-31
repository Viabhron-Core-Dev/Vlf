# App Blueprint

## Architecture
- **Tech Stack:** React, TypeScript, Tailwind CSS, Vite
- **State Management:** React Context API (`NoteContext` / `AppContext`), Local state
- **Styling:** Tailwind CSS with fluid mobile-first layouts
- **Icons:** `lucide-react`

## Features Matrix
- **Core Engine:** Smooth 2-axis dragging for attachments (corner handles handles 2-dimensional width/height expansion). Snaps to 48px row heights.
- **Note Types:** Kanban, Checklist, Image, Doodle, and rich text inline attachments
- **User Interface:** Clean yellow/black "sticky note" theme with robust text layout controls

## Development Phases
- **Phase 1: Foundation (Completed)** - Basic text and simple blocks.
- **Phase 2: Rich Blocks (Completed)** - Inline shapes and widgets.
- **Phase 3: Resizing UX (Completed)** - Unified drag handles on the corner to control layout constraints cleanly instead of clunky dialogs.

## Change Log
- Replaced separated bounding-box drag handles with a single unified corner scale-handler (`startDrag`) yielding smooth 2-axis stretching.
- Overhauled attachment width/height properties with absolute boundary snapping to `48px` layout.
- Added `touch-action: none` to resize handles for flawless mobile touch interaction.
- Added a hidden click-to-upload native FileInput capability to `AttachmentBlock`'s image placeholder.
- Wrapped `AttachmentBlock` loops in a flexible `w-full` row wrapper to capture localized side-clicks.
- Fixed an aggressive layout reset bug where tapping text blocks bubbled to the generic container listener, forcing focus jumps to the bottom. Added `e.stopPropagation()` and precise DOM target checks to ensure background clicks only execute when striking empty space.
- Introduced timestamp-based `focusTrigger` state parameter forcing explicit programmatic `.focus()` calls when users tap beside an image, ensuring the next sibling textarea prioritizes browser input successfully.
- Refactored touch implementation inside `HabitCell` and `LongPressItem` by migrating away from touch-only events onto unified `PointerEvents` and configuring `touch-manipulation` styles. This firmly resolves Safari/Mobile tap delay bugs and accurately registers tapping/long-pressing.
- Upgraded the combination/routine habits tap target to render as a precise percentage-based "checkbox" (e.g. 0%, 50%) rather than an inner circle, matching the visual checklist request.
- Enabled native sub-habit depth pages by securely propagating a `subIdx` parameter down the stack into `HabitDetailOverlay`. Tapping a subhabit name accurately directs into that subhabit's historical charts and editing context without corrupting parent scope.
- Fixed severe mobile "ghost-clik" issues causing the select mode X button to instantly trigger nested routine depth pages on exit. Implemented strict `touch-manipulation` container styles and explicit pointer event cancellation strategies across all habit row action boundaries.
- Re-styled standard `yesno` tick actions to mimic Loop Habit Tracker exactly. Removed framing/borders in favor of thick, sharply weighted `Check` and `X` assets directly on the view plane.
- Harmonized nested combination sub-habits display blocks. Swapped plain text titles for full icon + title layout mimicking primary habits at a structurally scaled-down ratio.
- Migrated Task tracking and representation onto the primary Habits index under a separated upper tasks list via dedicated properties like `habitMode`.
- Implemented the Log Keeper standard. Engineered a dedicated global `logger` interface bounded at 1000 records supporting stack trace serialization intercepting top level React `window.onerror`. Features a fully localized JSON export / clipboard interface under Settings resolving silent crash auditing requests.
- Enhanced the Tasks subsystem by introducing explicit Start/End timezone boundaries bounding Tracker list visibility. Added dedicated "Daily Max Limit" vs "Overall Pool Size" measurable quantity toggles mapped to `target` vs `targetTotal` respectively.
- Extended the global application Long Press `setTimeout` delay from 500ms to 750ms universally across `BottomNav`, `NotesGrid`, and `HabitsTab` to mitigate accidental screen-shake triggers on light taps.
- Redesigned the `ExpensesTab` addition interface to match the clean, simple, light-theme design language of the Notes and Habits tabs. Replaced custom dropdowns and dark aesthetics with standard lightweight native layouts and high-contrast styling.
- Extensively re-skinned the Expenses `AddOutingOverlay` and `AddItemModal` to match the exact `bg-[#f0f2f5]` / plain white dialog styles used in Notes and Habits. Preserved the custom "tap and dropdown options below tap" functionality but transitioned the color palette from dark/cream to clean gray-and-white.
- Renamed the application metadata and HTML wrapper title to "Vian Life Helper" (VLF) per user request.
- Added a GitHub Actions workflow (`build-android.yml`) utilizing Capacitor to ensure a debug APK is automatically compiled whenever the repository is exported to GitHub. Updated workflow to trigger on pushes to all branches (`**`) instead of just `main`.
- Initialized Capacitor and generated the `android` platform locally within the project space. This resolves GitHub Actions build compilation issues missing configuration setups. Simplified `build-android.yml` to run Capacitor sync on the existing configuration instead.
- Updated `build-android.yml` to use Node.js version 22 to satisfy Capacitor CLI requirements.
- Updated `build-android.yml` to execute `gradle wrapper` directly on the runner before assembly to cleanly regenerate the corrupt `gradle-wrapper.jar` binary file caused by Git line-ending conversions.
