# Design QA — 1.1.0 scene restoration

Final result: **passed for the source scene and interaction adaptation**. This is not a pixel-identical clone. Actual iOS/Android device QA remains unperformed.

## Evidence and normalized comparison

Reference: https://jherr.github.io/depth-of-field/ and upstream commit `c75dd6d40e4a96e96fd38e57657fe4b9737bf776`. Captured the rendered original before implementation. Compared the actual plugin in a dedicated Obsidian vault using mobile emulation, rather than an HTML mockup.

Both views: 390×844 CSS pixels, light theme, metric units, full frame 36×24mm, actual 50mm, f/1.8, subject 1.8288m and custom CoC0.029mm. Original screenshot390×844; plugin screenshot780×1688 at2× was normalized to390×844. Compared the top700px of content side by side, excluding Obsidian chrome. Result: near1.76m, far1.90m, total0.14m and hyperfocal47.94m match at display precision.

Local evidence (ignored to keep user vault/chrome imagery out of GitHub): `docs/visual-comparison/original-mobile.jpg`, `plugin-after-mobile.png`, `comparison.png`, `scene-preview.png`. A private before screenshot is also excluded and must not be published.

## Review and corrections

- P1: the original single camera/subject/DOF scene had been replaced by small independent strips below controls. Restored scene-first layout, field-of-view cone, pink DOF region, focus marker and four numeric cards.
- P1: the subject was not interactive. Added pointer/touch dragging with capture on the stable ItemView element, keyboard arrows, direct numeric entry and synchronized range inputs. Page scrolling remains available outside the subject handle; existing per-view sidebar swipe protection remains.
- P2: a combined normalized screenshot revealed missing range tracks under host styles. Added explicit scoped tracks and value-progress styling, then recaptured and checked them.
- Reviewed layout, type size, theme colors, assets and copy. Distance/focal/aperture controls follow the source sequence; all visible controls retain44px touch targets and360px avoids horizontal overflow. Korean labels and metric readouts remain readable. Light/dark theme behavior and wider/shorter viewports are covered by the mobile test suite.

## Intentional differences

The user requires Obsidian-native offline TypeScript, Korean UI, tabs and flash calculations. The combined tab therefore adds the flash hero, dashed coverage cone and patterned exposure strip. Off-camera geometry stays separate. Four metric cards are compact so Korean labels fit; native theme accent colors replace Chakra styling. Newly authored simple photographer/camera/subject SVG symbols replace original decorative figure paths whose independent asset provenance is unclear. No remote fonts, copied PNGs or original figure paths are included. The source authorship and MIT notice remain in README, plugin information and distribution.

## Behavior verification

31 automated engine/data/scene/packaging tests passed.10 scene integration scenarios passed, including real CDP touch gestures, mouse drag, keyboard, numeric entry, aperture updating both flash and DOF, off-camera separation, blank input and finite offscreen distances.17 existing mobile integration scenarios passed, including offline Markdown saving, settings restoration, themes, lifecycle and touch targets.6 swipe and8 prior bug regression scenarios also passed with the new scene implementation. These checks use macOS Obsidian/Chromium mobile emulation; they do not establish real iOS/Android behavior.

No unresolved P0/P1/P2 issue in this scoped adaptation. Remaining device checks: native keyboard/IME, safe areas, physical touch and rotation in iOS WebKit and Android WebView, and BRAT update on each device.
