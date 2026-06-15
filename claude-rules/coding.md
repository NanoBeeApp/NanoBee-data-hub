# Coding, Components & Logging

Code structure, architecture, component, and logging conventions.

## Per-File Documentation (Iron Rule)
- Every code file that contains business logic must have a corresponding `.md` file with the same name, documenting the requirements, implementation details, and a concrete verification plan or step-by-step procedure. If a code file is missing its corresponding `.md` file, create one. Whenever code is modified, always update the `.md` file in sync.

## Architecture
- All API endpoints and backend logic must be placed inside the Hono `workers/api-worker`.
- API routes should be reasonably split across multiple files.

## Coding
- Always keep testability in mind when writing code.
- Split code into reusable functions as much as possible, and split it across multiple independent files to avoid spaghetti code and oversized files.
- **Constants and configuration must be extracted into a unified config file**: do not hardcode the same strings or configuration values (e.g. tokens, URLs, magic numbers) in multiple files. Extract them into `src/worker/config.ts` or another unified config file and import from there.
- **Abstract moderately — solve a class of problems, not just one problem**:
  - When implementing a feature, first ask: what class of problem is this? Is there a more general solution?
  - Data structures and interface designs should accommodate variations within the same class of scenarios (e.g. a parser that supports multiple formats, not just the one currently in use).
  - When logic can be made to accommodate different scenarios through configuration/parameters, prefer configuration over hardcoding.
  - **Balance principle**: if the general solution does not increase implementation complexity, use the general solution; if it requires a large amount of extra code or requires predicting future requirements, keep it simple and direct.

## Components
- Extract shared components as much as possible.
- Split logic into independent functions and independent components as much as possible. Each file should contain only one React component.
- Separate business logic from page rendering to facilitate testing.
- **Stateful and pure-rendering components must be separated into two components**: the stateful component manages state and logic; the pure-rendering component handles only UI display and receives props.
- **Each section of a page should have its own independent component** to improve semantic readability and reusability (e.g. Header, Sidebar, Content, Footer, etc.).
- **Prefer splitting into named components to avoid large blocks of HTML**: break complex JSX into multiple semantically named components to improve code readability and maintainability.
- **Component library priority**: prefer TanStack ecosystem components (e.g. TanStack Table, TanStack Router, TanStack Query, etc.); only use shadcn/ui when TanStack does not have a component that meets the requirements.
- To add a shadcn component, use the command: `pnpm dlx shadcn@latest add button`

## Logging
- When printing frontend logs, first print as a string (for easy copying), then print as an object (for easy inspection).
