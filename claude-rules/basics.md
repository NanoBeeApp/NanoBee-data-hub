# Basics & Execution

Foundational rules for how to communicate and execute work in this repository.

## Language & Communication
- Converse with the user in **Chinese**.
- Write **ALL** code comments and documentation in **English** — this is a public repository.

## Execution Style
- For most common bash commands, do **not** ask for permission — just run them directly.
- Prioritize delivering the **minimum viable loop** as quickly as possible and getting the core flow working end-to-end. Handle core functionality first, non-core functionality second.
- When debugging, print as many detailed logs as possible.
- Do **not** use `/superpowers:brainstorming` unless the user invokes it explicitly.

## Verification
- After implementing a feature, you must execute the **functional verification** according to the verification plan or steps. If a dev server needs to be started during verification, do not ask for permission — just start it directly.
- After adding a page/feature or fixing a bug, verify with **Playwright**, launched in headless or background mode.

## Plan Files
- Plan files should all be written under `/docs/plans`, with filenames starting with a date-time prefix.
