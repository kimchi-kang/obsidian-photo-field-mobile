/* Photo Field Mobile — independent mobile adaptation and extension.
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

See THIRD_PARTY_NOTICES.md for attribution and changes. */
"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/main.ts
var main_exports = {};
__export(main_exports, {
  default: () => PhotoPlugin
});
module.exports = __toCommonJS(main_exports);
var import_obsidian2 = require("obsidian");

// src/model.ts
var defaults = {
  sensor: "ff",
  width: 36,
  height: 24,
  focal: 50,
  aperture: 4,
  iso: 100,
  cameraDistance: 5,
  linked: true,
  flashDistance: 5,
  cocMode: "estimate",
  coc: 0.029,
  gn: 40,
  gnUnit: "m",
  gnZoom: 50,
  zoom: 50,
  conditions: "\uC5F0\uC2B5\uC6A9 \uAC00\uC0C1 GN \xB7 \uC7A5\uBE44 \uC0AC\uC591 \uC544\uB2D8 \xB7 ISO100\xB7\uCD5C\uB300\uCD9C\uB825\xB7\uC9C1\uC811\uAD11\xB750mm",
  denominator: 4,
  loss: 0,
  tolerance: 1,
  minDenominator: 256,
  steps: "1,2,4,8,16,32,64,128,256",
  coverage: "approx",
  horizontal: 40,
  vertical: 27,
  mode: "manual",
  diagramMax: 15,
  tab: "combined"
};
var sensors = {
  ff: { name: "\uD480\uD504\uB808\uC784", width: 36, height: 24 },
  apsc: { name: "APS-C (23.6\xD715.6)", width: 23.6, height: 15.6 },
  mft: { name: "Micro Four Thirds", width: 17.3, height: 13 }
};

// src/units.ts
var feetToMetres = (v) => v * 0.3048;
var metresToFeet = (v) => v / 0.3048;
function parseNumber(v) {
  return v.trim() === "" ? NaN : Number(v);
}
function fmt(v, digits = 2) {
  return v === Infinity ? "\u221E" : Number.isFinite(v) ? v.toLocaleString("ko-KR", { maximumFractionDigits: digits }) : "\u2014";
}
var metres = (v) => v === Infinity ? "\u221E" : `${fmt(v)} m`;

// src/engine.ts
function positive(...values) {
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) throw Error("\uC591\uC758 \uC720\uD55C\uD55C \uC218\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
}
function angle(size, focal) {
  positive(size, focal);
  return 2 * Math.atan(size / (2 * focal)) * 180 / Math.PI;
}
function footprint(r, h, v) {
  positive(r, h, v);
  if (h >= 180 || v >= 180) throw Error("\uC870\uC0AC\uAC01\uC740 180\xB0 \uBBF8\uB9CC\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
  const width = 2 * r * Math.tan(h * Math.PI / 360), height = 2 * r * Math.tan(v * Math.PI / 360);
  positive(width, height);
  return { width, height };
}
function optics(i) {
  positive(i.width, i.height, i.focal, i.aperture, i.cameraDistance);
  const c = i.cocMode === "estimate" ? Math.hypot(i.width, i.height) / 1500 : i.coc;
  positive(c);
  const s = i.cameraDistance * 1e3, f = i.focal;
  positive(s);
  if (s <= f) throw Error("\uCE74\uBA54\uB77C \uAC70\uB9AC\uB294 \uC2E4\uC81C \uCD08\uC810\uAC70\uB9AC\uBCF4\uB2E4 \uCEE4\uC57C \uD569\uB2C8\uB2E4. (\uBC15\uB9C9\uB80C\uC988 \uBAA8\uB378)");
  const h0 = f * f / (i.aperture * c), H = h0 + f;
  positive(h0, H);
  const near = h0 / (h0 + s - f) * (s / 1e3);
  const atInfinity = i.cameraDistance >= H / 1e3;
  const far = atInfinity ? Infinity : h0 / (h0 - s + f) * (s / 1e3);
  positive(near);
  if (!atInfinity) positive(far);
  return {
    c,
    hyperfocal: H / 1e3,
    near,
    far,
    total: far - near,
    horizontal: angle(i.width, f),
    vertical: angle(i.height, f),
    diagonal: angle(Math.hypot(i.width, i.height), f),
    equivalent: f * Math.hypot(36, 24) / Math.hypot(i.width, i.height),
    airy: 2.44 * 55e-5 * i.aperture
  };
}
function effectiveGN(g, p, iso, loss) {
  positive(g, p, iso);
  if (p > 1 || !Number.isFinite(loss) || loss < 0) throw Error("\uCD9C\uB825\uC740 0 \uCD08\uACFC 1 \uC774\uD558, \uCD94\uAC00 \uC190\uC2E4\uC740 0 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
  const result = g * Math.sqrt(p) * Math.sqrt(iso / 100) * 2 ** (-loss / 2);
  positive(result);
  return result;
}
function flashDistance(g, p, iso, n, loss = 0) {
  positive(n);
  const result = effectiveGN(g, p, iso, loss) / n;
  positive(result);
  return result;
}
function requiredPower(g, n, r, iso, loss = 0) {
  positive(n, r);
  const result = (n * r / effectiveGN(g, 1, iso, loss)) ** 2;
  positive(result);
  return result;
}
function exposureEV(d, r) {
  positive(d, r);
  return 2 * (Math.log2(d) - Math.log2(r));
}
function powerSteps(text, minDenominator) {
  const list = text.split(",").map((v) => Number(v.trim()));
  if (!list.length || list.some((v) => !Number.isFinite(v) || v < 1 || v > minDenominator) || !list.includes(1) || !list.includes(minDenominator)) throw Error("\uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8\uB294 1\uACFC \uCD5C\uC18C \uCD9C\uB825 \uBD84\uBAA8\uB97C \uD3EC\uD568\uD558\uACE0 \uADF8 \uC0AC\uC774\uC758 \uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
  return [...new Set(list)].sort((a, b) => a - b);
}
function flash(i) {
  if (i.mode !== "manual") throw Error("\uC120\uD0DD \uC870\uAC74\uC740 \uAE30\uBCF8 GN \uBAA8\uB378\uB85C \uACC4\uC0B0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2E4\uCE21 \uB610\uB294 \uC804\uC6A9 \uC790\uB8CC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  positive(i.zoom);
  if (i.gnZoom !== i.zoom) throw Error(`\uC120\uD0DD \uC90C ${i.zoom}mm\uC758 GN \uC790\uB8CC \uC5C6\uC74C. \uD574\uB2F9 \uC90C\uC758 GN\uACFC \uCE21\uC815 \uC90C\uC744 \uC9C1\uC811 \uC785\uB825\uD558\uC138\uC694.`);
  positive(i.gn, i.gnZoom, i.denominator, i.minDenominator, i.tolerance, i.linked ? i.cameraDistance : i.flashDistance);
  if (!i.conditions.trim()) throw Error("GN \uCE21\uC815 \uC870\uAC74\uC744 \uC785\uB825\uD558\uC138\uC694.");
  if (i.denominator < 1 || i.denominator > i.minDenominator) throw Error("\uC120\uD0DD \uCD9C\uB825\uC774 \uC7A5\uBE44 \uC9C0\uC6D0 \uBC94\uC704\uB97C \uBC97\uC5B4\uB0A9\uB2C8\uB2E4.");
  if (i.tolerance > 5) throw Error("\uD5C8\uC6A9 \uBC94\uC704\uB294 0 \uCD08\uACFC 5EV \uC774\uD558\uB85C \uC785\uB825\uD558\uC138\uC694.");
  const steps = powerSteps(i.steps, i.minDenominator);
  const g = i.gnUnit === "ft" ? feetToMetres(i.gn) : i.gn;
  const r = i.linked ? i.cameraDistance : i.flashDistance;
  const gn = effectiveGN(g, 1 / i.denominator, i.iso, i.loss), d = gn / i.aperture;
  positive(i.aperture, d);
  const needed = requiredPower(g, i.aperture, r, i.iso, i.loss);
  const nearest = steps.reduce((best, v) => Math.abs(Math.log2(1 / v / needed)) < Math.abs(Math.log2(1 / best / needed)) ? v : best, steps[0]);
  return {
    gn,
    d,
    r,
    g,
    ev: exposureEV(d, r),
    needed,
    requiredAperture: gn / r,
    nearest,
    residual: Math.log2(1 / nearest / needed),
    low: d / 2 ** (i.tolerance / 2),
    high: d * 2 ** (i.tolerance / 2),
    status: needed > 1 ? "\uCD5C\uB300 \uCD9C\uB825\uC73C\uB85C\uB3C4 \uBD80\uC871" : needed < 1 / i.minDenominator ? "\uCD5C\uC18C \uCD9C\uB825\uBCF4\uB2E4 \uB0AE\uC740 \uCD9C\uB825 \uD544\uC694" : "\uC7A5\uBE44 \uCD9C\uB825 \uBC94\uC704 \uC548",
    steps,
    distances: steps.map((n) => ({ n, d: flashDistance(g, 1 / n, i.iso, i.aperture, i.loss) }))
  };
}
function coverage(i) {
  const h = i.coverage === "approx" ? angle(36, i.zoom) : i.horizontal;
  const v = i.coverage === "approx" ? angle(24, i.zoom) : i.vertical;
  const r = i.linked ? i.cameraDistance : i.flashDistance;
  return { h, v, flash: footprint(r, h, v), camera: footprint(i.cameraDistance, angle(i.width, i.focal), angle(i.height, i.focal)), narrow: h < angle(i.width, i.focal) || v < angle(i.height, i.focal) };
}

// src/presets.ts
function parseTable(text, unit) {
  const table = {};
  for (const row of text.trim().split("\n")) {
    const parts = row.split(",").map((v) => Number(v.trim()));
    if (parts.length !== 2) throw Error("\uAC01 \uC904\uC740 \uC90Cmm,GN \uD615\uC2DD\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
    const [zoom, gn] = parts;
    positive(zoom, gn);
    if (String(zoom) in table) throw Error("\uC90C \uC704\uCE58\uAC00 \uC911\uBCF5\uB418\uC5C8\uC2B5\uB2C8\uB2E4.");
    table[String(zoom)] = unit === "ft" ? feetToMetres(gn) : gn;
  }
  return table;
}
function equipmentValid(p) {
  try {
    if (!p.name.trim() || !p.conditions.trim() || !p.source.trim() || !Object.keys(p.table).length) return false;
    for (const [z, g] of Object.entries(p.table)) positive(Number(z), g);
    positive(p.minDenominator);
    powerSteps(p.steps, p.minDenominator);
    return true;
  } catch {
    return false;
  }
}

// src/storage.ts
function restore(data) {
  const result = { version: 1, inputs: { ...defaults }, equipment: [] };
  if (!data || typeof data !== "object") return result;
  const d = data;
  if (d.inputs && typeof d.inputs === "object") {
    for (const key of Object.keys(defaults)) {
      const value = d.inputs[key];
      if (typeof value === typeof defaults[key] && (typeof value !== "number" || Number.isFinite(value))) Object.assign(result.inputs, { [key]: value });
    }
  }
  const i = result.inputs;
  if (!["manual", "ttl", "hss", "bounce", "modifier", "near"].includes(i.mode)) i.mode = "manual";
  if (!["flash", "dof", "combined"].includes(i.tab)) i.tab = "combined";
  if (!["m", "ft"].includes(i.gnUnit)) i.gnUnit = "m";
  if (!["approx", "angles"].includes(i.coverage)) i.coverage = "approx";
  if (!["estimate", "custom"].includes(i.cocMode)) i.cocMode = "estimate";
  if (Array.isArray(d.equipment)) result.equipment = d.equipment.filter((p) => {
    if (!p || typeof p !== "object") return false;
    const e = p;
    return typeof e.name === "string" && typeof e.conditions === "string" && typeof e.source === "string" && typeof e.steps === "string" && typeof e.minDenominator === "number" && !!e.table && typeof e.table === "object" && equipmentValid(e);
  });
  return result;
}
function snapshot(state, previous) {
  const inputs = { ...state.inputs };
  for (const key of Object.keys(inputs)) {
    const value = inputs[key];
    if (typeof value === "number" && !Number.isFinite(value)) Object.assign(inputs, { [key]: previous[key] });
  }
  return JSON.parse(JSON.stringify({ ...state, inputs }));
}

// src/view.ts
var import_obsidian = require("obsidian");

// src/diagram.ts
var ns = "http://www.w3.org/2000/svg";
var nextId = 0;
function diagram(host, i) {
  host.replaceChildren();
  if (!Number.isFinite(i.diagramMax) || i.diagramMax <= 0) return;
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 320 230");
  svg.setAttribute("role", "img");
  svg.setAttribute("aria-label", "\uCE74\uBA54\uB77C \uC2EC\uB3C4\uC640 \uD50C\uB798\uC2DC \uB178\uCD9C \uAC70\uB9AC\uC758 \uB3C5\uB9BD \uCD95 \uB3C4\uC2DD. \uC2E4\uC81C \uBC30\uAD11 \uC9C0\uB3C4\uAC00 \uC544\uB2D9\uB2C8\uB2E4.");
  host.append(svg);
  function el(tag, attrs, text, parent = svg) {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text) n.textContent = text;
    parent.append(n);
    return n;
  }
  const id = `pfm-hatch-${++nextId}`;
  const defs = el("defs", {}), pat = el("pattern", { id, width: 6, height: 6, patternUnits: "userSpaceOnUse" }, void 0, defs);
  el("path", { d: "M0 6 L6 0", stroke: "currentColor", "stroke-width": 1 }, void 0, pat);
  const x = (d) => 20 + 280 * Math.max(0, Math.min(d / i.diagramMax, 1));
  const marker = (d, y) => el("line", { x1: x(d), x2: x(d), y1: y - 15, y2: y + 15, stroke: "var(--text-accent)", "stroke-width": 2 });
  el("text", { x: 20, y: 16 }, `\uB3C5\uB9BD \uAC70\uB9AC \uCD95 \xB7 0 \u2192 ${metres(i.diagramMax)}`);
  try {
    const o = optics(i);
    el("text", { x: 20, y: 38 }, "\uCE74\uBA54\uB77C: \uCD08\uC810\xB7\uC2EC\uB3C4");
    el("line", { x1: 20, x2: 300, y1: 66, y2: 66, stroke: "currentColor" });
    el("rect", { x: x(o.near), y: 51, width: Math.max(0, x(o.far) - x(o.near)), height: 30, fill: `url(#${id})` });
    marker(i.cameraDistance, 66);
    el("text", { x: 20, y: 99 }, `\uC2EC\uB3C4 ${o.near > i.diagramMax ? "\u2192 " : ""}${metres(o.near)} ~ ${o.far > i.diagramMax && o.far !== Infinity ? "\u2192 " : ""}${metres(o.far)}`);
  } catch {
    el("text", { x: 20, y: 66 }, "\uC2EC\uB3C4 \uC785\uB825\uC744 \uD655\uC778\uD558\uC138\uC694.");
  }
  try {
    const f = flash(i);
    el("text", { x: 20, y: 124 }, "\uD50C\uB798\uC2DC: \uACFC\uB2E4 / \uBE57\uAE08=\uD5C8\uC6A9 / \uBD80\uC871");
    el("rect", { x: 20, y: 136, width: x(f.low) - 20, height: 28, fill: "var(--color-orange)", "fill-opacity": 0.25, stroke: "currentColor", "stroke-dasharray": "2 3" });
    el("rect", { x: x(f.low), y: 136, width: x(f.high) - x(f.low), height: 28, fill: `url(#${id})` });
    el("rect", { x: x(f.high), y: 136, width: 300 - x(f.high), height: 28, fill: "var(--color-blue)", "fill-opacity": 0.2, stroke: "currentColor", "stroke-dasharray": "6 3" });
    marker(f.r, 150);
    el("text", { x: 20, y: 186 }, `\uD5C8\uC6A9 ${f.low > i.diagramMax ? "\u2192 " : ""}${metres(f.low)} ~ ${f.high > i.diagramMax ? "\u2192 " : ""}${metres(f.high)}`);
    el("text", { x: 20, y: 207 }, `\uC801\uC815 ${f.d > i.diagramMax ? "\u2192 " : ""}${metres(f.d)} \xB7 \uD53C\uC0AC\uCCB4 ${f.r > i.diagramMax ? "\u2192 " : ""}${metres(f.r)}`);
  } catch {
    el("text", { x: 20, y: 155 }, "\uD50C\uB798\uC2DC: \uACC4\uC0B0\uD560 \uC218 \uC5C6\uB294 \uC870\uAC74");
  }
  try {
    const c = coverage(i);
    const geometry = document.createElementNS(ns, "svg");
    geometry.setAttribute("viewBox", "0 0 320 160");
    geometry.setAttribute("role", "img");
    geometry.setAttribute("aria-label", i.linked ? "\uAC19\uC740 \uC704\uCE58\uC640 \uBC29\uD5A5\uC5D0\uC11C \uC218\uD3C9 \uD654\uAC01 \uBC0F \uC870\uC0AC\uAC01 \uC6D0\uBFD4 \uBE44\uAD50" : "\uD654\uAC01\uACFC \uC870\uC0AC\uAC01\uC758 \uC815\uADDC\uD654\uB41C \uB3C5\uB9BD \uB3C4\uC2DD, \uC704\uCE58 \uC911\uCCA9 \uBE44\uAD50 \uC544\uB2D8");
    host.append(geometry);
    const cam = Math.tan(angleHalf(i.width, i.focal)), beam = Math.tan(c.h * Math.PI / 360), scale = 45 / Math.max(cam, beam);
    const cone = (s, cl, origin) => {
      const n = document.createElementNS(ns, "path");
      n.setAttribute("d", `M20 ${origin} L300 ${origin - s * scale} L300 ${origin + s * scale} Z`);
      n.setAttribute("class", cl);
      geometry.append(n);
    };
    if (i.linked) {
      cone(cam, "pfm-camera-cone", 75);
      cone(beam, "pfm-flash-cone", 75);
    } else {
      cone(cam, "pfm-camera-cone", 45);
      cone(beam, "pfm-flash-cone", 110);
    }
    const label = document.createElementNS(ns, "text");
    label.setAttribute("x", "20");
    label.setAttribute("y", "155");
    label.textContent = i.linked ? "\uC2E4\uC120=\uCE74\uBA54\uB77C \xB7 \uC810\uC120=\uD50C\uB798\uC2DC (\uADE0\uC77C \uAD11\uB7C9 \uC544\uB2D8)" : "\uB3C5\uB9BD \uC815\uADDC\uD654 \uC6D0\uBFD4 \xB7 \uC815\uD655\uD55C \uACF5\uAC04 \uC911\uCCA9 \uC544\uB2D8";
    geometry.append(label);
    const p = document.createElement("p");
    p.textContent = `\uC218\uD3C9 \uC870\uC0AC\uAC01 ${fmt(c.h)}\xB0 \xB7 \uC218\uC9C1 ${fmt(c.v)}\xB0. ${i.coverage === "approx" ? "\uD480\uD504\uB808\uC784 \uCEE4\uBC84\uB9AC\uC9C0 \uAC00\uC815. \uC81C\uC870\uC0AC \uC790\uB8CC \uC544\uB2D8." : "\uC218\uB3D9 \uC870\uC0AC\uAC01."}`;
    host.append(p);
  } catch {
  }
}
function angleHalf(size, f) {
  return Math.atan(size / (2 * f));
}

// src/note.ts
var limitations = "\uC218\uB3D9 \uD50C\uB798\uC2DC\xB7\uC9C1\uC811\uAD11\xB7\uC77C\uBC18 \uB3D9\uC870\xB7\uC911\uC2EC\uBD80 \uB178\uCD9C\uC758 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC2E4\uC81C \uBC30\uAD11\xB7\uBC18\uC0AC\uC728\xB7\uD658\uACBD\uAD11\xB7\uC7A5\uBE44 \uD3B8\uCC28\uB97C \uD3EC\uD568\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. TTL, HSS, \uBC14\uC6B4\uC2A4, \uC18C\uD504\uD2B8\uBC15\uC2A4, \uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0\uC740 \uC774 \uAE30\uBCF8 \uBAA8\uB378\uB85C \uD655\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC190\uC2E4 \uBCF4\uC815\uC740 \uCD94\uC815\uC774\uBA70 GN\uC5D0 \uC774\uBBF8 \uD3EC\uD568\uB41C \uC190\uC2E4\uC744 \uC911\uBCF5 \uC801\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694.";
function note(i, date = /* @__PURE__ */ new Date()) {
  const lines = ["# \uC0AC\uC9C4 \uCD2C\uC601 \uACC4\uC0B0", `
\uB0A0\uC9DC: ${date.toISOString()} (${date.toLocaleString("ko-KR")}, \uAE30\uAE30 \uD604\uC9C0 \uC2DC\uAC01)`, `
## \uC785\uB825\uAC12
`, `| \uD56D\uBAA9 | \uAC12 |`, `| --- | --- |`];
  const labels = { sensor: "\uC13C\uC11C \uD504\uB9AC\uC14B", width: "\uC13C\uC11C \uAC00\uB85C mm", height: "\uC13C\uC11C \uC138\uB85C mm", focal: "\uC2E4\uC81C \uCD08\uC810\uAC70\uB9AC mm", aperture: "\uC870\uB9AC\uAC1C f/", iso: "ISO", cameraDistance: "\uCE74\uBA54\uB77C \uAC70\uB9AC m", linked: "\uC628\uCE74\uBA54\uB77C \uC5F0\uB3D9", flashDistance: "\uBCC4\uB3C4 \uD50C\uB798\uC2DC \uAC70\uB9AC m", cocMode: "CoC \uBC29\uC2DD", coc: "\uC0AC\uC6A9\uC790 CoC mm", gn: "ISO100 \uCD5C\uB300 \uCD9C\uB825 GN", gnUnit: "GN \uB2E8\uC704", gnZoom: "GN \uCE21\uC815 \uC90C mm", zoom: "\uC120\uD0DD \uD50C\uB798\uC2DC \uC90C mm", conditions: "GN \uC870\uAC74", denominator: "\uCD9C\uB825 1/n\uC758 n", loss: "\uCD94\uAC00 \uC190\uC2E4 stop", tolerance: "\uD5C8\uC6A9 \uC624\uCC28 \xB1EV", minDenominator: "\uCD5C\uC18C \uCD9C\uB825 1/n\uC758 n", steps: "\uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8", coverage: "\uC870\uC0AC\uAC01 \uBC29\uC2DD (approx=\uD480\uD504\uB808\uC784 \uAC00\uC815)", horizontal: "\uC9C1\uC811 \uC785\uB825 \uC218\uD3C9 \uC870\uC0AC\uAC01 \xB0", vertical: "\uC9C1\uC811 \uC785\uB825 \uC218\uC9C1 \uC870\uC0AC\uAC01 \xB0", mode: "\uBC1C\uAD11 \uC870\uAC74", diagramMax: "\uADF8\uB9BC \uCD5C\uB300 \uAC70\uB9AC m", tab: "\uD654\uBA74" };
  for (const key of Object.keys(labels)) lines.push(`| ${labels[key]} | ${String(i[key]).replace(/\|/g, "\\|").replace(/\n/g, " / ")} |`);
  lines.push("\n## \uACC4\uC0B0 \uACB0\uACFC\n");
  try {
    const f = flash(i);
    lines.push(`- \uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC: ${metres(f.d)}`, `- \uD50C\uB798\uC2DC\u2013\uD53C\uC0AC\uCCB4 \uAC70\uB9AC: ${metres(f.r)} \xB7 \uB178\uCD9C \uCC28\uC774: ${fmt(f.ev)} EV (${f.ev > 0 ? "\uC608\uC0C1 \uACFC\uB2E4" : f.ev < 0 ? "\uC608\uC0C1 \uBD80\uC871" : "\uAE30\uC900 \uC801\uC815"})`, `- \uC720\uD6A8 GN(m): ${fmt(f.gn)}`, `- \xB1${i.tolerance}EV \uAC70\uB9AC \uAD6C\uAC04: ${metres(f.low)} ~ ${metres(f.high)}`, `- \uD544\uC694\uD55C \uC870\uB9AC\uAC1C f/${fmt(f.requiredAperture)} \xB7 \uD544\uC694 \uCD9C\uB825 ${fmt(f.needed * 100)}% \xB7 ${f.status}`, `- \uAC00\uAE4C\uC6B4 \uC9C0\uC6D0 \uB2E8\uACC4 1/${f.nearest}, \uB0A8\uB294 \uB178\uCD9C \uC624\uCC28 ${fmt(f.residual)} EV`);
    lines.push("\n### \uCD9C\uB825\uBCC4 \uAC70\uB9AC\n", "| \uCD9C\uB825 | \uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC |", "| --- | --- |", ...f.distances.map((x) => `| 1/${x.n} | ${metres(x.d)} |`));
  } catch (e) {
    lines.push(`- \uD50C\uB798\uC2DC \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    const o = optics(i);
    lines.push(`
- \uC2EC\uB3C4 \uADFC\uAC70\uB9AC ${metres(o.near)} / \uC6D0\uAC70\uB9AC ${metres(o.far)} / \uC804\uCCB4 ${metres(o.total)}`, `- \uACFC\uCD08\uC810\uAC70\uB9AC ${metres(o.hyperfocal)} \xB7 CoC ${fmt(o.c, 5)} mm`, `- \uC218\uD3C9/\uC218\uC9C1/\uB300\uAC01 \uD654\uAC01 ${fmt(o.horizontal)}\xB0 / ${fmt(o.vertical)}\xB0 / ${fmt(o.diagonal)}\xB0`, `- 35mm \uD658\uC0B0 \uCD08\uC810\uAC70\uB9AC ${fmt(o.equivalent)} mm`, `- \uD68C\uC808 Airy \uC9C0\uB984 (\uD30C\uC7A5 550nm) ${fmt(o.airy, 5)} mm, CoC \uB300\uBE44 ${fmt(o.airy / o.c)}\uBC30 (\uADFC\uC0AC)`);
  } catch (e) {
    lines.push(`- \uAD11\uD559 \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    const c = coverage(i);
    lines.push(`- \uCE74\uBA54\uB77C \uD504\uB808\uC784 ${fmt(c.camera.width)} \xD7 ${fmt(c.camera.height)} m (\uCE74\uBA54\uB77C \uAC70\uB9AC \uD3C9\uBA74)`, `- \uD50C\uB798\uC2DC \uC870\uC0AC \uBC94\uC704 ${fmt(c.flash.width)} \xD7 ${fmt(c.flash.height)} m (\uD50C\uB798\uC2DC \uAC70\uB9AC \uD3C9\uBA74)`, `- \uC870\uC0AC\uAC01 ${fmt(c.h)}\xB0 \xD7 ${fmt(c.v)}\xB0 \xB7 ${i.coverage === "approx" ? "\uD480\uD504\uB808\uC784 \uCEE4\uBC84\uB9AC\uC9C0 \uAC00\uC815, \uC81C\uC870\uC0AC \uC0AC\uC591 \uC544\uB2D8" : "\uC218\uB3D9 \uC785\uB825 \uC870\uC0AC\uAC01"}`, `- ${i.linked ? c.narrow ? "\uD504\uB808\uC784 \uAC00\uC7A5\uC790\uB9AC \uAD11\uB7C9 \uBD80\uC871 \uAC00\uB2A5\uC131" : "\uB3D9\uC77C \uC704\uCE58\xB7\uBC29\uD5A5 \uAC00\uC815\uC758 \uBC94\uC704 \uBE44\uAD50" : "\uC624\uD504\uCE74\uBA54\uB77C: \uC704\uCE58\xB7\uBC29\uD5A5 \uBBF8\uC785\uB825, \uACF5\uAC04 \uC911\uCCA9 \uBE44\uAD50 \uBD88\uAC00"}`);
  } catch (e) {
    lines.push(`- \uC870\uC0AC \uBC94\uC704 \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  lines.push(
    "\n## \uC870\uAC74\uACFC \uD55C\uACC4\n",
    limitations,
    "\uBE5B\uC740 \uC608\uC0C1 \uAC70\uB9AC\uC5D0\uC11C \uB05D\uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uAC00\uAE4C\uC6B0\uBA74 \uACFC\uB2E4 \uB178\uCD9C\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4. CoC=\uC13C\uC11C \uB300\uAC01/1500\uC740 \uAC10\uC0C1 \uD06C\uAE30\xB7\uC2DC\uB825\xB7\uD655\uB300\uC728\uC5D0 \uC758\uC874\uD558\uB294 \uACBD\uD5D8\uC801 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC9C1\uC120\uD22C\uC601 \uBC15\uB9C9\uB80C\uC988 \uBAA8\uB378\uC774\uBA70 \uADFC\uC811 \uCD2C\uC601\xB7\uD3EC\uCEE4\uC2A4 \uBE0C\uB9AC\uB529\xB7\uB3D9\uACF5 \uBC30\uC728\uC740 \uBC18\uC601\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    "\n## \uACF5\uC2DD\n",
    "\uC720\uD6A8 GN = G\u221Ap\u221A(ISO/100) \xD7 2^(\u2212L/2), d = \uC720\uD6A8 GN/N, \uD544\uC694 p = (Nr/G)\xB2(100/ISO)2^L, EV = 2log\u2082(d/r).",
    "H=f\xB2/(N\xB7CoC)+f, h=H\u2212f, Dnear=h\xB7s/(h+s\u2212f), Dfar=h\xB7s/(h\u2212s+f); s\u2265H\uC774\uBA74 \uC6D0\uAC70\uB9AC \u221E. \uAD11\uD559 \uAE38\uC774\uB294 mm\uB85C \uD1B5\uC77C \uD6C4 m\uB85C \uD45C\uC2DC.",
    "\n## \uCD9C\uCC98\n",
    "\uC2EC\uB3C4\xB7\uD654\uAC01 \uD45C\uD604\uC758 \uAE30\uBC18: [depth-of-field](https://github.com/jherr/depth-of-field), Jack Herrington, Copyright (c) 2026 Jack Herrington, MIT. \uCC38\uACE0 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. \uBAA8\uBC14\uC77C\uC6A9 \uC7AC\uAD6C\uD604\xB7\uC218\uC815 \uBC0F \uD50C\uB798\uC2DC \uD655\uC7A5. \uACF5\uC2DD\xB7\uD6C4\uC6D0 \uD50C\uB7EC\uADF8\uC778\uC774 \uC544\uB2D9\uB2C8\uB2E4.",
    "[\uC2EC\uB3C4 \uACF5\uC2DD](https://dofmaster.com/equations.html) \xB7 [GN \uAE30\uBCF8 \uAD00\uACC4 Nikon](https://download.nikonimglib.com/archive2/rOYAB007rd7k028ePIg11W7lyc97/SB-500_CH%28En%2904.pdf)"
  );
  return lines.join("\n") + "\n";
}

// src/view.ts
var VIEW = "photo-field-mobile";
function node(parent, tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== void 0) e.textContent = text;
  if (cls) e.className = cls;
  parent.append(e);
  return e;
}
var PhotoView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.aborters = [];
    this.detailState = /* @__PURE__ */ new Map();
    this.numeric = /* @__PURE__ */ new Map();
  }
  getViewType() {
    return VIEW;
  }
  getDisplayText() {
    return "\uC0AC\uC9C4 \uCD2C\uC601 \uB3C4\uC6B0\uBBF8";
  }
  getIcon() {
    return "camera";
  }
  async onOpen() {
    this.containerEl.dataset.ignoreSwipe = "true";
    this.render();
  }
  async onClose() {
    delete this.containerEl.dataset.ignoreSwipe;
    this.clean();
    this.contentEl.replaceChildren();
  }
  clean() {
    for (const a of this.aborters) a.abort();
    this.aborters.length = 0;
    this.numeric.clear();
    this.power = void 0;
  }
  listen(el, event, fn) {
    const a = new AbortController();
    el.addEventListener(event, fn, { signal: a.signal });
    this.aborters.push(a);
  }
  changed() {
    if (this.plugin.state.inputs.linked) {
      this.plugin.update("flashDistance", this.plugin.state.inputs.cameraDistance);
      this.syncNumeric("flashDistance");
    }
    this.paint();
    void this.plugin.persist().catch((e) => this.plugin.report(e));
    this.plugin.refresh(this);
  }
  button(parent, text, fn) {
    const b = node(parent, "button", text);
    b.type = "button";
    this.listen(b, "click", fn);
    return b;
  }
  number(parent, label, key, options) {
    const wrap = node(parent, "label", void 0, "pfm-field");
    node(wrap, "span", label);
    const input = node(wrap, "input");
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "any";
    input.value = Number.isFinite(this.plugin.state.inputs[key]) ? String(this.plugin.state.inputs[key]) : "";
    input.dataset.key = key;
    input.setAttribute("aria-label", label);
    let range;
    if (options) {
      input.min = String(options.min);
      range = node(wrap, "input");
      range.type = "range";
      range.min = String(options.min);
      range.max = String(options.max);
      range.step = String(options.step);
      range.value = input.value;
      range.setAttribute("aria-label", `${label} \uBE60\uB978 \uC870\uC808`);
      range.dataset.range = key;
      const r = range;
      this.listen(r, "input", () => {
        input.value = r.value;
        input.setAttribute("aria-invalid", "false");
        this.plugin.update(key, Number(r.value));
        this.changed();
      });
    }
    this.numeric.set(key, { input, range });
    this.listen(input, "input", () => {
      const v = parseNumber(input.value);
      this.plugin.update(key, v);
      if (key === "denominator") this.syncPower();
      if (range && Number.isFinite(v)) range.value = String(v);
      input.setAttribute("aria-invalid", String(!Number.isFinite(v) || v < 0 || v === 0 && key !== "loss"));
      this.changed();
    });
  }
  select(parent, label, key, values, after) {
    const l = node(parent, "label", void 0, "pfm-field");
    node(l, "span", label);
    const s = node(l, "select");
    s.setAttribute("aria-label", label);
    s.dataset.key = key;
    for (const [v, t] of Object.entries(values)) {
      const o = node(s, "option", t);
      o.value = v;
    }
    s.value = String(this.plugin.state.inputs[key]);
    this.listen(s, "change", () => {
      this.plugin.update(key, s.value);
      after?.();
      this.changed();
    });
    return s;
  }
  text(parent, label, value) {
    const l = node(parent, "label", void 0, "pfm-field");
    node(l, "span", label);
    const t = node(l, "input");
    t.type = "text";
    t.value = value;
    return t;
  }
  details(label) {
    const d = node(this.root, "details");
    node(d, "summary", label);
    return node(d, "div", void 0, "pfm-settings");
  }
  rememberDetails() {
    if (!this.root) return;
    for (const d of this.root.querySelectorAll("details")) {
      const label = d.querySelector("summary")?.textContent;
      if (label) this.detailState.set(label, d.open);
    }
  }
  restoreDetails() {
    for (const d of this.root.querySelectorAll("details")) {
      const label = d.querySelector("summary")?.textContent;
      if (label) d.open = this.detailState.get(label) ?? false;
    }
  }
  syncPower() {
    if (!this.power) return;
    this.power.querySelector("[data-custom]")?.remove();
    const value = this.plugin.state.inputs.denominator;
    if (Number.isFinite(value) && ![1, 2, 4, 8, 16, 32, 64, 128, 256].includes(value)) {
      const option = node(this.power, "option", `\uC0AC\uC6A9\uC790 1/${value}`);
      option.value = String(value);
      option.dataset.custom = "true";
    }
    this.power.value = String(value);
  }
  syncNumeric(key) {
    const pair = this.numeric.get(key);
    if (pair) {
      const value = this.plugin.state.inputs[key];
      pair.input.value = typeof value === "number" && !Number.isFinite(value) ? "" : String(value);
      if (pair.range) pair.range.value = pair.input.value;
    }
    if (key === "denominator") this.syncPower();
  }
  render() {
    this.rememberDetails();
    this.clean();
    this.contentEl.replaceChildren();
    this.contentEl.addClass("pfm-container");
    this.root = node(this.contentEl, "div", void 0, "pfm-root");
    const i = this.plugin.state.inputs;
    const header = node(this.root, "header");
    node(header, "p", "PHOTO FIELD / OFFLINE", "pfm-eyebrow");
    node(header, "h1", "\uC0AC\uC9C4 \uCD2C\uC601 \uB3C4\uC6B0\uBBF8");
    node(header, "p", "\uC870\uB9AC\uAC1C \uD558\uB098\uB85C, \uBE5B\uACFC \uC2EC\uB3C4\uB97C \uD568\uAED8.");
    const tabs = node(this.root, "nav", void 0, "pfm-tabs");
    tabs.setAttribute("aria-label", "\uACC4\uC0B0 \uD654\uBA74");
    for (const [v, t] of Object.entries({ flash: "\uD50C\uB798\uC2DC", dof: "\uC2EC\uB3C4\xB7\uD654\uAC01", combined: "\uD1B5\uD569" })) {
      const b = this.button(tabs, t, () => {
        this.plugin.update("tab", v);
        this.changed();
        for (const btn of tabs.querySelectorAll("button")) btn.setAttribute("aria-pressed", String(btn === b));
      });
      b.setAttribute("aria-pressed", String(i.tab === v));
    }
    this.results = node(this.root, "section", void 0, "pfm-results");
    this.results.setAttribute("aria-live", "polite");
    const quick = node(this.root, "section", void 0, "pfm-quick");
    node(quick, "h2", "\uBE60\uB978 \uC870\uC808");
    this.number(quick, "\uC870\uB9AC\uAC1C f-number", "aperture", { min: 0.7, max: 32, step: 0.1 });
    const power = this.select(quick, "\uCD9C\uB825 \uC120\uD0DD", "denominator", Object.fromEntries([1, 2, 4, 8, 16, 32, 64, 128, 256].map((n) => [n, `1/${n}`])), () => {
      this.plugin.update("denominator", Number(power.value));
      this.syncNumeric("denominator");
    });
    this.power = power;
    this.syncPower();
    this.number(quick, "\uC0AC\uC6A9\uC790 \uCD9C\uB825 1/n \xB7 n", "denominator");
    this.number(quick, "\uCE74\uBA54\uB77C \u2192 \uD53C\uC0AC\uCCB4 \uAC70\uB9AC (m)", "cameraDistance", { min: 0.1, max: 30, step: 0.1 });
    const linked = node(quick, "label", void 0, "pfm-check");
    const check = node(linked, "input");
    check.type = "checkbox";
    check.checked = i.linked;
    node(linked, "span", "\uC628\uCE74\uBA54\uB77C: \uAC19\uC740 \uC704\uCE58\xB7\uBC29\uD5A5, \uAC70\uB9AC \uC5F0\uB3D9");
    this.listen(check, "change", () => {
      this.plugin.update("linked", check.checked);
      this.numeric.get("flashDistance").input.disabled = check.checked;
      this.changed();
    });
    this.number(quick, "\uD50C\uB798\uC2DC \u2192 \uD53C\uC0AC\uCCB4 \uAC70\uB9AC (m)", "flashDistance", { min: 0.1, max: 30, step: 0.1 });
    this.numeric.get("flashDistance").input.disabled = i.linked;
    const flashRange = this.numeric.get("flashDistance").range;
    if (flashRange) flashRange.disabled = i.linked;
    this.listen(check, "change", () => {
      const r = this.numeric.get("flashDistance")?.range;
      if (r) r.disabled = check.checked;
    });
    this.picture = node(this.root, "figure", void 0, "pfm-diagram");
    const camera = this.details("\uCE74\uBA54\uB77C\xB7\uB80C\uC988\xB7CoC");
    this.select(camera, "\uC13C\uC11C \uD504\uB9AC\uC14B", "sensor", { ...Object.fromEntries(Object.entries(sensors).map(([k, v]) => [k, v.name])), custom: "\uC0AC\uC6A9\uC790 \uC9C0\uC815" }, () => {
      const preset = sensors[this.plugin.state.inputs.sensor];
      if (preset) {
        this.plugin.update("width", preset.width);
        this.plugin.update("height", preset.height);
        this.syncNumeric("width");
        this.syncNumeric("height");
      }
    });
    this.number(camera, "\uC13C\uC11C \uAC00\uB85C (mm)", "width");
    this.number(camera, "\uC13C\uC11C \uC138\uB85C (mm)", "height");
    for (const key of ["width", "height"]) this.listen(this.numeric.get(key).input, "input", () => {
      this.plugin.update("sensor", "custom");
      const s = camera.querySelector("select[data-key=sensor]");
      if (s) s.value = "custom";
      void this.plugin.persist().catch((e) => this.plugin.report(e));
    });
    this.number(camera, "\uC2E4\uC81C \uCD08\uC810\uAC70\uB9AC (mm)", "focal");
    this.number(camera, "ISO", "iso");
    this.select(camera, "CoC \uBC29\uC2DD", "cocMode", { estimate: "\uC13C\uC11C \uB300\uAC01 \xF71500 \uCD94\uC815", custom: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 mm" });
    this.number(camera, "\uC0AC\uC6A9\uC790 CoC (mm)", "coc");
    node(camera, "p", "CoC\uB294 \uAC10\uC0C1 \uD06C\uAE30\xB7\uC2DC\uB825\xB7\uD655\uB300\uC728\uC5D0 \uB530\uB978 \uD5C8\uC6A9 \uCC29\uB780\uC6D0\uC785\uB2C8\uB2E4. \uB300\uAC01/1500\uC740 \uACBD\uD5D8\uC801 \uAE30\uBCF8\uAC12\uC774\uBA70 \uD53D\uC140 \uB2E8\uC704 \uC120\uBA85\uB3C4\uB97C \uBCF4\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. APS-C \uD06C\uAE30\uB294 \uC81C\uC870\uC0AC\uB9C8\uB2E4 \uB2E4\uB985\uB2C8\uB2E4.");
    const fl = this.details("\uD50C\uB798\uC2DC\xB7GN \uC870\uAC74\xB7\uC870\uC0AC\uAC01");
    this.select(fl, "\uBC1C\uAD11 \uC870\uAC74", "mode", { manual: "\uC218\uB3D9 \xB7 \uC9C1\uC811\uAD11 \xB7 \uC77C\uBC18 \uB3D9\uC870", ttl: "TTL (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", hss: "HSS (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", bounce: "\uBC14\uC6B4\uC2A4 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", modifier: "\uC18C\uD504\uD2B8\uBC15\uC2A4 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", near: "\uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)" });
    this.number(fl, "\uC120\uD0DD \uD50C\uB798\uC2DC \uC90C (mm)", "zoom");
    this.number(fl, "ISO100 \xB7 \uCD5C\uB300 \uCD9C\uB825 GN", "gn");
    let lastUnit = i.gnUnit;
    this.select(fl, "GN \uB2E8\uC704", "gnUnit", { m: "m \uAE30\uC900", ft: "ft \uAE30\uC900" }, () => {
      const unit = this.plugin.state.inputs.gnUnit;
      const value = this.plugin.state.inputs.gn;
      if (unit !== lastUnit) {
        this.plugin.update("gn", unit === "ft" ? metresToFeet(value) : feetToMetres(value));
        this.syncNumeric("gn");
        lastUnit = unit;
      }
    });
    this.number(fl, "GN\uC774 \uCE21\uC815\uB41C \uC90C (mm)", "gnZoom");
    const cond = this.text(fl, "GN \uCE21\uC815 \uC870\uAC74\xB7\uCD9C\uCC98 (ISO100 \uCD5C\uB300 \uCD9C\uB825)", i.conditions);
    this.listen(cond, "input", () => {
      this.plugin.update("conditions", cond.value);
      this.changed();
    });
    this.number(fl, "\uCD94\uAC00 \uAD11\uB7C9 \uC190\uC2E4 L (stop, \uAE30\uBCF8 0)", "loss");
    node(fl, "p", "GN\uC5D0 \uC774\uBBF8 \uD3EC\uD568\uB41C \uC190\uC2E4\uC744 \uC911\uBCF5 \uC801\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694. \uC190\uC2E4 \uBCF4\uC815\uC740 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC90C \uBCC0\uACBD \uC2DC \uD574\uB2F9 \uC90C\uC758 GN \uC790\uB8CC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
    this.number(fl, "\uC7A5\uBE44 \uCD5C\uC18C \uCD9C\uB825 1/n \xB7 n", "minDenominator");
    const steps = this.text(fl, "\uC7A5\uBE44 \uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8 (\uC27C\uD45C \uAD6C\uBD84)", i.steps);
    this.listen(steps, "input", () => {
      this.plugin.update("steps", steps.value);
      this.changed();
    });
    this.select(fl, "\uC870\uC0AC\uAC01 \uC785\uB825 \uBC29\uC2DD", "coverage", { approx: "\uD480\uD504\uB808\uC784 \uCEE4\uBC84\uB9AC\uC9C0 \uAC00\uC815 (\uADFC\uC0AC)", angles: "\uC218\uD3C9\xB7\uC218\uC9C1 \uC870\uC0AC\uAC01 \uC9C1\uC811 \uC785\uB825" });
    this.number(fl, "\uC218\uD3C9 \uC870\uC0AC\uAC01 (\xB0)", "horizontal");
    this.number(fl, "\uC218\uC9C1 \uC870\uC0AC\uAC01 (\xB0)", "vertical");
    node(fl, "p", "\uC90C mm \uADFC\uC0AC \uBAA8\uB4DC\uB294 36\xD724mm \uC9C1\uC120\uD22C\uC601 \uD654\uAC01\uC744 \uAC00\uC815\uD569\uB2C8\uB2E4. \uC81C\uC870\uC0AC \uAE30\uC900 \uD3EC\uB9F7\uC744 \uD655\uC778\uD55C \uC2E4\uCE21 \uC870\uC0AC\uAC01\uC774 \uC788\uC73C\uBA74 \uC9C1\uC811 \uC785\uB825\uD558\uC138\uC694.");
    this.equipmentPanel();
    const advanced = this.details("\uD5C8\uC6A9 \uBC94\uC704\xB7\uADF8\uB9BC \uBC94\uC704\xB7\uACC4\uC0B0 \uADFC\uAC70");
    this.number(advanced, "\uC801\uC815 \uB178\uCD9C \uD5C8\uC6A9 \uBC94\uC704 \xB1EV", "tolerance");
    this.number(advanced, "\uADF8\uB9BC \uCD5C\uB300 \uAC70\uB9AC (m)", "diagramMax");
    const hyper = this.button(advanced, "\uACFC\uCD08\uC810\uAC70\uB9AC\uC5D0 \uCD08\uC810 \uB9DE\uCD94\uAE30", () => {
      try {
        this.plugin.update("cameraDistance", optics(this.plugin.state.inputs).hyperfocal);
        this.syncNumeric("cameraDistance");
        this.changed();
      } catch (e) {
        this.plugin.report(e);
      }
    });
    hyper.className = "pfm-wide";
    node(advanced, "p", "\uC720\uD6A8 GN=G\u221Ap\u221A(ISO/100)\xD72^(\u2212L/2), \uC801\uC815 \uAC70\uB9AC=GN/f-number. \uD544\uC694 \uCD9C\uB825=(Nr/G)\xB2(100/ISO)2^L. \uB178\uCD9C \uCC28\uC774=2log\u2082(d/r). \uC591\uC218=\uC608\uC0C1 \uACFC\uB2E4, \uC74C\uC218=\uC608\uC0C1 \uBD80\uC871. \uBE5B\uC774 \uC774 \uAC70\uB9AC\uC5D0\uC11C \uB05D\uB098\uB294 \uAC83\uC740 \uC544\uB2D9\uB2C8\uB2E4.");
    node(advanced, "p", "H=f\xB2/(N\xB7CoC)+f, h=H\u2212f. \uADFC\uAC70\uB9AC=hs/(h+s\u2212f), \uC6D0\uAC70\uB9AC=hs/(h\u2212s+f). s\u2265H\uC774\uBA74 \u221E. \uAD11\uD559\uC740 mm, \uCD9C\uB825\uC740 m. \uC9C1\uC120\uD22C\uC601 \uD654\uAC01=2atan(\uC13C\uC11C \uAE38\uC774/2f). \uC870\uC0AC \uBC94\uC704=2r\xB7tan(\uAC01/2).");
    node(advanced, "p", limitations);
    const about = this.details("\uD50C\uB7EC\uADF8\uC778 \uC815\uBCF4\xB7\uC6D0\uBCF8 \uC800\uC791\uAD8C");
    node(about, "p", `\uC0AC\uC9C4 \uCD2C\uC601 \uB3C4\uC6B0\uBBF8 ${this.plugin.manifest.version} \xB7 depth-of-field\uC758 \uC2EC\uB3C4\xB7\uD654\uAC01 \uC2DC\uAC01\uD654\uB97C \uBAA8\uBC14\uC77C Obsidian\uC6A9\uC73C\uB85C \uC218\uC815\xB7\uC7AC\uAD6C\uD604\uD558\uACE0 \uC218\uB3D9 \uD50C\uB798\uC2DC \uACC4\uC0B0\uC744 \uD655\uC7A5\uD588\uC2B5\uB2C8\uB2E4. \uC6D0\uC791\uC790\uC758 \uACF5\uC2DD \uB610\uB294 \uD6C4\uC6D0 \uD50C\uB7EC\uADF8\uC778\uC774 \uC544\uB2D9\uB2C8\uB2E4.`);
    const a = node(about, "a", "\uC6D0\uBCF8: Jack Herrington \xB7 depth-of-field");
    a.href = "https://github.com/jherr/depth-of-field";
    node(about, "p", "Copyright (c) 2026 Jack Herrington \xB7 MIT. \uCC38\uACE0 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. MIT \uC804\uBB38: main.js \uB0B4 \uACE0\uC9C0 \uBC0F \uBC30\uD3EC ZIP\uC758 vendor/depth-of-field-LICENSE.txt. \uC7AC\uC0AC\uC6A9 \uB0B4\uC5ED: GitHub\uC758 THIRD_PARTY_NOTICES.md.");
    const footer = node(this.root, "footer");
    const save = this.button(footer, "\uD604\uC7AC \uACC4\uC0B0\uC744 \uB178\uD2B8\uB85C \uC800\uC7A5", () => {
      save.disabled = true;
      void this.plugin.saveNote().catch((e) => this.plugin.report(e)).finally(() => {
        save.disabled = false;
      });
    });
    save.className = "mod-cta pfm-save";
    node(footer, "p", "\uC77C\uBC18 Markdown \xB7 \uC0C8 \uB178\uD2B8 \uC0DD\uC131 \xB7 \uC778\uD130\uB137 \uC5F0\uACB0 \uBD88\uD544\uC694");
    this.paint(false);
  }
  equipmentPanel() {
    const p = this.details("\uB0B4 \uC7A5\uBE44 \uD504\uB9AC\uC14B \xB7 \uC90C\uBCC4 GN \uD45C");
    node(p, "p", "\uC81C\uC870\uC0AC \uB0B4\uC7A5 \uC218\uCE58 \uC5C6\uC74C. \uC124\uBA85\uC11C\uB098 \uC2E4\uCE21 \uC790\uB8CC\uB97C \uC785\uB825\uD558\uC138\uC694. \uC544\uB798 GN\uC740 \uD604\uC7AC \uC120\uD0DD\uD55C m/ft \uB2E8\uC704\uB85C \uC77D\uACE0, \uC800\uC7A5 \uC2DC m\uB85C \uC815\uADDC\uD654\uD569\uB2C8\uB2E4.");
    const list = node(p, "select");
    list.setAttribute("aria-label", "\uC800\uC7A5\uB41C \uC7A5\uBE44");
    const placeholder = node(list, "option", "\uC7A5\uBE44 \uC120\uD0DD");
    placeholder.value = "";
    this.plugin.state.equipment.forEach((v, index) => {
      const o = node(list, "option", v.name);
      o.value = String(index);
    });
    this.button(p, "\uC120\uD0DD \uC7A5\uBE44\uC758 \uD604\uC7AC \uC90C GN \uC801\uC6A9", () => {
      const e = this.plugin.state.equipment[Number(list.value)];
      if (list.value === "" || !e) {
        new import_obsidian.Notice("\uC7A5\uBE44\uB97C \uC120\uD0DD\uD558\uC138\uC694.");
        return;
      }
      const i = this.plugin.state.inputs, g = e.table[String(i.zoom)];
      if (g === void 0) {
        this.plugin.update("gnZoom", 0);
        this.syncNumeric("gnZoom");
        this.changed();
        new import_obsidian.Notice("\uC120\uD0DD \uC7A5\uBE44\uC758 \uD604\uC7AC \uC90C GN\uC774 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uB3D9 \uC785\uB825\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        return;
      }
      Object.assign(i, { gn: g, gnUnit: "m", gnZoom: i.zoom, conditions: `${e.conditions} \xB7 \uCD9C\uCC98: ${e.source}`, minDenominator: e.minDenominator, steps: e.steps });
      void this.plugin.persist().catch((x) => this.plugin.report(x));
      this.render();
    });
    this.button(p, "\uC120\uD0DD \uC7A5\uBE44 \uC0AD\uC81C", () => {
      if (list.value === "") return;
      this.plugin.state.equipment.splice(Number(list.value), 1);
      void this.plugin.persist().catch((x) => this.plugin.report(x));
      this.render();
    });
    const name = this.text(p, "\uC0C8 \uC7A5\uBE44 \uC774\uB984", ""), conditions = this.text(p, "\uCE21\uC815 \uC870\uAC74 (ISO100\xB7\uCD5C\uB300 \uCD9C\uB825\xB7\uC9C1\uC811\uAD11 \uB4F1)", ""), source = this.text(p, "\uCD9C\uCC98 URL\xB7\uC124\uBA85\uC11C \uD398\uC774\uC9C0 \uB610\uB294 \uC2E4\uCE21 \uBC29\uBC95", "");
    const l = node(p, "label", void 0, "pfm-field");
    node(l, "span", "\uC90Cmm,GN \xB7 \uD55C \uC904\uC5D0 \uD55C \uCE21\uC815\uAC12");
    const table = node(l, "textarea");
    table.placeholder = "\uC90Cmm,GN";
    table.rows = 5;
    this.button(p, "\uC0C8 \uC7A5\uBE44 \uD504\uB9AC\uC14B \uC800\uC7A5", () => {
      try {
        const i = this.plugin.state.inputs;
        const e = { name: name.value.trim(), conditions: conditions.value.trim(), source: source.value.trim(), table: parseTable(table.value, i.gnUnit), minDenominator: i.minDenominator, steps: i.steps };
        if (!equipmentValid(e)) throw Error("\uC774\uB984\xB7\uCE21\uC815 \uC870\uAC74\xB7\uCD9C\uCC98\xB7\uC720\uD6A8\uD55C GN \uD45C\uC640 \uC9C0\uC6D0 \uCD9C\uB825\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        this.plugin.state.equipment.push(e);
        void this.plugin.persist().then(() => new import_obsidian.Notice("\uC7A5\uBE44 \uC800\uC7A5 \uC644\uB8CC")).catch((x) => this.plugin.report(x));
        this.render();
      } catch (e) {
        this.plugin.report(e);
      }
    });
  }
  paint(remember = true) {
    if (remember) this.rememberDetails();
    const i = this.plugin.state.inputs;
    this.results.replaceChildren();
    this.root.dataset.tab = i.tab;
    const flashPanel = node(this.results, "div", void 0, "pfm-flash-results");
    try {
      const f = flash(i);
      node(flashPanel, "p", "\uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC", "pfm-eyebrow");
      node(flashPanel, "div", metres(f.d), "pfm-hero");
      node(flashPanel, "p", `1/${i.denominator} \xB7 f/${fmt(i.aperture)} \xB7 ISO ${fmt(i.iso, 0)} \xB7 GN ${fmt(f.g)}m @ ${fmt(i.zoom)}mm`);
      node(flashPanel, "p", i.conditions, "pfm-conditions");
      const label = f.ev > i.tolerance ? "\uC608\uC0C1 \uACFC\uB2E4 \uB178\uCD9C" : f.ev < -i.tolerance ? "\uC608\uC0C1 \uBD80\uC871 \uB178\uCD9C" : "\uD5C8\uC6A9 \uBC94\uC704 \uB0B4";
      node(flashPanel, "p", `${metres(f.r)}\uC5D0\uC11C ${f.ev > 0 ? "+" : ""}${fmt(f.ev)} EV \xB7 ${label}`, "pfm-ev");
      node(flashPanel, "p", `\xB1${fmt(i.tolerance)}EV: ${metres(f.low)} ~ ${metres(f.high)}. \uAC00\uAE4C\uC6B0\uBA74 \uACFC\uB2E4 \uB178\uCD9C\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
      const d = node(flashPanel, "details", void 0, "pfm-flash-details");
      node(d, "summary", "\uD544\uC694 \uCD9C\uB825\xB7\uC870\uB9AC\uAC1C\xB7\uAC70\uB9AC\uBCC4 \uD45C");
      node(d, "p", `\uD544\uC694 \uC870\uB9AC\uAC1C f/${fmt(f.requiredAperture)} \xB7 \uD544\uC694 \uCD9C\uB825 ${fmt(f.needed * 100)}% \xB7 ${f.status}`);
      node(d, "p", `\uAC00\uAE4C\uC6B4 \uC9C0\uC6D0 \uB2E8\uACC4 1/${f.nearest} \u2192 \uB0A8\uB294 \uC624\uCC28 ${f.residual > 0 ? "+" : ""}${fmt(f.residual)} EV`);
      this.table(d, ["\uCD9C\uB825", "\uC608\uC0C1 \uAC70\uB9AC"], f.distances.map((x) => [`1/${x.n}`, metres(x.d)]));
      this.table(d, ["\uD50C\uB798\uC2DC \uAC70\uB9AC", "\uB178\uCD9C \uCC28\uC774"], [0.5, 0.70710678, 1, 1.41421356, 2].map((v) => [metres(f.d * v), `${fmt(exposureEV(f.d, f.d * v))} EV \xB7 ${v < 1 ? "\uACFC\uB2E4" : v > 1 ? "\uBD80\uC871" : "\uAE30\uC900 \uC801\uC815"}`]));
    } catch (e) {
      node(flashPanel, "p", "\uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC", "pfm-eyebrow");
      node(flashPanel, "div", "\u2014", "pfm-hero");
      node(flashPanel, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
    const dof = node(this.results, "div", void 0, "pfm-dof-results");
    try {
      const o = optics(i);
      node(dof, "h2", "\uC2EC\uB3C4\xB7\uD654\uAC01");
      node(dof, "p", `\uADFC\uAC70\uB9AC ${metres(o.near)} \xB7 \uC6D0\uAC70\uB9AC ${metres(o.far)}`, "pfm-ev");
      const od = node(dof, "details");
      node(od, "summary", "\uC804\uCCB4 \uC2EC\uB3C4\xB7\uACFC\uCD08\uC810\xB7\uD654\uAC01\xB7\uD68C\uC808");
      node(od, "p", `\uC804\uCCB4 ${metres(o.total)} \xB7 \uACFC\uCD08\uC810 ${metres(o.hyperfocal)}`);
      node(od, "p", `\uD654\uAC01 \uC218\uD3C9 ${fmt(o.horizontal, 1)}\xB0 / \uC218\uC9C1 ${fmt(o.vertical, 1)}\xB0 / \uB300\uAC01 ${fmt(o.diagonal, 1)}\xB0`);
      node(od, "p", `\uC2E4\uC81C ${fmt(i.focal)}mm \u2192 35mm \uD658\uC0B0 ${fmt(o.equivalent, 1)}mm \xB7 CoC ${fmt(o.c, 5)}mm`);
      node(od, "p", `\uD68C\uC808 \uADFC\uC0AC: \uD30C\uC7A5 550nm, Airy \uC9C0\uB984 ${fmt(o.airy, 5)}mm (${fmt(o.airy / o.c)}\xD7CoC). ${o.airy > o.c ? "CoC\uBCF4\uB2E4 \uCEE4\uC9C8 \uC218 \uC788\uC74C." : "CoC \uC774\uD558."} \uC808\uB300 \uC120\uBA85\uB3C4 \uD310\uC815\uC774 \uC544\uB2D9\uB2C8\uB2E4.`);
    } catch (e) {
      node(dof, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
    const exposureDetails = flashPanel.querySelector("details");
    if (exposureDetails) this.results.append(exposureDetails);
    try {
      const c = coverage(i);
      const p = node(this.results, "details", void 0, "pfm-coverage-results");
      node(p, "summary", "\uD504\uB808\uC784\xB7\uC870\uC0AC \uBC94\uC704 \uBE44\uAD50");
      node(p, "p", `\uD504\uB808\uC784 ${fmt(c.camera.width)}\xD7${fmt(c.camera.height)}m \xB7 \uC870\uC0AC \uBC94\uC704 ${fmt(c.flash.width)}\xD7${fmt(c.flash.height)}m`);
      node(p, "p", i.linked ? c.narrow ? "\uC8FC\uC758: \uD504\uB808\uC784 \uAC00\uC7A5\uC790\uB9AC \uAD11\uB7C9 \uBD80\uC871 \uAC00\uB2A5\uC131. \uC2E4\uC81C \uBC30\uAD11\uC740 \uADE0\uC77C\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uB3D9\uC77C \uC704\uCE58\xB7\uBC29\uD5A5 \uAC00\uC815. \uC2E4\uC81C \uBC30\uAD11\uC740 \uADE0\uC77C\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uC624\uD504\uCE74\uBA54\uB77C: \uAC01\uAC01\uC758 \uAC70\uB9AC \uD3C9\uBA74 \uBC94\uC704\uC785\uB2C8\uB2E4. \uC704\uCE58\xB7\uBC29\uD5A5\uC744 \uC785\uB825\uD558\uC9C0 \uC54A\uC544 \uACF5\uAC04 \uC911\uCCA9\uC744 \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    } catch (e) {
      node(this.results, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
    if (i.loss > 0) node(this.results, "p", "\uCD94\uAC00 \uC190\uC2E4\uC744 \uC801\uC6A9\uD55C \uCD94\uC815. GN\uC5D0 \uD3EC\uD568\uB41C \uC190\uC2E4\uC758 \uC911\uBCF5 \uBCF4\uC815\uC5D0 \uC8FC\uC758\uD558\uC138\uC694.");
    this.restoreDetails();
    diagram(this.picture, i);
  }
  table(parent, headers, rows) {
    const t = node(parent, "table");
    const h = node(node(t, "thead"), "tr");
    headers.forEach((x) => node(h, "th", x));
    const body = node(t, "tbody");
    for (const row of rows) {
      const tr = node(body, "tr");
      row.forEach((x) => node(tr, "td", x));
    }
  }
};

// src/main.ts
var PhotoPlugin = class extends import_obsidian2.Plugin {
  constructor() {
    super(...arguments);
    this.writes = Promise.resolve();
    this.active = false;
    this.opening = null;
  }
  async onload() {
    this.state = restore(await this.loadData());
    this.stableInputs = { ...this.state.inputs };
    this.active = true;
    this.registerView(VIEW, (leaf) => new PhotoView(leaf, this));
    this.addCommand({ id: "open", name: "\uCD2C\uC601 \uACC4\uC0B0 \uC5F4\uAE30", icon: "camera", callback: () => {
      void this.open().catch((e) => this.report(e));
    } });
    this.addCommand({ id: "save-note", name: "\uD604\uC7AC \uACC4\uC0B0\uC744 \uB178\uD2B8\uB85C \uC800\uC7A5", callback: () => {
      void this.saveNote().catch((e) => this.report(e));
    } });
    this.addRibbonIcon("camera", "\uC0AC\uC9C4 \uCD2C\uC601 \uB3C4\uC6B0\uBBF8 \uC5F4\uAE30", () => {
      void this.open().catch((e) => this.report(e));
    });
  }
  report(e) {
    console.error("Photo Field Mobile", e);
    new import_obsidian2.Notice(`\uC0AC\uC9C4 \uCD2C\uC601 \uB3C4\uC6B0\uBBF8: ${e instanceof Error ? e.message : String(e)}`);
  }
  open() {
    if (this.opening) return this.opening;
    this.opening = this.openView().finally(() => {
      this.opening = null;
    });
    return this.opening;
  }
  async openView() {
    await new Promise((resolve) => window.setTimeout(resolve, 0));
    if (!this.active) return;
    let leaf = this.app.workspace.getLeavesOfType(VIEW)[0];
    if (!leaf) {
      leaf = this.app.workspace.getLeaf(false);
      await leaf.setViewState({ type: VIEW, active: true });
    }
    if (this.active) await this.app.workspace.revealLeaf(leaf);
  }
  persist() {
    const data = snapshot(this.state, this.stableInputs);
    this.stableInputs = { ...data.inputs };
    const task = this.writes.catch(() => void 0).then(() => this.saveData(data));
    this.writes = task;
    return task;
  }
  refresh(source) {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PhotoView && leaf.view !== source) leaf.view.render();
  }
  async saveNote() {
    const i = { ...this.state.inputs };
    if (Object.values(i).some((v) => typeof v === "number" && !Number.isFinite(v))) throw Error("\uBE48 \uAC12\uC774\uB098 \uC798\uBABB\uB41C \uC22B\uC790\uB97C \uBA3C\uC800 \uC218\uC815\uD558\uC138\uC694.");
    const folder = (0, import_obsidian2.normalizePath)("\uC0AC\uC9C4 \uCD2C\uC601 \uACC4\uC0B0");
    if (!this.app.vault.getAbstractFileByPath(folder)) await this.app.vault.createFolder(folder);
    const base = `${folder}/\uCD2C\uC601 \uACC4\uC0B0 ${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
    let path = `${base}.md`, n = 1;
    while (this.app.vault.getAbstractFileByPath(path)) path = `${base}-${n++}.md`;
    await this.app.vault.create(path, note(i));
    new import_obsidian2.Notice(`\uC800\uC7A5 \uC644\uB8CC: ${path}`);
    return path;
  }
  update(key, value) {
    this.state.inputs[key] = value;
  }
  onunload() {
    this.active = false;
    this.app.workspace.detachLeavesOfType(VIEW);
  }
};
