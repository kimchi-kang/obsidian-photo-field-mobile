# Third-party notices

Photo Field Mobile is an independent adaptation/extension, not an official or sponsored project of Jack Herrington.

## depth-of-field

Author: Jack Herrington

Project: https://github.com/jherr/depth-of-field

Reference commit: `c75dd6d40e4a96e96fd38e57657fe4b9737bf776`

Checked: 2026-10-28 (KST)

`src/engine.ts` adapts the optical calculation concepts in upstream `src/App.tsx` with a consistent thin-lens hyperfocal boundary. `src/diagram.ts` reimplements the DOF and angular-coverage visualization concept from `src/PhotographyGraphic.tsx` using new simple geometry. No upstream React component, animal/person SVG path, PNG, Vite logo, font or runtime dependency is included. Unit conversion is independently rewritten in metres and millimetres. `vendor/depth-of-field-LICENSE.txt` is an unchanged copy of the original license. See `docs/UPSTREAM_ANALYSIS.md` for the file-by-file record.

Full upstream license (also included verbatim as a separate file):

```text
MIT License

Copyright (c) 2026 Jack Herrington

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Runtime and assets

The only external import is `obsidian`, supplied by the host application. The Obsidian API type definitions are MIT licensed; they are used during development and are not bundled. The camera ribbon icon is supplied by Obsidian's built-in icon service. No third-party icon path, image, font or executable package is bundled. All visible SVG geometry is newly authored in `src/diagram.ts`.

## Development tools (not included in the plugin runtime)

esbuild: MIT; TypeScript: Apache-2.0; tsx: MIT; Playwright/playwright-core: Apache-2.0; @types/node: MIT; obsidian API types: MIT. Lockfile versions and transitive license metadata for both projects are recorded in `docs/dependency-license-audit.json`. The source archive includes package manifests/lockfile and no node_modules. npm reported zero known vulnerabilities at install time; that result is not a security guarantee.
