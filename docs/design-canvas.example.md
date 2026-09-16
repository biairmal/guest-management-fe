# Design canvas reference (example)

Local, git-ignored pointer to the live Claude Design canvas artifact(s) for this project, so any session/agent
knows which artifact to read-and-update instead of publishing a duplicate one. The URL itself isn't checked into
git (it's a personal/account-owned Claude Design link, not project config), so this file is a template —
copy it to `design-canvas.local.md` (already git-ignored, see `.gitignore`) and fill in the real values once a
canvas exists.

`ui-ux-designer` reads `design-canvas.local.md` before doing any canvas work: if it exists and lists a canvas
whose scope covers the current Story, read that artifact and update it in place; only publish a new canvas if
none of the listed ones fit, and then add a new `## Canvas:` block below for it.

---

## Canvas: <short name, e.g. "Auth + User Management + Design System">

- URL: `https://claude.ai/artifact/REPLACE_ME`
- Scope: <what this canvas covers — e.g. style directions, theme pairs, specific feature screens, layout
  foundations, core components>
- Pages: <canvas page names, comma-separated, for quick orientation without opening the link>

Add another `## Canvas: <name>` block per additional canvas, if this project ever needs more than one
(e.g. a separate canvas for a much later, unrelated feature area).
