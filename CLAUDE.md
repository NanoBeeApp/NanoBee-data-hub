# Repository Layout: Public vs Private (Important — Must Follow)
- This repo (`NanoBeeApp/NanoBee-data-hub`) is **public**. It must contain **only public-facing code and public documentation**.
- A **private** repo is nested at `private/` (remote: `NanoBee-data-hub-private`, ignored by the public repo's `.gitignore`). **All development by-products go into `private/`**, including but not limited to:
  - **Screenshots / screen captures → `private/screenshots/`** (NEVER the repo root, NEVER a top-level `screenshots/`).
  - Verification / debugging / explanatory artifacts → `private/`.
  - Chat history, planning notes, internal PRDs, logs, scratch design files → `private/` (e.g. `private/docs/`, `private/logs/`, `private/planning/`).
- **🚨 This OVERRIDES the global rule** "screenshots must go in `screenshots/`". In THIS project, screenshots go in **`private/screenshots/`**, not a root-level `screenshots/`. Before saving any screenshot (Playwright captures, `browser_take_screenshot`, manual saves), write it under `private/screenshots/`. If a root `screenshots/` ever appears, move its contents into `private/screenshots/` and delete the root folder.
- **Rule of thumb**: if a file is not "public-facing code or public documentation", it belongs in `private/`; when unsure, default to `private/`.
- **Versioning**: changes under `private/` → `cd private && git add/commit/push` to the private remote. Public-repo changes → commit at the repo root (`private/` is auto-ignored). Never commit `private/` contents into the public repo.

# Basics
- Converse with the user in Chinese, but write ALL code comments and documentation in English (this is a public repository).
- Every code file that contains business logic must have a corresponding `.md` file with the same name, documenting the requirements, implementation details, and a concrete verification plan or step-by-step procedure. If a code file is missing its corresponding `.md` file, create one. Whenever code is modified, always update the `.md` file in sync.
- After implementing a feature, you must execute the functional verification according to the verification plan or steps. If a dev server needs to be started during verification, do not ask for permission — just start it directly.
- When implementing features, prioritize delivering the minimum viable loop as quickly as possible and getting the core flow working end-to-end. Handle core functionality first, non-core functionality second.
- Do not use `/superpowers:brainstorming` unless I invoke it explicitly.
- For most common bash commands, do not ask for permission — just run them directly.
- All API endpoints and backend logic must be placed inside the Hono `workers/api-worker`.
- When debugging, print as many detailed logs as possible.
- After adding a page/feature or fixing a bug, verify with Playwright, launched in headless or background mode.
- Plan files should all be written under `/docs/plans`, with filenames starting with a date-time prefix.

# Product Requirements / Product Design
- When doing solution design, write the design into the `docs` folder.
- Keep requirements documents up to date in real time; every modification must update the progress and completion status in the corresponding requirements document.
- When doing product requirements design, a user story file for the requirements must be generated and placed in the `user_stories` directory.
- Do not be influenced by the existing design of other pages. Always explore the most beautiful, best-UX design solution that fits the requirements.


# User Stories
- Describe what goal the user wants to achieve and how they accomplish it step by step through the product's features. Include the specific on-page interaction flow: what buttons are clicked, what content is entered, what screens are viewed, what interactions occur, and the expected behavior of the frontend and backend systems.
- User stories focus solely on solving user needs and improving user experience — do not involve technical implementation details.

# Design Guidelines
- Ensure the UI/UX is clean and easy to use, with key information highlighted. Complex or rarely-used features should be collapsed/hidden and placed in secondary interaction layers.
- Use the `ui-ux-pro-max` SKILL for web design.
- Focus purely on design, not technical implementation. (HTML/CSS — note this is pure design, not a React implementation.)
- Focus only on usability and functionality. Do not discuss frontend/backend tech-stack implementation or subsequent technical plans and task breakdowns.
- When designing pages, do not read any frontend or backend code files, to avoid being influenced by the current implementation.
- Never draw SVGs. When icons are needed, use Font Awesome icons directly.

## Design Index Management (Important — Must Follow)
- **Every time a new design page is added, the `design/index.html` index page must be updated in sync.**
- Add a card for the new page in the index, including:
  - Page number and title
  - Page description (1–2 sentences explaining the feature)
  - Corresponding icon/preview
  - Relevant tags
  - Correct category (Core / Feature / Onboarding)
- Update the statistics count in the index page.
- Update the `design/README.md` document by adding the new page description in the "Page List" section.
- **Checklist**: must be completed after adding a new design page
  - [ ] Page has been added to `design/index.html`
  - [ ] Statistics count has been updated
  - [ ] `design/README.md` has been updated
  - [ ] Page opens correctly from the index page

## Quick Access
- Design index page: `open design/index.html`
- View all design pages: click a card in the index page to open it.

# Coding
- Always keep testability in mind when writing code.
- Split code into reusable functions as much as possible, and split it across multiple independent files to avoid spaghetti code and oversized files.
- API routes should be reasonably split across multiple files.
- **Constants and configuration must be extracted into a unified config file**: do not hardcode the same strings or configuration values (e.g. tokens, URLs, magic numbers) in multiple files. Extract them into `src/worker/config.ts` or another unified config file and import from there.
- **Abstract moderately — solve a class of problems, not just one problem**:
  - When implementing a feature, first ask: what class of problem is this? Is there a more general solution?
  - Data structures and interface designs should accommodate variations within the same class of scenarios (e.g. a parser that supports multiple formats, not just the one currently in use).
  - When logic can be made to accommodate different scenarios through configuration/parameters, prefer configuration over hardcoding.
  - **Balance principle**: if the general solution does not increase implementation complexity, use the general solution; if it requires a large amount of extra code or requires predicting future requirements, keep it simple and direct.


# Logging
- When printing frontend logs, first print as a string (for easy copying), then print as an object (for easy inspection).

# Components
- Extract shared components as much as possible.
- Split logic into independent functions and independent components as much as possible. Each file should contain only one React component.
- Separate business logic from page rendering to facilitate testing.
- **Stateful and pure-rendering components must be separated into two components**: the stateful component manages state and logic; the pure-rendering component handles only UI display and receives props.
- **Each section of a page should have its own independent component** to improve semantic readability and reusability (e.g. Header, Sidebar, Content, Footer, etc.).
- **Prefer splitting into named components to avoid large blocks of HTML**: break complex JSX into multiple semantically named components to improve code readability and maintainability.
- **Component library priority**: prefer TanStack ecosystem components (e.g. TanStack Table, TanStack Router, TanStack Query, etc.); only use shadcn/ui when TanStack does not have a component that meets the requirements.
- To add a shadcn component, use the command: `pnpm dlx shadcn@latest add button`
