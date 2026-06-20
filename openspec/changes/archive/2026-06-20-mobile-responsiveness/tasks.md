## 1. Shared responsive dialog wrapper

- [x] 1.1 Create `client/src/components/ResponsiveDialog.tsx` — wraps `Dialog.Popup` from `@base-ui/react/dialog` with responsive positioning: centered popup on `md:` and up, full-width bottom-anchored sheet below `md`. Passes through children, title, and portal/backdrop transparently.
- [x] 1.2 Add mobile dialog slide-up animation in `index.css`: a `@keyframes` from `translateY(100%)` to `translateY(0)`, applied to the dialog popup when below `md`.
- [x] 1.3 Add a horizontal-scroll shadow utility class in `index.css` (optional visual improvement for tables).

## 2. Bottom navigation bar

- [x] 2.1 Create `client/src/components/BottomNav.tsx` — fixed bottom bar (`fixed bottom-0 inset-x-0 z-30`) with four `NavLink` tabs: Grid (home icon), Stats (bar-chart icon), Add (plus icon), Settings (gear icon). Uses Lucide icons. Active tab has `text-primary`. Includes `pb-[env(safe-area-inset-bottom)]` and a top border matching `--rule`. Only rendered below `md` breakpoint.
- [x] 2.2 Update `App.tsx` to render `<BottomNav />` below `md`. Hide the desktop "Stats" and "Settings" header links below `md`. Add `pb-16 md:pb-0` to the `<main>` element to prevent content from hiding behind the bottom nav.

## 3. WorkGrid mobile adaptation

- [x] 3.1 Make the search/sort/Add toolbar sticky on mobile: add `sticky top-0 z-10` and a solid background (`bg-background`) to the toolbar container on viewports below `md`. The toolbar must sit below the page header, not overlap it.
- [x] 3.2 Replace the inline genre chip row with a "Filters" button below `md`. The button shows an active-filter indicator (dot or count) when a genre is selected.
- [x] 3.3 Create the filter bottom sheet: tapping "Filters" opens a `ResponsiveDialog` containing the genre chips (All + each genre), styled vertically for mobile. Selecting a chip sets the filter and closes the sheet.
- [x] 3.4 Adjust grid columns: add 1-column layout below 480px (`grid-cols-1 min-[480px]:grid-cols-2`), keeping existing breakpoints at `sm:`, `lg:`, `xl:`.
- [x] 3.5 Apply the same 1-column grid adjustment to the work grid on the Author Detail page.

## 4. GlobalSearch mobile adaptation

- [x] 4.1 Update `GlobalSearch.tsx` to render as a compact search icon button on viewports below `md`. Tapping the icon expands the search input to full width within the header.
- [x] 4.2 Ensure the expanded search input on mobile closes (collapses back to icon) when the user taps outside or presses Escape.

## 5. Touch target sizing

- [x] 5.1 Increase button padding on mobile: add responsive `py-` classes to the Button component's size variants so touch targets reach at least 44px on mobile (`py-2.5 md:py-1.5` for default, `py-2 md:py-1` for xs/sm).
- [x] 5.2 Increase genre chip touch targets: `py-2 md:py-1` with `min-h-[36px] md:min-h-0` on mobile.
- [x] 5.3 Increase form input and select padding: `py-2.5 md:py-1.5` on mobile.
- [x] 5.4 Increase table action button/link sizing: responsive padding on the PageLogTable and LoanHistory action buttons so they're tappable on mobile.
- [x] 5.5 Increase the sort `<select>` and genre `<select>` padding on the WorkGrid toolbar for mobile.

## 6. Dialog migration

- [x] 6.1 Switch `ConfirmDialog` to use `ResponsiveDialog` instead of raw `Dialog.Popup`.
- [x] 6.2 Switch `EditWorkModal` to use `ResponsiveDialog`.
- [x] 6.3 Switch `EditEditionModal` to use `ResponsiveDialog`.
- [x] 6.4 Switch `EditCopyModal` to use `ResponsiveDialog`.
- [x] 6.5 Switch `EditAuthorModal` to use `ResponsiveDialog`.
- [x] 6.6 Switch `EditSeriesModal` to use `ResponsiveDialog`.
- [x] 6.7 Switch `AddCopyModal` to use `ResponsiveDialog`.
- [x] 6.8 Switch `NoteEditorModal` to use `ResponsiveDialog`.
- [x] 6.9 Switch `FinishModal` to use `ResponsiveDialog`.

## 7. Verify

- [x] 7.1 Run `npm run lint` and `npm run typecheck` in the client directory to verify no errors.
- [x] 7.2 Start the dev server and test on a phone browser (or Chrome DevTools mobile viewport): verify bottom nav appears, header simplifies, grid toolbar is sticky, filter sheet works, dialogs are bottom sheets, touch targets feel tappable.
- [x] 7.3 Verify desktop layout is unchanged: header links present, no bottom nav, dialogs centered, grid columns as before.
- [x] 7.4 Verify barcode scanner still works on mobile (camera opens, scans an ISBN).
