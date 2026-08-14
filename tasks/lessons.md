# Lessons Learned

- **Next.js Hydration:** Never initialize state synchronously with `localStorage` or `window` objects on the first client render if it affects the DOM layout. The initial render must match the server (e.g. `false`). Use a module-level variable to cache the state after the first render to allow subsequent client-side route navigations to initialize synchronously without causing a UI flash.
# Lessons

## Enum stringification in comparisons (2026-08-14)
`str(FileState.ACTIVE)` is `'FileState.ACTIVE'`, not `'ACTIVE'`. A check written as
`str(state).upper() in ("ACTIVE", ...)` was therefore **always false**, so every upload
polled for its full 30s timeout and then proceeded with an unverified file. The bug was
invisible because the code "worked" — it just took 30s and logged a warning nobody read.

**Rule:** when comparing an enum to a string, compare `getattr(x, "name", x)`, and write a
test that asserts the *positive* case. A condition that is always true never fails loudly.

## Verify the mocking seam, not just the green checkmark (2026-08-14)
Five tests in `test_llm_client.py` patched `genai.Client`, but `_generate_with_retry`
resolves its client through `api_key_manager.get_current_client()`. The patches did
nothing; the tests hit the **live Gemini API** and had been failing. The whole suite took
84s because of it.

**Rule:** patch the seam the code actually calls. If a "unit" test takes seconds, it is
talking to something real.

## Fix the failure class, not the observed instance (2026-08-14)
The docx bug had four plausible causes. Rather than fix the one that fired, the repair
removed the dependency entirely: converted documents no longer use the Gemini Files API,
so they cannot expire and cannot be locked to a rotated API key. Three of the four
candidates became impossible.

**Rule:** when several causes share a dependency, deleting the dependency beats fixing
whichever cause happened to fire.

## A new feature can reintroduce the bug you just fixed (2026-08-14)
The Create feature stored its generated .docx as a file reference only. The document's
*text* lived nowhere the model could read, so the first follow-up ("change the salary")
would have reproduced the exact amnesia bug that had just been fixed. Caught in review,
before it shipped.

**Rule:** after fixing a class of bug, check whether new work re-creates the same shape.

## Read the DB before guessing at a repro (2026-08-14)
The failing session was sitting in the database with timestamps. It showed both symptoms,
proved the upload had succeeded, and bounded the failure window to ~33s — which matched
the retry ladder and pointed straight at the cause. That was faster and more certain than
any amount of code reading.

**Rule:** when a bug has already happened in production, the recorded evidence outranks
speculation.
