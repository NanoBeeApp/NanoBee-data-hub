# Home Page (with Google One Tap)

## Background
- Symptom: The console showed `One Tap skipped: unknown_reason` with no easy way to determine whether the cause was a configuration issue, browser policy, or user interaction.
- Goal: Without changing the main flow, add detailed logs for the One Tap initialisation and prompt phases, provide human-readable reason descriptions, and reduce noise from repeated initialisation.

## Current Progress
- Overall: 100%
- Completed:
  - Added detailed One Tap logging in `src/routes/index.tsx` (string output followed by object output).
  - Added `prompt` callback parsing to distinguish `not_displayed / skipped / dismissed / displayed` states.
  - Added plain-English descriptions for `unknown_reason` and other common reason codes.
  - Added a singleton loader guard for the Google GSI script and a duplicate-initialisation guard for One Tap.
- Remaining:
  - None

## Implementation Details

1. Logging Strategy
- All key log points use the uniform prefix `[Header.useEffect]`.
- Frontend logs follow the "string first, object second" pattern for easy copying and inspection.
- Covered points:
  - Early returns when the user is already signed in or the Client ID is missing.
  - GSI script load start, success, and failure.
  - One Tap initialisation and `prompt` trigger.
  - Credential callback success and failure.

2. Reason Parsing
- A new parsing function is added to the `prompt` callback that maps the state into:
  - `displayed`
  - `not_displayed`
  - `skipped`
  - `dismissed`
- Common reason codes are mapped to plain-English descriptions.
- Unknown reason codes fall back to a default message, preventing the "unknown_reason with no explanation" problem from recurring.

3. Duplicate Initialisation Guard
- `window.__googleOneTapInitialized` tracks whether One Tap has already been initialised.
- The GSI script is injected with a fixed id `google-gsi-client-script` to prevent duplicate injection.
- When an existing script element is detected, it is reused and initialisation is attempted directly.

## Verification Plan
1. Start: `npm run dev -- --host 127.0.0.1 --port 5173`
2. Open the home page `http://127.0.0.1:5173` in Playwright headless mode
3. Confirm the page loads without script errors
4. Observe the browser console One Tap logs for:
   - Initialisation start / complete
   - Prompt result (displayed, or the specific reason for skipped / not_displayed)
5. Verify the login button is still clickable (a real third-party login is not required)

## Verification Record
- Verified: 2026-02-21
- Dev server: `npm run dev -- --host 127.0.0.1 --port 5173`
- Playwright (headless) key results:
  - Opening `http://127.0.0.1:5173/` succeeded; the home page renders correctly.
  - Console shows One Tap initialisation logs: script load start / complete, initialisation complete, and prompt triggered.
  - When `One Tap skipped: unknown_reason` was reproduced, the log now includes a structured explanation:
    - `moment: skipped`
    - `reason: unknown_reason`
    - `reasonDescription: The browser returned only a generic skip reason (commonly caused by privacy restrictions / FedCM).`
  - Page interaction was unaffected; the `Test Server Function` button remained clickable.
- Additional observations:
  - In a headless environment, `Provider's accounts list is empty` and `FedCM get() rejects with NetworkError` appeared; these are expected when no Google account is available and are distinguishable from page logic errors.
