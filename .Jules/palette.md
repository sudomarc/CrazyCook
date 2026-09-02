## 2025-07-24 - [Micro-UX Contact Form Feedback and Accessibility Enhancements]
**Learning:** Hardcoding inline styles in JS overrides them forcefully and requires unmaintainable CSS overrides (like `!important`). Always encapsulate component states and styling purely inside stylesheets. Avoid using browser-wide event triggers like `DOMContentLoaded` to reset form layouts dynamically as this creates duplicate event listener bindings, resulting in severe multi-firing regressions and memory leaks. Instead, encapsulate bindings recursively or handle visibility/reset dynamically.
**Action:** Declare all states (like `.contact-success-panel`) inside stylesheets and avoid inline styles in JavaScript. Ensure reset states recursively call setup functions rather than dispatching global window-level events.

## 2025-07-25 - [Accessible Cart Drawer Dialog Overlay and Interactive CTA Navigation]
**Learning:** For overlay components (such as drawers or modals) in single-page apps, screen readers require explicit ARIA landmarks (`role="dialog"`, `aria-modal="true"`) to prevent focus leakage to the background. Furthermore, trapping keyboard focus via a manual Tab/Shift+Tab cycle event handler is necessary in vanilla JavaScript, as native browser modal behaviors are absent in custom div-based panels. When empty states are encountered, offering an interactive CTA that closes the overlay and scrolls to relevant catalog sections provides a seamless, delighted conversion funnel.
**Action:** Use a standardized keyboard focus trap function for custom modal/drawer containers, and design empty states to guide users proactively back into the browsing flow using scroll hooks.

## 2025-07-26 - [Interactive Progress Stepper inside Multi-Step Drawer Workflows]
**Learning:** When guiding a user through multi-step form tasks in vanilla JS (such as a 3-step checkout inside a drawer), providing a visual progress stepper directly below the modal's title greatly enhances clarity and reduces cognitive load. Using clean status classes (`active`, `completed`) combined with HTML `aria-current="step"` ensures clear structure and accessibility for screen readers. Connecting state transitions directly to the render loop preserves UI responsiveness and visual elegance.
**Action:** Always provide standard progress state classes and semantic screen reader attributes on stepper indicators inside modal-driven checkout flows.

## 2026-08-09 - [Dynamic Dark-Mode Styling for Embedded Map Elements]
**Learning:** Google Maps embedding by default does not respect system or application theme states, presenting a jarring bright-white layout in a dark mode context. We can solve this cleanly in pure CSS using custom filters (`invert`, `grayscale`, `hue-rotate`, `opacity`) applied on the iframe within a theme-scoped selector (`[data-theme="dark"]`). This ensures a completely integrated, dark-toned map layout without any third-party SDK dependencies or complex styling setups, maximizing visual consistency and accessibility for sensitive eyes in dark-mode.
**Action:** Style embedded iframe elements using responsive wrappers with custom filter states corresponding to the dark mode active theme scope.

## 2026-08-13 - [Real-Time Input Counters in Destructive Form Reset Environments]
**Learning:** In vanilla JavaScript setups where parent containers are destroyed or reset using innerHTML templates, static event listeners directly bound to target input elements (like a character counter) are permanently lost. To make the counter state robust and prevent functional breakage after a form reset, register the input tracking handler via event delegation on a stable parent element, and perform a manual counter re-initialization right after rendering the fresh template.
**Action:** Always use parent-level event delegation or lifecycle initialization functions when building interactive counter widgets inside dynamically replaced DOM structures.

## 2026-08-20 - [Focus Preservation in Dynamically Re-rendered Modal Lists]
**Learning:** In vanilla JS dynamic re-renders (such as updating cart item quantities or deleting items in a drawer), completely overwriting `innerHTML` causes active DOM focus to reset to `document.body`. This breaks keyboard navigation for screen reader and keyboard-only users. Tracking target metadata (`id`, `action`, `itemIndex`) during user interactions and applying a post-render focus restoration loop guarantees seamless keyboard navigation.
**Action:** Always pass `focusInfo` state objects to dynamic re-render functions to re-focus the corresponding or adjacent interactive element.

## 2026-08-21 - [Asynchronous Focus Shift in Multi-Step Modal Form Transitions]
**Learning:** In vanilla JavaScript, calling `.focus()` synchronously inside a button click event listener during dynamic DOM transitions causes the browser's native click handling lifecycle to reset focus back to `document.body` or the triggering element. Wrapping focus calls in `setTimeout(..., 0)` defers focus shifting until after event loop settlement, ensuring reliable focus transfer to the logical first form input in multi-step modal dialogs.
**Action:** Always wrap `.focus()` calls in `setTimeout(..., 0)` when transitioning between step views inside click event handlers.

## 2026-08-22 - [In-Cart Quantity Badges and Dynamic ARIA Syncing on Catalog Item Cards]
**Learning:** When users browse a menu or catalog, lack of immediate item quantity feedback on item cards causes cognitive load and forces repetitive cart drawer toggles. Dynamically injecting an in-cart quantity pill badge (`.order-pill`) next to action buttons and synchronizing screen-reader `aria-label` attributes (`Ajouter X au panier (N dans le panier)`) whenever cart state updates provides seamless visual and auditory context.
**Action:** Connect catalog card badge rendering directly to the central cart render loop so all cart mutations (adding, updating, reordering, clearing) instantly reflect item counts on catalog cards.

## 2026-09-02 - [Accessible Copy-to-Clipboard Micro-Interactions]
**Learning:** When providing inline copy buttons for critical contact information (e.g. restaurant address), relying solely on visual state changes (like 'Copié ! ✓') leaves screen-reader users without feedback. Pairing immediate visual button state transitions with screen-reader announcements (`aria-live="polite"`) ensures equitable feedback across all modalities.
**Action:** Always route clipboard confirmation actions through live region announcers (like `announceCartAction`) in addition to visual element toggles.
