/** Whether the brand mark's boot-reveal animation has already played during
 *  this page load. A plain module-level variable, deliberately NOT
 *  sessionStorage: sessionStorage survives a reload in the same tab (it only
 *  clears when the tab closes), which is the opposite of what "play once per
 *  reload" needs. A module-level flag resets automatically on every full
 *  page load/reload (the JS re-executes from scratch) while still holding
 *  steady across client-side SPA navigation within that same load (chat
 *  switches shouldn't replay it either). */
let played = false;

export function hasBootRevealPlayed() {
  return played;
}

export function markBootRevealPlayed() {
  played = true;
}
