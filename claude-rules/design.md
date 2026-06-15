# Design Guidelines

Rules for UI/UX design work (pure design, not implementation).

## Design Principles
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
