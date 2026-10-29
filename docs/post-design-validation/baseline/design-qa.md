# Design QA · Bauhaus · 2026-10-29

final result: passed

## Source and evidence

The user explicitly replaced the A/B/C selection step with a Bauhaus preference and asked for immediate application. `docs/bauhaus/target.png` is a generated style target, not a selected pixel-exact product specification. The preceding scene-restoration QA is preserved in `docs/bauhaus/previous-design-qa.md`.

Source pixels939×1683; implementation780×1688 for390×844 CSS viewport. `docs/bauhaus/compare.html` displays before/source/after at the same390px width with natural aspect ratio; no stretching/cropping. Source omits Obsidian host chrome and has a different artboard length; this is explicitly labeled rather than compared as identical density. Combined comparison captured and inspected in `docs/bauhaus/comparison.png` (1280×2023). The native app header/toolbar is host owned and intentionally retained.

Implementation evidence: `docs/bauhaus/screenshots/combined-light.png`, `390-light-심도·화각.png`, `390-light-플래시.png`, `390-dark-통합.png`; large text/long error: `long-save-error.png`; warning and long name: `long-name-theoretical.png`; GN missing: `missing-gn.png`. Same baseline GN40m/ISO100/f4/quarter power/on-camera5m. Actual state/viewport assertions in `tests/bauhaus.mjs`, output `docs/bauhaus/results.json`. Existing preparation before capture: `docs/design-exploration/screenshots/01-combined.png`.

Full-view comparison was performed in the same comparison image, then the lower readouts/controls and light/dark tabs were inspected together by scrolling the comparison page. Individual390px captures were inspected for readable Korean labels, numeric fields and failure states. No raster artwork was substituted for live UI or interactive geometry.

## Findings and iteration history

- [P2, fixed] First360px implementation placed the DOF far readout partially beneath the native lower toolbar (far bottom718.3px vs710px bound). Reduced context and section gaps, shortened repeated scene guidance, retained the exposure-pattern explanation. Final existing mobile check passes and the final source/implementation comparison confirms visible primary readouts.
- [P2, fixed] First implementation grouped visually reordered controls without matching reading order. Quick-control fields now append in the same priority during initial render only; scene/flash DOM order follows the selected tab. No field rebuilding or sorting while typing. New DOM/context tests and focus/cursor/scroll tests pass.
- Test setup issue, fixed: a second Obsidian starter window could be selected by the previous broad URL match. Relevant QA scripts now select `/index.html` and retain the strict dedicated-vault assertion. No production fallback was added.
- Test calculation issue, fixed: short CSS hex `#fff` was initially not expanded by the new contrast assertion. Expanded to six digits in the test. Final light/dark foreground/background and primary-action pairs all pass4.5:1.
- One preparation run recorded host `TypeError: e.isShown is not a function`. An isolated repeat with stack recording and the final Bauhaus run did not reproduce it. It was not silently filtered; the final run has no uncaught exception. This is a macOS host observation, not evidence of phone stability.

No actionable P0/P1/P2 visual issue remains within the tested scope.

## Required fidelity surfaces

- Typography: existing local Obsidian/system Korean font, strong tab/result weights, tabular numbers and smaller unit span; rem-based body/label sizes. Long numeric/readout wrapping checked under20px root text. No external font or CDN.
- Spacing/layout: square tab strip,2px corners, flat ruled sections, scene first in combined/DOF and exposure first in flash. Distance/aperture form a paired row. Every visible tested input/select/button/summary has at least44px height. No horizontal overflow at360/390 portrait or844×390 landscape, both themes, normal/20px root fonts.
- Colors/tokens: warm ivory/ink/cobalt, red DOF and ochre dashed flash, dark palette with brighter semantic colors. Actual resolved ink/muted/primary/warning token pairs checked at≥4.5:1. States include text/forms/line styles, not color alone. No glass, decorative gradients or shadows.
- Image/asset fidelity: original live photographer/subject/coverage/DOF SVG and pointer geometry retained. No new static bitmap in runtime, no fake shutter, no decorative shapes or new icon dependency. The generated target's illustrative geometry was not used for calculation or control positions. MIT notices retained.
- Copy: existing Korean function/ARIA names preserved. Visible distance/aperture labels shortened without changing accessible names or units. On/offcamera and GN mode summarized. Theory warning is differentiated from blocking error. Both note scopes and settings retry remain distinct.

## Intentional native-product differences

The host toolbar/header, correct live flash-tolerance strip, original hyperfocal action, full advanced settings and safety explanations remain. They consume more vertical space than the generated style image; normal scrolling is retained. There is no fixed footer. Camera/flash coverage uses the original engine and scene coordinates, not the raster target. Source layout proportions are art direction rather than a reason to remove controls or falsify numeric positions.

## Implementation checklist and verification

- [x] CSS tokens and theme-scoped style
- [x] Scene and direct numeric/range inputs retained
- [x] GN40.5, mid-string editing, focus and scroll preservation
- [x] Equipment drafts/selection and settings writer unchanged
- [x] Tab/full note scope and I/O failure recovery retained
- [x] Existing50 unit,17 mobile,14 stabilization,10 scene,6 swipe,8 bug regression and10 preparation scenarios passed
- [x] New6 Bauhaus state/layout/contrast checks passed
- [x] Current src checks with preserved official Obsidian1.7.2 types; min declaration1.7.4 unchanged
- [x] Real vault files backed up; data.json identical during file replacement; original v1 data fully preserved in migrationBackup after normal v2 migration and subsequent runtime input saves; Mac native new UI load verified

Phone keyboards, OS font settings/rotation/safe areas and Android back remain actual-device checks. 20px root size and resized Chromium viewport are substitutes only. No iOS/Android device pass and no1.7.4 runtime pass claimed. No forced app exit, OS lock or public release performed.

## Follow-up polish

P3: actual-phone OS keyboard/large-text review may call for small device-specific spacing adjustments. This is not treated as a verified phone result.
