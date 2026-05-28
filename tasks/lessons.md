# Lessons Learned

- **Next.js Hydration:** Never initialize state synchronously with `localStorage` or `window` objects on the first client render if it affects the DOM layout. The initial render must match the server (e.g. `false`). Use a module-level variable to cache the state after the first render to allow subsequent client-side route navigations to initialize synchronously without causing a UI flash.
