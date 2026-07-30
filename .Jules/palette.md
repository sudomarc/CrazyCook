## 2025-07-24 - [Micro-UX Contact Form Feedback and Accessibility Enhancements]
**Learning:** Hardcoding inline styles in JS overrides them forcefully and requires unmaintainable CSS overrides (like `!important`). Always encapsulate component states and styling purely inside stylesheets. Avoid using browser-wide event triggers like `DOMContentLoaded` to reset form layouts dynamically as this creates duplicate event listener bindings, resulting in severe multi-firing regressions and memory leaks. Instead, encapsulate bindings recursively or handle visibility/reset dynamically.
**Action:** Declare all states (like `.contact-success-panel`) inside stylesheets and avoid inline styles in JavaScript. Ensure reset states recursively call setup functions rather than dispatching global window-level events.

## 2025-07-25 - [CSS Grid Label Wrapping and Required Field Aesthetics]
**Learning:** Applying CSS Grid (`display: grid`) to `<label>` elements treats immediate children as separate grid items. Loose inline text and inline elements (like required indicator asterisks) are treated as individual grid items and forced onto separate rows. Wrapping them in a single inline element like `<span>` preserves their flow on a single line.
**Action:** Always wrap text and inline sibling indicators inside a container element when applying CSS Grid to labels.
