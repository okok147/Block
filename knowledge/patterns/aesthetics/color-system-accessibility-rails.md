# Pattern: Color System With Accessibility Rails

- Type: Aesthetic/UI
- Status: Proven
- Tags: color, accessibility, theming

## Use When

- Building or extending a design system.
- Product needs distinctive style without sacrificing readability.

## Visual Intent

Create a recognizable palette where semantic roles remain consistent and readable across screens.

## Structure

- Define role tokens first: `bg`, `surface`, `text`, `muted`, `primary`, `success`, `warning`, `danger`.
- Map component styles to roles, not raw hex values.

## Color/Typography Rules

- Ensure text/background contrast meets accessibility targets.
- Keep interactive states (hover/focus/disabled) role-based and predictable.
- Limit accent usage to preserve emphasis.

## Interaction/Motion Rules

- Pair focus-visible styles with high-contrast outline.
- Animate color transitions briefly to avoid flicker.

## Anti-Patterns

- Per-component hardcoded colors.
- Saturated accents used as large backgrounds without contrast checks.
