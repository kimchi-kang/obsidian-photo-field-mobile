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
var emptyDraft = () => ({ id: "", name: "", conditions: "", source: "", table: "", unit: "m", minDenominator: "256", steps: "1,2,4,8,16,32,64,128,256" });
var defaults = {
  gnMode: "manual",
  equipmentId: "",
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
  if (i.denominator < 1) throw Error("\uCD9C\uB825 \uBD84\uBAA8\uB294 1 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
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
    supported: steps.includes(i.denominator),
    powerLabel: steps.includes(i.denominator) ? i.gnMode === "equipment" ? "\uC7A5\uBE44 \uC9C0\uC6D0 \uCD9C\uB825" : "\uC218\uB3D9 GN \xB7 \uC785\uB825\uD55C \uC9C0\uC6D0 \uB2E8\uACC4" : "\uC774\uB860\uAC12\xB7\uC7A5\uBE44 \uBBF8\uC9C0\uC6D0 \uCD9C\uB825",
    nearestDistance: flashDistance(g, 1 / nearest, i.iso, i.aperture, i.loss),
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
function selectedEquipment(state) {
  return state.inputs.gnMode === "equipment" ? state.equipment.find((e) => e.id === state.inputs.equipmentId) : void 0;
}
function applyEquipment(state) {
  const i = state.inputs;
  if (i.gnMode !== "equipment") return;
  const e = selectedEquipment(state);
  if (!e) {
    i.gn = 0;
    i.gnZoom = 0;
    i.conditions = "\uC120\uD0DD \uC7A5\uBE44\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC7A5\uBE44 \uC120\uD0DD \uB610\uB294 \uC218\uB3D9 \uBAA8\uB4DC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.";
    return;
  }
  const g = e.table[String(i.zoom)];
  Object.assign(i, { gn: g ?? 0, gnUnit: "m", gnZoom: g === void 0 ? 0 : i.zoom, conditions: `${e.conditions} \xB7 \uCD9C\uCC98: ${e.source}`, minDenominator: e.minDenominator, steps: e.steps });
}
function equipmentId(equipment) {
  let id = `equipment-${Date.now().toString(36)}`, n = 1;
  while (equipment.some((e) => e.id === id)) id = `equipment-${Date.now().toString(36)}-${n++}`;
  return id;
}
function manualFlash(i) {
  return { gn: i.gn, gnUnit: i.gnUnit, gnZoom: i.gnZoom, conditions: i.conditions, minDenominator: i.minDenominator, steps: i.steps };
}
function selectEquipment(state, id) {
  if (state.inputs.gnMode === "manual") state.manualFlash = manualFlash(state.inputs);
  Object.assign(state.inputs, { equipmentId: id, gnMode: "equipment" });
  applyEquipment(state);
}
function setGnMode(state, mode) {
  if (mode === state.inputs.gnMode) return;
  if (mode === "equipment") {
    state.manualFlash = manualFlash(state.inputs);
    state.inputs.gnMode = mode;
    applyEquipment(state);
  } else {
    state.inputs.gnMode = mode;
    if (state.manualFlash) Object.assign(state.inputs, state.manualFlash);
  }
}

// src/storage.ts
function restore(data) {
  const result = { version: 2, inputs: { ...defaults }, equipment: [] };
  if (!data || typeof data !== "object") return result;
  const d = data;
  if (typeof d.version === "number" && d.version > 2) throw Error("\uC774 \uB370\uC774\uD130\uB294 \uB354 \uC0C8 \uD50C\uB7EC\uADF8\uC778 \uBC84\uC804\uC5D0\uC11C \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB36E\uC5B4\uC4F0\uC9C0 \uC54A\uB3C4\uB85D \uB85C\uB4DC\uB97C \uC911\uB2E8\uD569\uB2C8\uB2E4.");
  if (d.version !== 2) result.migrationBackup = JSON.parse(JSON.stringify(data));
  else if (d.migrationBackup) result.migrationBackup = d.migrationBackup;
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
  if (!["manual", "equipment"].includes(i.gnMode)) i.gnMode = "manual";
  const used = /* @__PURE__ */ new Set();
  result.equipment = result.equipment.map((e, n) => {
    let id = typeof e.id === "string" && e.id ? e.id : `legacy-${n + 1}`;
    while (used.has(id)) id += "-copy";
    used.add(id);
    return { ...e, table: { ...e.table }, id };
  });
  if (d.draft && typeof d.draft === "object") {
    const draft = emptyDraft();
    for (const k of Object.keys(draft)) if (typeof d.draft[k] === "string") Object.assign(draft, { [k]: d.draft[k] });
    if (draft.unit !== "ft") draft.unit = "m";
    result.draft = draft;
  }
  if (d.deletedEquipment && equipmentValid(d.deletedEquipment.equipment) && typeof d.deletedEquipment.equipment.id === "string") result.deletedEquipment = JSON.parse(JSON.stringify(d.deletedEquipment));
  if (d.manualFlash && typeof d.manualFlash === "object") {
    const m = { ...defaults };
    for (const k of Object.keys(manualFlash(defaults))) {
      const v = d.manualFlash[k];
      if (typeof v === typeof defaults[k] && (typeof v !== "number" || Number.isFinite(v))) Object.assign(m, { [k]: v });
    }
    result.manualFlash = manualFlash(m);
  }
  applyEquipment(result);
  return result;
}
function snapshot(state, previous) {
  const inputs = { ...state.inputs };
  for (const key of Object.keys(inputs)) {
    const value = inputs[key];
    if (typeof value === "number" && !Number.isFinite(value)) Object.assign(inputs, { [key]: previous[key] });
  }
  const manual = state.manualFlash ? { ...state.manualFlash } : void 0;
  if (manual) {
    for (const key of Object.keys(manual)) if (typeof manual[key] === "number" && !Number.isFinite(manual[key])) Object.assign(manual, { [key]: previous[key] });
  }
  return JSON.parse(JSON.stringify({ ...state, ...manual ? { manualFlash: manual } : {}, inputs, ...inputs.gnMode === "manual" ? { manualFlash: manualFlash(inputs) } : {} }));
}

// src/writer.ts
var LatestWriter = class {
  constructor(write, status = () => {
  }) {
    this.write = write;
    this.status = status;
    this.error = null;
  }
  request(data) {
    this.pending = data;
    if (!this.waiting) {
      let resolve, reject;
      const promise = new Promise((a, b) => {
        resolve = a;
        reject = b;
      });
      this.waiting = { promise, resolve, reject };
    }
    if (!this.timer && !this.running) this.timer = setTimeout(() => {
      this.timer = void 0;
      void this.flush().catch(() => {
      });
    }, 80);
    return this.waiting.promise;
  }
  async flush() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = void 0;
    }
    if (this.running) {
      await this.running;
      if (this.pending !== void 0) await this.flush();
      return;
    }
    if (this.pending === void 0) return;
    const data = this.pending, waiting = this.waiting;
    this.pending = void 0;
    this.waiting = void 0;
    this.running = Promise.resolve().then(() => this.write(data)).then(() => {
      this.error = null;
      waiting?.resolve();
    }, (e) => {
      if (this.pending === void 0) this.pending = data;
      this.error = e;
      waiting?.reject(e);
      throw e;
    });
    try {
      await this.running;
    } finally {
      this.running = void 0;
      this.status();
    }
    if (this.pending !== void 0) await this.flush();
  }
};

// src/view.ts
var import_obsidian = require("obsidian");

// src/diagram.ts
var ns = "http://www.w3.org/2000/svg";
var SCENE = { width: 400, start: 54, end: 382 };
var nextId = 0;
function sceneDistance(x, max, focal) {
  return Math.max(focal / 1e3 + 1e-3, Math.min(max, (x - SCENE.start) / (SCENE.end - SCENE.start) * max));
}
function diagram(host, i) {
  host.replaceChildren();
  if (!Number.isFinite(i.diagramMax) || i.diagramMax <= 0) {
    const p = document.createElement("p");
    p.textContent = "\uADF8\uB9BC \uCD5C\uB300 \uAC70\uB9AC\uB97C \uC591\uC218\uB85C \uC785\uB825\uD558\uC138\uC694.";
    host.append(p);
    return;
  }
  const showDof = i.tab !== "flash", showFlash = i.tab !== "dof";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 400 ${showFlash ? 260 : 212}`);
  svg.setAttribute("role", "group");
  svg.setAttribute("aria-label", "\uCE74\uBA54\uB77C\uC640 \uD53C\uC0AC\uCCB4, \uB80C\uC988 \uD654\uAC01\uACFC \uC2EC\uB3C4\uB97C \uD568\uAED8 \uBCF4\uB294 \uCD2C\uC601 \uC7A5\uBA74");
  svg.dataset.scene = "true";
  host.append(svg);
  function el(tag, attrs, text, parent = svg) {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text !== void 0) n.textContent = text;
    parent.append(n);
    return n;
  }
  const id = `pfm-scene-${++nextId}`, defs = el("defs", {}), clip = el("clipPath", { id: id + "-clip" }, void 0, defs);
  el("rect", { x: SCENE.start, y: 24, width: SCENE.end - SCENE.start, height: 140 }, void 0, clip);
  const pattern = el("pattern", { id: id + "-hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse" }, void 0, defs);
  el("path", { d: "M0 7 L7 0", stroke: "var(--text-accent)", "stroke-width": 1.2 }, void 0, pattern);
  const x = (d) => SCENE.start + (SCENE.end - SCENE.start) * Math.max(0, Math.min(d / i.diagramMax, 1));
  const out = (d) => `${d > i.diagramMax && Number.isFinite(d) ? "\u2192 " : ""}${metres(d)}`;
  const cone = (degrees, cl) => {
    const half = (SCENE.end - SCENE.start) * Math.tan(degrees * Math.PI / 360);
    el("path", { d: `M${SCENE.start} 92 L${SCENE.end} ${92 - half} L${SCENE.end} ${92 + half} Z`, class: cl, "clip-path": `url(#${id}-clip)` });
  };
  try {
    const o = optics(i);
    cone(o.vertical, "pfm-camera-cone");
    if (showDof) {
      el("rect", { x: x(o.near), y: 24, width: Math.max(0, x(o.far) - x(o.near)), height: 140, class: "pfm-dof-zone" });
      for (const d of [o.near, o.far]) el("line", { x1: x(d), x2: x(d), y1: 24, y2: 164, class: "pfm-dof-limit" });
    }
  } catch {
    el("text", { x: 70, y: 65 }, "\uB80C\uC988\xB7\uCD08\uC810 \uC785\uB825\uC744 \uD655\uC778\uD558\uC138\uC694.");
  }
  if (showFlash && i.linked) try {
    cone(coverage(i).v, "pfm-flash-cone");
  } catch {
  }
  el("line", { x1: 4, x2: 390, y1: 164, y2: 164, class: "pfm-ground" });
  const photographer = el("g", { class: "pfm-person" });
  el("circle", { cx: 24, cy: 75, r: 8 }, void 0, photographer);
  el("path", { d: "M22 88 L15 116 L9 151 M15 116 L31 151 M22 91 L36 99 L42 87", fill: "none", stroke: "currentColor", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, void 0, photographer);
  el("rect", { x: 35, y: 80, width: 17, height: 13, rx: 2 }, void 0, photographer);
  el("rect", { x: 49, y: 83, width: 7, height: 7 }, void 0, photographer);
  el("text", { x: 6, y: 16, class: "pfm-scene-lens" }, `${fmt(i.focal)} mm \xB7 f/${fmt(i.aperture)}`);
  const subject = x(Number.isFinite(i.cameraDistance) && i.cameraDistance > 0 ? i.cameraDistance : 0);
  el("line", { x1: subject, x2: subject, y1: 24, y2: 180, class: "pfm-focus-line" });
  const person = el("g", { transform: `translate(${subject},0)`, class: "pfm-person pfm-subject", "data-pfm-subject": "true", tabindex: 0, role: "slider", "aria-label": "\uD53C\uC0AC\uCCB4 \uAC70\uB9AC \xB7 \uC88C\uC6B0 \uB4DC\uB798\uADF8 \uB610\uB294 \uD654\uC0B4\uD45C \uD0A4\uB85C \uC870\uC808", "aria-valuenow": Number.isFinite(i.cameraDistance) ? i.cameraDistance : 0, "aria-valuemin": Number.isFinite(i.focal) ? i.focal / 1e3 + 1e-3 : 1e-3, "aria-valuemax": Math.max(i.diagramMax, Number.isFinite(i.cameraDistance) ? i.cameraDistance : 0), "aria-valuetext": metres(i.cameraDistance) });
  el("rect", { x: -26, y: 68, width: 52, height: 102, fill: "transparent" }, void 0, person);
  el("circle", { cx: 0, cy: 82, r: 8 }, void 0, person);
  el("path", { d: "M0 96 L0 129 M-13 113 L0 100 L13 113 M0 129 L-10 155 M0 129 L10 155", fill: "none", stroke: "currentColor", "stroke-width": 9, "stroke-linecap": "round", "stroke-linejoin": "round" }, void 0, person);
  el("circle", { cx: 0, cy: 177, r: 5, class: "pfm-focus-dot" }, void 0, person);
  el("text", { x: Math.max(92, Math.min(subject, 340)), y: 38, "text-anchor": "middle", class: "pfm-subject-label" }, `\uD53C\uC0AC\uCCB4 ${out(i.cameraDistance)}`);
  el("line", { x1: SCENE.start, x2: SCENE.end, y1: 192, y2: 192, class: "pfm-distance-axis" });
  for (let n = 0; n <= 4; n++) {
    const d = i.diagramMax * n / 4;
    el("line", { x1: x(d), x2: x(d), y1: 189, y2: 195, class: "pfm-distance-axis" });
    el("text", { x: x(d), y: 208, "text-anchor": n === 4 ? "end" : "middle", class: "pfm-axis-label" }, `${fmt(d, 1)}m`);
  }
  if (showFlash) try {
    const f = flash(i);
    const y = 228;
    el("rect", { x: SCENE.start, y, width: x(f.low) - SCENE.start, height: 12, class: "pfm-over-zone" });
    el("rect", { x: x(f.low), y, width: x(f.high) - x(f.low), height: 12, fill: `url(#${id}-hatch)` });
    el("rect", { x: x(f.high), y, width: SCENE.end - x(f.high), height: 12, class: "pfm-under-zone" });
    el("line", { x1: x(f.r), x2: x(f.r), y1: y - 5, y2: y + 17, class: "pfm-flash-marker" });
    el("text", { x: SCENE.start, y: 257, class: "pfm-axis-label" }, `${i.linked ? "\uD50C\uB798\uC2DC" : "\uD50C\uB798\uC2DC \uB3C5\uB9BD \uAC70\uB9AC \uCD95"} \xB7 \uD5C8\uC6A9 ${out(f.low)} ~ ${out(f.high)}`);
  } catch {
    el("text", { x: SCENE.start, y: 243, class: "pfm-axis-label" }, "\uD50C\uB798\uC2DC \uAC70\uB9AC: \uD604\uC7AC \uC870\uAC74\uC5D0\uC11C \uACC4\uC0B0 \uBD88\uAC00");
  }
  const legend = document.createElement("figcaption");
  legend.className = "pfm-scene-legend";
  const items = [["pfm-key-camera", "\uCE74\uBA54\uB77C \uD654\uAC01"], ...showDof ? [["pfm-key-dof", "\uC2EC\uB3C4"]] : [], ...showFlash && i.linked ? [["pfm-key-flash", "\uD50C\uB798\uC2DC \uC870\uC0AC\uAC01"]] : []];
  for (const [cls, text] of items) {
    const label = document.createElement("span");
    label.className = cls;
    label.textContent = text;
    legend.append(label);
  }
  host.append(legend);
  const hint = document.createElement("p");
  hint.className = "pfm-scene-hint";
  hint.textContent = "\uD53C\uC0AC\uCCB4 \uB4DC\uB798\uADF8 \xB7 \uAC70\uB9AC \uC9C1\uC811 \uC785\uB825";
  host.append(hint);
  if (showFlash) {
    const p = document.createElement("p");
    p.className = "pfm-scene-note";
    p.textContent = i.linked ? "\uD50C\uB798\uC2DC \uB760: \uC810\uC120=\uACFC\uB2E4 \xB7 \uBE57\uAE08=\uD5C8\uC6A9 \xB7 \uD30C\uC120=\uBD80\uC871 (\uBC30\uAD11 \uC544\uB2D8)" : "\uC624\uD504\uCE74\uBA54\uB77C: \uC704\uCE58\xB7\uBC29\uD5A5 \uBBF8\uC785\uB825. \uD50C\uB798\uC2DC \uAC70\uB9AC\uC640 \uCE74\uBA54\uB77C \uC7A5\uBA74\uC740 \uB3C5\uB9BD \uACC4\uC0B0\uC785\uB2C8\uB2E4.";
    host.append(p);
  }
  try {
    const o = optics(i);
    if (showDof && (o.near > i.diagramMax || o.far > i.diagramMax)) {
      const p = document.createElement("p");
      p.className = "pfm-scene-note";
      p.textContent = `\uADF8\uB9BC \uBC16 \uC2EC\uB3C4: ${out(o.near)} ~ ${out(o.far)}`;
      host.append(p);
    }
  } catch {
  }
}

// src/note.ts
var limitations = "\uC218\uB3D9 \uD50C\uB798\uC2DC\xB7\uC9C1\uC811\uAD11\xB7\uC77C\uBC18 \uB3D9\uC870\xB7\uC911\uC2EC\uBD80 \uB178\uCD9C\uC758 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC2E4\uC81C \uBC30\uAD11\xB7\uBC18\uC0AC\uC728\xB7\uD658\uACBD\uAD11\xB7\uC7A5\uBE44 \uD3B8\uCC28\uB97C \uD3EC\uD568\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. TTL, HSS, \uBC14\uC6B4\uC2A4, \uC18C\uD504\uD2B8\uBC15\uC2A4, \uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0\uC740 \uC774 \uAE30\uBCF8 \uBAA8\uB378\uB85C \uD655\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC190\uC2E4 \uBCF4\uC815\uC740 \uCD94\uC815\uC774\uBA70 GN\uC5D0 \uC774\uBBF8 \uD3EC\uD568\uB41C \uC190\uC2E4\uC744 \uC911\uBCF5 \uC801\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694.";
function validateNote(i, scope = "all") {
  if (scope !== "flash") optics(i);
  if (scope !== "dof") flash(i);
  if (scope === "all" || scope === "combined") coverage(i);
}
function note(i, date = /* @__PURE__ */ new Date(), context) {
  const scope = context?.scope ?? "all";
  const lines = ["# \uC0AC\uC9C4 \uCD2C\uC601 \uACC4\uC0B0", `
\uB0A0\uC9DC: ${date.toISOString()} (${date.toLocaleString("ko-KR")}, \uAE30\uAE30 \uD604\uC9C0 \uC2DC\uAC01)`, `
## \uC785\uB825\uAC12
`, `| \uD56D\uBAA9 | \uAC12 |`, `| --- | --- |`];
  lines.push(`\uC800\uC7A5 \uBC94\uC704: ${scope === "dof" ? "\uD604\uC7AC \uD0ED \xB7 \uC2EC\uB3C4\xB7\uD654\uAC01 (\uD50C\uB798\uC2DC\xB7\uC870\uC0AC \uBC94\uC704 \uC81C\uC678)" : scope === "flash" ? "\uD604\uC7AC \uD0ED \xB7 \uD50C\uB798\uC2DC (\uC2EC\uB3C4\xB7\uC870\uC0AC \uBC94\uC704 \uC81C\uC678)" : scope === "combined" ? "\uD604\uC7AC \uD0ED \xB7 \uD1B5\uD569 (\uC804\uCCB4 \uACC4\uC0B0)" : "\uC804\uCCB4 \uACC4\uC0B0"}`);
  lines.push(`\uD50C\uB7EC\uADF8\uC778 \uBC84\uC804: ${context?.version ?? "\uAC1C\uBC1C/\uBBF8\uC9C0\uC815"}`, `GN \uC785\uB825 \uBAA8\uB4DC: ${i.gnMode === "equipment" ? "\uC7A5\uBE44 \uD45C" : "\uC218\uB3D9 GN"}`, `\uC120\uD0DD \uC7A5\uBE44: ${context?.equipment?.name ?? "\uC5C6\uC74C \xB7 \uC218\uB3D9 GN"}`, `\uC7A5\uBE44 \uCD9C\uCC98: ${context?.equipment?.source ?? "GN \uC870\uAC74 \uCC38\uC870"}`);
  const labels = { gnMode: "GN \uBAA8\uB4DC", equipmentId: "\uC7A5\uBE44 ID (\uC218\uB3D9 \uBAA8\uB4DC\uC5D0\uC11C\uB294 \uC801\uC6A9 \uC548 \uD568)", sensor: "\uC13C\uC11C \uD504\uB9AC\uC14B", width: "\uC13C\uC11C \uAC00\uB85C mm", height: "\uC13C\uC11C \uC138\uB85C mm", focal: "\uC2E4\uC81C \uCD08\uC810\uAC70\uB9AC mm", aperture: "\uC870\uB9AC\uAC1C f/", iso: "ISO", cameraDistance: "\uCE74\uBA54\uB77C \uAC70\uB9AC m", linked: "\uC628\uCE74\uBA54\uB77C \uC5F0\uB3D9", flashDistance: "\uBCC4\uB3C4 \uD50C\uB798\uC2DC \uAC70\uB9AC m", cocMode: "CoC \uBC29\uC2DD", coc: "\uC0AC\uC6A9\uC790 CoC mm", gn: "ISO100 \uCD5C\uB300 \uCD9C\uB825 GN", gnUnit: "GN \uB2E8\uC704", gnZoom: "GN \uCE21\uC815 \uC90C mm", zoom: "\uC120\uD0DD \uD50C\uB798\uC2DC \uC90C mm", conditions: "GN \uC870\uAC74", denominator: "\uCD9C\uB825 1/n\uC758 n", loss: "\uCD94\uAC00 \uC190\uC2E4 stop", tolerance: "\uD5C8\uC6A9 \uC624\uCC28 \xB1EV", minDenominator: "\uCD5C\uC18C \uCD9C\uB825 1/n\uC758 n", steps: "\uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8", coverage: "\uC870\uC0AC\uAC01 \uBC29\uC2DD (approx=\uD480\uD504\uB808\uC784 \uAC00\uC815)", horizontal: "\uC9C1\uC811 \uC785\uB825 \uC218\uD3C9 \uC870\uC0AC\uAC01 \xB0", vertical: "\uC9C1\uC811 \uC785\uB825 \uC218\uC9C1 \uC870\uC0AC\uAC01 \xB0", mode: "\uBC1C\uAD11 \uC870\uAC74", diagramMax: "\uADF8\uB9BC \uCD5C\uB300 \uAC70\uB9AC m", tab: "\uD654\uBA74" };
  const opticalKeys = /* @__PURE__ */ new Set(["sensor", "width", "height", "focal", "aperture", "cameraDistance", "cocMode", "coc", "tab"]);
  const flashKeys = /* @__PURE__ */ new Set(["gnMode", "equipmentId", "aperture", "iso", "linked", "cameraDistance", "flashDistance", "gn", "gnUnit", "gnZoom", "zoom", "conditions", "denominator", "loss", "tolerance", "minDenominator", "steps", "mode", "tab"]);
  for (const key of Object.keys(labels)) {
    if (scope === "dof" && !opticalKeys.has(key) || scope === "flash" && !flashKeys.has(key)) continue;
    lines.push(`| ${labels[key]} | ${String(key === "flashDistance" && i.linked || key === "cameraDistance" && scope === "flash" && !i.linked || key === "coc" && i.cocMode === "estimate" || ["horizontal", "vertical"].includes(key) && i.coverage === "approx" ? "\uBBF8\uC0AC\uC6A9" : i[key]).replace(/\|/g, "\\|").replace(/\n/g, " / ")} |`);
  }
  lines.push("\n## \uACC4\uC0B0 \uACB0\uACFC\n");
  if (scope !== "dof") try {
    const f = flash(i);
    lines.push(`- \uC120\uD0DD \uCD9C\uB825 1/${i.denominator}: **${f.powerLabel}**`, `- \uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC: ${metres(f.d)}`, `- \uD50C\uB798\uC2DC\u2013\uD53C\uC0AC\uCCB4 \uAC70\uB9AC: ${metres(f.r)} \xB7 \uB178\uCD9C \uCC28\uC774: ${fmt(f.ev)} EV (${f.ev > 0 ? "\uC608\uC0C1 \uACFC\uB2E4" : f.ev < 0 ? "\uC608\uC0C1 \uBD80\uC871" : "\uAE30\uC900 \uC801\uC815"})`, `- \uC720\uD6A8 GN(m): ${fmt(f.gn)}`, `- \xB1${i.tolerance}EV \uAC70\uB9AC \uAD6C\uAC04: ${metres(f.low)} ~ ${metres(f.high)}`, `- \uD544\uC694\uD55C \uC870\uB9AC\uAC1C f/${fmt(f.requiredAperture)} \xB7 \uD544\uC694 \uCD9C\uB825 ${fmt(f.needed * 100)}% \xB7 ${f.status}`, `- \uAD8C\uC7A5 \uC9C0\uC6D0 \uB2E8\uACC4 1/${f.nearest} \xB7 \uD574\uB2F9 \uB2E8\uACC4 \uC608\uC0C1 \uAC70\uB9AC ${metres(f.nearestDistance)}, \uB0A8\uB294 \uB178\uCD9C \uC624\uCC28 ${fmt(f.residual)} EV`);
    lines.push("\n### \uCD9C\uB825\uBCC4 \uAC70\uB9AC\n", "| \uCD9C\uB825 | \uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC |", "| --- | --- |", ...f.distances.map((x) => `| 1/${x.n} | ${metres(x.d)} |`));
  } catch (e) {
    lines.push(`- \uD50C\uB798\uC2DC \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (scope !== "flash") try {
    const o = optics(i);
    lines.push(`
- \uC2EC\uB3C4 \uADFC\uAC70\uB9AC ${metres(o.near)} / \uC6D0\uAC70\uB9AC ${metres(o.far)} / \uC804\uCCB4 ${metres(o.total)}`, `- \uACFC\uCD08\uC810\uAC70\uB9AC ${metres(o.hyperfocal)} \xB7 CoC ${fmt(o.c, 5)} mm`, `- \uC218\uD3C9/\uC218\uC9C1/\uB300\uAC01 \uD654\uAC01 ${fmt(o.horizontal)}\xB0 / ${fmt(o.vertical)}\xB0 / ${fmt(o.diagonal)}\xB0`, `- 35mm \uD658\uC0B0 \uCD08\uC810\uAC70\uB9AC ${fmt(o.equivalent)} mm`, `- \uD68C\uC808 Airy \uC9C0\uB984 (\uD30C\uC7A5 550nm) ${fmt(o.airy, 5)} mm, CoC \uB300\uBE44 ${fmt(o.airy / o.c)}\uBC30 (\uADFC\uC0AC)`);
  } catch (e) {
    lines.push(`- \uAD11\uD559 \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (scope === "all" || scope === "combined") try {
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
    this.gnDisplayUnit = "m";
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
    await this.plugin.flush().catch((e) => this.plugin.reportSaveError(e));
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
  focusHyperfocal() {
    try {
      this.plugin.update("cameraDistance", optics(this.plugin.state.inputs).hyperfocal);
      this.syncNumeric("cameraDistance");
      this.changed();
    } catch (e) {
      this.plugin.report(e);
    }
  }
  sceneControls() {
    let dragging = null, offset = 0;
    const update = (x) => {
      this.plugin.update("cameraDistance", sceneDistance(x, this.plugin.state.inputs.diagramMax, this.plugin.state.inputs.focal));
      this.syncNumeric("cameraDistance");
      this.changed();
    };
    const coordinate = (e) => {
      const r = this.picture.querySelector("svg")?.getBoundingClientRect();
      return r && r.width > 0 ? (e.clientX - r.left) / r.width * SCENE.width : null;
    };
    this.listen(this.contentEl, "pointerdown", (event) => {
      if (!(event instanceof PointerEvent) || !(event.target instanceof Element) || !event.target.closest("[data-pfm-subject]")) return;
      const x = coordinate(event);
      if (x === null) return;
      const i = this.plugin.state.inputs;
      offset = x - (SCENE.start + (SCENE.end - SCENE.start) * Math.max(0, Math.min(1, (Number.isFinite(i.cameraDistance) ? i.cameraDistance : 0) / i.diagramMax)));
      dragging = event.pointerId;
      this.contentEl.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    this.listen(this.contentEl, "pointermove", (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== dragging) return;
      const x = coordinate(event);
      if (x !== null) {
        event.preventDefault();
        update(x - offset);
      }
    });
    for (const kind of ["pointerup", "pointercancel"]) this.listen(this.contentEl, kind, (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== dragging) return;
      dragging = null;
      if (this.contentEl.hasPointerCapture(event.pointerId)) this.contentEl.releasePointerCapture(event.pointerId);
      void this.plugin.flush().catch((e) => this.plugin.reportSaveError(e));
    });
    this.listen(this.contentEl, "click", (event) => {
      if (event.target instanceof Element && event.target.closest("[data-pfm-hyperfocal]")) this.focusHyperfocal();
    });
    this.listen(this.contentEl, "keydown", (event) => {
      if (!(event instanceof KeyboardEvent) || !(event.target instanceof Element) || !event.target.closest("[data-pfm-subject]")) return;
      const i = this.plugin.state.inputs;
      let distance;
      if (event.key === "ArrowLeft") distance = i.cameraDistance - 0.1;
      else if (event.key === "ArrowRight") distance = i.cameraDistance + 0.1;
      else return;
      event.preventDefault();
      this.plugin.update("cameraDistance", Math.max(i.focal / 1e3 + 1e-3, distance));
      this.syncNumeric("cameraDistance");
      this.changed();
      this.picture.querySelector("[data-pfm-subject]")?.focus();
    });
  }
  changed() {
    if (this.plugin.state.inputs.linked) {
      this.plugin.update("flashDistance", this.plugin.state.inputs.cameraDistance);
      this.syncNumeric("flashDistance");
    }
    this.paint();
    void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
    this.plugin.refresh(this);
  }
  button(parent, text, fn) {
    const b = node(parent, "button", text);
    b.type = "button";
    this.listen(b, "click", fn);
    return b;
  }
  rangeProgress(range) {
    const percent = (Number(range.value) - Number(range.min)) / (Number(range.max) - Number(range.min)) * 100;
    range.style.setProperty("--pfm-range-progress", `${percent}%`);
  }
  number(parent, label, key, options) {
    const wrap = node(parent, "label", void 0, "pfm-field");
    wrap.dataset.field = key;
    const compact = { cameraDistance: "\uCE74\uBA54\uB77C \uAC70\uB9AC (m)", aperture: "\uC870\uB9AC\uAC1C (f/)", focal: "\uCD08\uC810\uAC70\uB9AC (mm)" };
    node(wrap, "span", compact[key] ?? label);
    const input = node(wrap, "input");
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "any";
    input.value = Number.isFinite(this.plugin.state.inputs[key]) ? String(this.plugin.state.inputs[key]) : "";
    input.dataset.key = key;
    input.setAttribute("aria-label", label);
    let range;
    if (options) {
      wrap.classList.add("pfm-range-field");
      input.min = String(options.min);
      range = node(wrap, "input");
      range.type = "range";
      range.min = String(options.min);
      range.max = String(options.max);
      range.step = String(options.step);
      range.value = input.value;
      this.rangeProgress(range);
      range.setAttribute("aria-label", `${label} \uBE60\uB978 \uC870\uC808`);
      range.dataset.range = key;
      const r = range;
      this.listen(r, "input", () => {
        input.value = r.value;
        this.rangeProgress(r);
        input.setAttribute("aria-invalid", "false");
        this.plugin.update(key, Number(r.value));
        this.changed();
      });
    }
    if (key === "flashDistance") wrap.classList.add("pfm-flash-distance");
    if (key === "denominator") wrap.classList.add("pfm-custom-power");
    this.numeric.set(key, { input, range });
    this.listen(input, "input", () => {
      const v = parseNumber(input.value);
      this.plugin.update(key, v);
      if (key === "denominator") this.syncPower();
      if (range && Number.isFinite(v)) {
        range.value = String(v);
        this.rangeProgress(range);
      }
      input.setAttribute("aria-invalid", String(!Number.isFinite(v) || v < 0 || v === 0 && key !== "loss"));
      this.changed();
    });
  }
  select(parent, label, key, values, after) {
    const l = node(parent, "label", void 0, "pfm-field");
    l.dataset.field = key;
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
  updateSaveStatus() {
    if (this.saveStatus) {
      this.saveStatus.textContent = this.plugin.saveError;
      this.saveStatus.hidden = !this.plugin.saveError;
    }
  }
  flushOnEnd() {
    for (const event of ["change", "focusout"]) this.listen(this.contentEl, event, () => {
      void this.plugin.flush().catch((e) => this.plugin.reportSaveError(e));
    });
  }
  syncPower() {
    if (!this.power) return;
    this.power.replaceChildren();
    const i = this.plugin.state.inputs;
    let steps = [];
    try {
      steps = flash({ ...i, denominator: 1 }).steps;
    } catch {
      try {
        steps = powerSteps(i.steps, i.minDenominator);
      } catch {
      }
    }
    for (const n of steps) {
      const o = node(this.power, "option", `1/${n}`);
      o.value = String(n);
    }
    const value = i.denominator;
    if (Number.isFinite(value) && !steps.includes(value)) {
      const option = node(this.power, "option", `\uC774\uB860\uAC12\xB7\uC7A5\uBE44 \uBBF8\uC9C0\uC6D0 \uCD9C\uB825 1/${value}`);
      option.value = String(value);
      option.dataset.custom = "true";
    }
    this.power.value = Number.isFinite(value) ? String(value) : "";
  }
  syncNumeric(key) {
    const pair = this.numeric.get(key);
    if (pair) {
      const value = this.plugin.state.inputs[key];
      pair.input.value = typeof value === "number" && !Number.isFinite(value) ? "" : String(value);
      if (pair.range) {
        pair.range.value = pair.input.value;
        this.rangeProgress(pair.range);
      }
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
    this.context = node(this.root, "p", void 0, "pfm-context");
    this.results = node(this.root, "section", void 0, "pfm-results");
    this.results.setAttribute("aria-live", "polite");
    this.picture = node(this.results, "figure", void 0, "pfm-diagram");
    this.sceneControls();
    this.flushOnEnd();
    const quick = node(this.root, "section", void 0, "pfm-quick");
    node(quick, "h2", "\uBE60\uB978 \uC870\uC808");
    this.number(quick, "\uCE74\uBA54\uB77C \u2192 \uD53C\uC0AC\uCCB4 \uAC70\uB9AC (m)", "cameraDistance", { min: 0.1, max: 30, step: 0.1 });
    this.number(quick, "\uC870\uB9AC\uAC1C f-number", "aperture", { min: 0.7, max: 32, step: 0.1 });
    const power = this.select(quick, "\uCD9C\uB825 \uC120\uD0DD", "denominator", {}, () => {
      this.plugin.update("denominator", Number(power.value));
      this.syncNumeric("denominator");
    });
    this.power = power;
    this.syncPower();
    this.number(quick, "\uC0AC\uC6A9\uC790 \uCD9C\uB825 1/n \xB7 n", "denominator");
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
    this.resultDetails = node(this.root, "section", void 0, "pfm-result-details");
    const camera = this.details("\uCE74\uBA54\uB77C\xB7\uB80C\uC988\xB7CoC");
    this.select(quick, "\uC13C\uC11C \uD504\uB9AC\uC14B", "sensor", { ...Object.fromEntries(Object.entries(sensors).map(([k, v]) => [k, v.name])), custom: "\uC0AC\uC6A9\uC790 \uC9C0\uC815" }, () => {
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
      const s = this.root.querySelector("select[data-key=sensor]");
      if (s) s.value = "custom";
      void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
    });
    this.number(quick, "ISO", "iso");
    this.number(quick, "\uC2E4\uC81C \uCD08\uC810\uAC70\uB9AC (mm)", "focal", { min: 8, max: 200, step: 1 });
    for (const selector of ["[data-field=cameraDistance]", "[data-field=aperture]", "label[data-field=denominator]:not(.pfm-custom-power)", "[data-field=iso]", "[data-field=focal]", "[data-field=sensor]", ".pfm-check", ".pfm-flash-distance", ".pfm-custom-power"]) {
      const field = quick.querySelector(selector);
      if (field) quick.append(field);
    }
    this.select(camera, "CoC \uBC29\uC2DD", "cocMode", { estimate: "\uC13C\uC11C \uB300\uAC01 \xF71500 \uCD94\uC815", custom: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 mm" });
    this.number(camera, "\uC0AC\uC6A9\uC790 CoC (mm)", "coc");
    node(camera, "p", "CoC\uB294 \uAC10\uC0C1 \uD06C\uAE30\xB7\uC2DC\uB825\xB7\uD655\uB300\uC728\uC5D0 \uB530\uB978 \uD5C8\uC6A9 \uCC29\uB780\uC6D0\uC785\uB2C8\uB2E4. \uB300\uAC01/1500\uC740 \uACBD\uD5D8\uC801 \uAE30\uBCF8\uAC12\uC774\uBA70 \uD53D\uC140 \uB2E8\uC704 \uC120\uBA85\uB3C4\uB97C \uBCF4\uC7A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. APS-C \uD06C\uAE30\uB294 \uC81C\uC870\uC0AC\uB9C8\uB2E4 \uB2E4\uB985\uB2C8\uB2E4.");
    const fl = this.details("\uD50C\uB798\uC2DC\xB7GN \uC870\uAC74\xB7\uC870\uC0AC\uAC01");
    this.select(fl, "\uBC1C\uAD11 \uC870\uAC74", "mode", { manual: "\uC218\uB3D9 \xB7 \uC9C1\uC811\uAD11 \xB7 \uC77C\uBC18 \uB3D9\uC870", ttl: "TTL (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", hss: "HSS (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", bounce: "\uBC14\uC6B4\uC2A4 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", modifier: "\uC18C\uD504\uD2B8\uBC15\uC2A4 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", near: "\uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)" });
    this.select(fl, "GN \uC785\uB825 \uBAA8\uB4DC", "gnMode", { manual: "\uC218\uB3D9 GN", equipment: "\uC120\uD0DD \uC7A5\uBE44 \uD45C" }, () => {
      applyEquipment(this.plugin.state);
      this.syncNumeric("gn");
      this.syncNumeric("gnZoom");
    });
    this.number(fl, "\uC120\uD0DD \uD50C\uB798\uC2DC \uC90C (mm)", "zoom");
    this.number(fl, "ISO100 \xB7 \uCD5C\uB300 \uCD9C\uB825 GN", "gn");
    this.gnDisplayUnit = i.gnUnit;
    this.select(fl, "GN \uB2E8\uC704", "gnUnit", { m: "m \uAE30\uC900", ft: "ft \uAE30\uC900" }, () => {
      const unit = this.plugin.state.inputs.gnUnit;
      const value = this.plugin.state.inputs.gn;
      if (unit !== this.gnDisplayUnit) {
        Object.assign(this.plugin.state.inputs, { gn: unit === "ft" ? metresToFeet(value) : feetToMetres(value) });
        this.syncNumeric("gn");
        this.gnDisplayUnit = unit;
      }
    });
    this.number(fl, "GN\uC774 \uCE21\uC815\uB41C \uC90C (mm)", "gnZoom");
    const cond = this.text(fl, "GN \uCE21\uC815 \uC870\uAC74\xB7\uCD9C\uCC98 (ISO100 \uCD5C\uB300 \uCD9C\uB825)", i.conditions);
    cond.dataset.key = "conditions";
    this.listen(cond, "input", () => {
      this.plugin.update("conditions", cond.value);
      this.changed();
    });
    this.number(fl, "\uCD94\uAC00 \uAD11\uB7C9 \uC190\uC2E4 L (stop, \uAE30\uBCF8 0)", "loss");
    node(fl, "p", "GN\uC5D0 \uC774\uBBF8 \uD3EC\uD568\uB41C \uC190\uC2E4\uC744 \uC911\uBCF5 \uC801\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694. \uC190\uC2E4 \uBCF4\uC815\uC740 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC90C \uBCC0\uACBD \uC2DC \uD574\uB2F9 \uC90C\uC758 GN \uC790\uB8CC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
    this.number(fl, "\uC7A5\uBE44 \uCD5C\uC18C \uCD9C\uB825 1/n \xB7 n", "minDenominator");
    const steps = this.text(fl, "\uC7A5\uBE44 \uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8 (\uC27C\uD45C \uAD6C\uBD84)", i.steps);
    steps.dataset.key = "steps";
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
    const hyper = this.button(advanced, "\uACFC\uCD08\uC810\uAC70\uB9AC\uC5D0 \uCD08\uC810 \uB9DE\uCD94\uAE30", () => this.focusHyperfocal());
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
    this.saveStatus = node(footer, "p", void 0, "pfm-error");
    this.saveStatus.setAttribute("role", "status");
    this.updateSaveStatus();
    const retry = this.button(footer, "\uC124\uC815 \uB2E4\uC2DC \uC800\uC7A5", () => {
      void this.plugin.persist().then(() => this.plugin.flush()).catch((e) => this.plugin.reportSaveError(e));
    });
    retry.className = "pfm-retry";
    const tabSave = this.button(footer, "\uD604\uC7AC \uD0ED \uACB0\uACFC \uC800\uC7A5", () => {
      tabSave.disabled = true;
      void this.plugin.saveNote(this.plugin.state.inputs.tab).catch((e) => this.plugin.report(e)).finally(() => {
        tabSave.disabled = false;
      });
    });
    tabSave.className = "mod-cta pfm-tab-save";
    const save = this.button(footer, "\uC804\uCCB4 \uACC4\uC0B0\uC744 \uB178\uD2B8\uB85C \uC800\uC7A5", () => {
      save.disabled = true;
      void this.plugin.saveNote().catch((e) => this.plugin.report(e)).finally(() => {
        save.disabled = false;
      });
    });
    save.className = "pfm-save";
    node(footer, "p", "\uD604\uC7AC \uD0ED: \uC2EC\uB3C4\xB7\uD654\uAC01 \uB610\uB294 \uD50C\uB798\uC2DC \uACB0\uACFC\uB9CC \uC800\uC7A5 \xB7 \uD1B5\uD569/\uC804\uCCB4: \uBAA8\uB4E0 \uACC4\uC0B0 \uC870\uAC74 \uD544\uC694 \xB7 \uC77C\uBC18 Markdown \xB7 \uC0C8 \uB178\uD2B8 \uC0DD\uC131 \xB7 \uC624\uD504\uB77C\uC778");
    this.paint(false);
  }
  equipmentPanel() {
    const p = this.details("\uB0B4 \uC7A5\uBE44 \uD504\uB9AC\uC14B \xB7 \uC90C\uBCC4 GN \uD45C");
    node(p, "p", "\uC81C\uC870\uC0AC \uB0B4\uC7A5 \uC218\uCE58 \uC5C6\uC74C. \uC124\uBA85\uC11C/\uC2E4\uCE21\uC758 ISO100\xB7\uCD5C\uB300 \uCD9C\uB825 GN\uACFC \uC9C0\uC6D0 \uCD9C\uB825\uC744 \uC785\uB825\uD558\uC138\uC694.");
    const state = this.plugin.state;
    const list = node(p, "select");
    list.setAttribute("aria-label", "\uC800\uC7A5\uB41C \uC7A5\uBE44");
    const placeholder = node(list, "option", "\uC7A5\uBE44 \uC120\uD0DD");
    placeholder.value = "";
    for (const e of state.equipment) {
      const o = node(list, "option", e.name);
      o.value = e.id;
    }
    list.value = state.inputs.equipmentId;
    const apply = () => {
      if (!list.value) {
        new import_obsidian.Notice("\uC7A5\uBE44\uB97C \uC120\uD0DD\uD558\uC138\uC694.");
        return;
      }
      selectEquipment(state, list.value);
      this.changed();
      this.render();
    };
    this.listen(list, "change", apply);
    this.button(p, "\uC120\uD0DD \uC7A5\uBE44\uC758 \uD604\uC7AC \uC90C GN \uC801\uC6A9", apply);
    this.button(p, "\uC120\uD0DD \uC7A5\uBE44 \uD3B8\uC9D1", () => {
      const e = state.equipment.find((e2) => e2.id === list.value);
      if (!e) return;
      if (state.draft && (state.draft.name || state.draft.table) && state.draft.id !== e.id) {
        new import_obsidian.Notice("\uC791\uC131 \uC911\uC778 \uD504\uB9AC\uC14B\uC744 \uBA3C\uC800 \uC800\uC7A5\uD558\uAC70\uB098 \uD3B8\uC9D1 \uCDE8\uC18C\uD558\uC138\uC694.");
        return;
      }
      state.draft = { id: e.id, name: e.name, conditions: e.conditions, source: e.source, unit: "m", table: Object.entries(e.table).map(([z, g]) => `${z},${g}`).join("\n"), minDenominator: String(e.minDenominator), steps: e.steps };
      this.changed();
      this.render();
    });
    this.button(p, "\uC120\uD0DD \uC7A5\uBE44 \uC0AD\uC81C", () => {
      const index = state.equipment.findIndex((e) => e.id === list.value);
      if (index < 0) return;
      state.deletedEquipment = { equipment: state.equipment[index], index };
      state.equipment.splice(index, 1);
      applyEquipment(state);
      this.changed();
      this.render();
      new import_obsidian.Notice("\uC7A5\uBE44 \uC0AD\uC81C\uB428 \xB7 \uC0AD\uC81C \uB418\uB3CC\uB9AC\uAE30\uB85C \uBCF5\uAD6C\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
    });
    if (state.deletedEquipment) this.button(p, "\uC0AD\uC81C \uB418\uB3CC\uB9AC\uAE30", () => {
      const deleted = state.deletedEquipment;
      if (!state.equipment.some((e) => e.id === deleted.equipment.id)) state.equipment.splice(deleted.index, 0, deleted.equipment);
      delete state.deletedEquipment;
      applyEquipment(state);
      this.changed();
      this.render();
    });
    const draft = state.draft ?? { ...emptyDraft(), unit: state.inputs.gnUnit, minDenominator: String(state.inputs.minDenominator), steps: state.inputs.steps };
    node(p, "p", draft.id ? "\uAE30\uC874 \uC7A5\uBE44 \uD3B8\uC9D1 \uC911 \xB7 \uC800\uC7A5 \uC2DC \uAC19\uC740 ID \uC720\uC9C0" : "\uC0C8 \uC7A5\uBE44 \uC791\uC131 \xB7 \uC791\uC131 \uC911 \uB0B4\uC6A9 \uC790\uB3D9 \uBCF4\uC874");
    const saveDraft = () => {
      state.draft = draft;
      void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
    };
    for (const [key, label] of [["name", draft.id ? "\uC7A5\uBE44 \uC774\uB984" : "\uC0C8 \uC7A5\uBE44 \uC774\uB984"], ["conditions", "\uCE21\uC815 \uC870\uAC74 (ISO100\xB7\uCD5C\uB300 \uCD9C\uB825\xB7\uC9C1\uC811\uAD11 \uB4F1)"], ["source", "\uCD9C\uCC98 URL\xB7\uC124\uBA85\uC11C \uD398\uC774\uC9C0 \uB610\uB294 \uC2E4\uCE21 \uBC29\uBC95"], ["minDenominator", "\uD504\uB9AC\uC14B \uCD5C\uC18C \uCD9C\uB825 \uBD84\uBAA8"], ["steps", "\uD504\uB9AC\uC14B \uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8"]]) {
      const t = this.text(p, label, draft[key]);
      this.listen(t, "input", () => {
        draft[key] = t.value;
        saveDraft();
      });
    }
    const unit = node(p, "select");
    unit.setAttribute("aria-label", "\uD504\uB9AC\uC14B GN \uB2E8\uC704");
    for (const u of ["m", "ft"]) {
      const o = node(unit, "option", u);
      o.value = u;
    }
    unit.value = draft.unit;
    this.listen(unit, "change", () => {
      draft.unit = unit.value === "ft" ? "ft" : "m";
      saveDraft();
    });
    const l = node(p, "label", void 0, "pfm-field");
    node(l, "span", "\uC90Cmm,GN \xB7 \uD55C \uC904\uC5D0 \uD55C \uCE21\uC815\uAC12");
    const table = node(l, "textarea");
    table.placeholder = "\uC90Cmm,GN";
    table.rows = 5;
    table.value = draft.table;
    this.listen(table, "input", () => {
      draft.table = table.value;
      saveDraft();
    });
    this.button(p, draft.id ? "\uC7A5\uBE44 \uBCC0\uACBD \uC800\uC7A5" : "\uC0C8 \uC7A5\uBE44 \uD504\uB9AC\uC14B \uC800\uC7A5", () => {
      try {
        const e = { id: draft.id || equipmentId(state.equipment), name: draft.name.trim(), conditions: draft.conditions.trim(), source: draft.source.trim(), table: parseTable(draft.table, draft.unit), minDenominator: parseNumber(draft.minDenominator), steps: draft.steps };
        if (!equipmentValid(e)) throw Error("\uC774\uB984\xB7\uCE21\uC815 \uC870\uAC74\xB7\uCD9C\uCC98\xB7\uC720\uD6A8\uD55C GN \uD45C\uC640 \uC9C0\uC6D0 \uCD9C\uB825\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.");
        const index = state.equipment.findIndex((v) => v.id === e.id);
        if (index < 0) state.equipment.push(e);
        else state.equipment[index] = e;
        delete state.draft;
        applyEquipment(state);
        this.changed();
        void this.plugin.flush().then(() => new import_obsidian.Notice("\uC7A5\uBE44 \uC800\uC7A5 \uC644\uB8CC")).catch((e2) => this.plugin.reportSaveError(e2));
        this.render();
      } catch (e) {
        this.plugin.report(e);
      }
    });
    this.button(p, "\uD3B8\uC9D1 \uCDE8\uC18C \xB7 \uCD08\uC548 \uBE44\uC6B0\uAE30", () => {
      delete state.draft;
      this.changed();
      this.render();
    });
  }
  paint(remember = true) {
    if (remember) this.rememberDetails();
    const i = this.plugin.state.inputs;
    this.context.textContent = `${i.linked ? "\uC628\uCE74\uBA54\uB77C \xB7 \uAC70\uB9AC \uC5F0\uB3D9" : "\uC624\uD504\uCE74\uBA54\uB77C \xB7 \uAC70\uB9AC \uBD84\uB9AC"} / ${i.gnMode === "equipment" ? "\uC7A5\uBE44 GN" : "\uC218\uB3D9 GN"} / ${i.mode === "manual" ? "\uC9C1\uC811\uAD11 \xB7 \uC77C\uBC18 \uB3D9\uC870" : "GN \uBAA8\uB378 \uBBF8\uC9C0\uC6D0 \uC870\uAC74"}`;
    this.syncPower();
    for (const key of ["gn", "gnZoom", "minDenominator"]) if (document.activeElement !== this.numeric.get(key)?.input) this.syncNumeric(key);
    const mode = this.root.querySelector("select[data-key=gnMode]");
    if (mode) mode.value = i.gnMode;
    this.gnDisplayUnit = i.gnUnit;
    const unit = this.root.querySelector("select[data-key=gnUnit]");
    if (unit) unit.value = i.gnUnit;
    for (const key of ["conditions", "steps"]) {
      const field = this.root.querySelector(`input[data-key=${key}]`);
      if (field && document.activeElement !== field) field.value = i[key];
    }
    this.results.replaceChildren();
    this.resultDetails.replaceChildren();
    this.root.dataset.tab = i.tab;
    this.root.dataset.linked = String(i.linked);
    const flashPanel = node(this.results, "div", void 0, "pfm-flash-results");
    const equipment = selectedEquipment(this.plugin.state);
    if (i.gnMode === "equipment") node(flashPanel, "small", equipment ? `${equipment.name} \xB7 \uC0AC\uC6A9 \uAC00\uB2A5 \uC90C ${Object.keys(equipment.table).join(", ")}mm` : "\uC120\uD0DD \uC7A5\uBE44 \uC5C6\uC74C \xB7 \uC7A5\uBE44\uB97C \uC120\uD0DD\uD558\uAC70\uB098 \uC218\uB3D9 GN\uC73C\uB85C \uC804\uD658\uD558\uC138\uC694.");
    try {
      const f = flash(i);
      if (!f.supported) node(flashPanel, "p", f.powerLabel, "pfm-warning");
      node(flashPanel, "p", "\uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC", "pfm-eyebrow");
      const hero = node(flashPanel, "div", void 0, "pfm-hero");
      node(hero, "span", fmt(f.d), "pfm-value");
      hero.append(document.createTextNode(" "));
      node(hero, "span", "m", "pfm-unit");
      node(flashPanel, "p", `1/${i.denominator} \xB7 f/${fmt(i.aperture)} \xB7 ISO ${fmt(i.iso, 0)} \xB7 GN ${fmt(f.g)}m (${fmt(i.zoom)}mm\xB7ISO100 \uCD5C\uB300)`);
      if (i.conditions.includes("\uC5F0\uC2B5\uC6A9 \uAC00\uC0C1 GN")) node(flashPanel, "small", "\uC5F0\uC2B5\uC6A9 GN \xB7 \uC2E4\uC81C \uC7A5\uBE44 \uC0AC\uC591 \uC544\uB2D8", "pfm-model-note");
      const label = f.ev > i.tolerance ? "\uC608\uC0C1 \uACFC\uB2E4 \uB178\uCD9C" : f.ev < -i.tolerance ? "\uC608\uC0C1 \uBD80\uC871 \uB178\uCD9C" : "\uD5C8\uC6A9 \uBC94\uC704 \uB0B4";
      node(flashPanel, "p", `${metres(f.r)}\uC5D0\uC11C ${f.ev > 0 ? "+" : ""}${fmt(f.ev)} EV \xB7 ${label}`, "pfm-ev");
      const d = node(this.resultDetails, "details", void 0, "pfm-flash-details");
      node(d, "summary", "\uD544\uC694 \uCD9C\uB825\xB7\uC870\uB9AC\uAC1C\xB7\uAC70\uB9AC\uBCC4 \uD45C");
      node(d, "p", `${f.powerLabel} \xB7 ${i.gnMode === "equipment" ? "\uC7A5\uBE44 \uD45C" : "\uC218\uB3D9 GN"}`);
      node(d, "p", i.conditions);
      node(d, "p", `\xB1${fmt(i.tolerance)}EV: ${metres(f.low)} ~ ${metres(f.high)}. \uAC00\uAE4C\uC6B0\uBA74 \uACFC\uB2E4 \uB178\uCD9C\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`);
      node(d, "p", `\uD544\uC694 \uC870\uB9AC\uAC1C f/${fmt(f.requiredAperture)} \xB7 \uD544\uC694 \uCD9C\uB825 ${fmt(f.needed * 100)}% \xB7 ${f.status}`);
      node(d, "p", `\uAD8C\uC7A5 \uC9C0\uC6D0 \uB2E8\uACC4 1/${f.nearest} \xB7 \uC608\uC0C1 ${metres(f.nearestDistance)} \u2192 \uB0A8\uB294 \uC624\uCC28 ${f.residual > 0 ? "+" : ""}${fmt(f.residual)} EV`);
      this.table(d, ["\uCD9C\uB825", "\uC608\uC0C1 \uAC70\uB9AC"], f.distances.map((x) => [`1/${x.n}`, metres(x.d)]));
      this.table(d, ["\uD50C\uB798\uC2DC \uAC70\uB9AC", "\uB178\uCD9C \uCC28\uC774"], [0.5, 0.70710678, 1, 1.41421356, 2].map((v) => [metres(f.d * v), `${fmt(exposureEV(f.d, f.d * v))} EV \xB7 ${v < 1 ? "\uACFC\uB2E4" : v > 1 ? "\uBD80\uC871" : "\uAE30\uC900 \uC801\uC815"}`]));
    } catch (e) {
      node(flashPanel, "p", "\uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC", "pfm-eyebrow");
      node(flashPanel, "div", "\u2014", "pfm-hero");
      node(flashPanel, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
    if (i.tab === "flash") this.results.append(this.picture);
    else this.results.prepend(this.picture);
    const dof = node(this.results, "div", void 0, "pfm-dof-results");
    try {
      const o = optics(i);
      node(dof, "h2", "\uC2EC\uB3C4\xB7\uD654\uAC01");
      const grid = node(dof, "div", void 0, "pfm-stat-grid");
      for (const [key, label, value] of [["near", "\uADFC\uAC70\uB9AC", o.near], ["far", "\uC6D0\uAC70\uB9AC", o.far], ["total", "\uC804\uCCB4 \uC2EC\uB3C4", o.total], ["hyperfocal", "\uACFC\uCD08\uC810", o.hyperfocal]]) {
        const card = node(grid, "div", void 0, "pfm-stat");
        card.dataset.stat = key;
        node(card, "span", label);
        node(card, "strong", metres(value));
      }
      const bar = node(dof, "div", void 0, "pfm-dof-bar");
      node(bar, "span", o.total < 0.1524 ? "\uC811\uC0AC\xB7\uC81C\uD488 \uCC38\uACE0" : o.total < 0.6096 ? "\uC778\uBB3C \uCC38\uACE0" : o.total < 3.048 ? "\uADF8\uB8F9\xB7\uD589\uC0AC \uCC38\uACE0" : o.total < 9.144 ? "\uAC70\uB9AC\xB7\uAC74\uCD95 \uCC38\uACE0" : "\uD48D\uACBD \uCC38\uACE0", "pfm-dof-badge");
      const focus = node(bar, "button", "\uACFC\uCD08\uC810 \uB9DE\uCD94\uAE30");
      focus.type = "button";
      focus.dataset.pfmHyperfocal = "true";
      const od = node(this.resultDetails, "details", void 0, "pfm-dof-details");
      node(od, "summary", "\uC804\uCCB4 \uC2EC\uB3C4\xB7\uACFC\uCD08\uC810\xB7\uD654\uAC01\xB7\uD68C\uC808");
      node(od, "p", `\uADFC\uAC70\uB9AC ${metres(o.near)} \xB7 \uC6D0\uAC70\uB9AC ${metres(o.far)} \xB7 \uC804\uCCB4 ${metres(o.total)} \xB7 \uACFC\uCD08\uC810 ${metres(o.hyperfocal)}`);
      node(od, "p", `\uD654\uAC01 \uC218\uD3C9 ${fmt(o.horizontal, 1)}\xB0 / \uC218\uC9C1 ${fmt(o.vertical, 1)}\xB0 / \uB300\uAC01 ${fmt(o.diagonal, 1)}\xB0`);
      node(od, "p", `\uC2E4\uC81C ${fmt(i.focal)}mm \u2192 35mm \uD658\uC0B0 ${fmt(o.equivalent, 1)}mm \xB7 CoC ${fmt(o.c, 5)}mm`);
      node(od, "p", `\uD68C\uC808 \uADFC\uC0AC: \uD30C\uC7A5 550nm, Airy \uC9C0\uB984 ${fmt(o.airy, 5)}mm (${fmt(o.airy / o.c)}\xD7CoC). ${o.airy > o.c ? "CoC\uBCF4\uB2E4 \uCEE4\uC9C8 \uC218 \uC788\uC74C." : "CoC \uC774\uD558."} \uC808\uB300 \uC120\uBA85\uB3C4 \uD310\uC815\uC774 \uC544\uB2D9\uB2C8\uB2E4.`);
    } catch (e) {
      node(dof, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
    try {
      const c = coverage(i);
      const p = node(this.resultDetails, "details", void 0, "pfm-coverage-results");
      node(p, "summary", "\uD504\uB808\uC784\xB7\uC870\uC0AC \uBC94\uC704 \uBE44\uAD50");
      node(p, "p", `\uD504\uB808\uC784 ${fmt(c.camera.width)}\xD7${fmt(c.camera.height)}m \xB7 \uC870\uC0AC \uBC94\uC704 ${fmt(c.flash.width)}\xD7${fmt(c.flash.height)}m`);
      node(p, "p", i.linked ? c.narrow ? "\uC8FC\uC758: \uD504\uB808\uC784 \uAC00\uC7A5\uC790\uB9AC \uAD11\uB7C9 \uBD80\uC871 \uAC00\uB2A5\uC131. \uC2E4\uC81C \uBC30\uAD11\uC740 \uADE0\uC77C\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uB3D9\uC77C \uC704\uCE58\xB7\uBC29\uD5A5 \uAC00\uC815. \uC2E4\uC81C \uBC30\uAD11\uC740 \uADE0\uC77C\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uC624\uD504\uCE74\uBA54\uB77C: \uAC01\uAC01\uC758 \uAC70\uB9AC \uD3C9\uBA74 \uBC94\uC704\uC785\uB2C8\uB2E4. \uC704\uCE58\xB7\uBC29\uD5A5\uC744 \uC785\uB825\uD558\uC9C0 \uC54A\uC544 \uACF5\uAC04 \uC911\uCCA9\uC744 \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
    } catch (e) {
      node(this.resultDetails, "p", `\uD504\uB808\uC784\xB7\uC870\uC0AC \uBC94\uC704 \uBE44\uAD50: ${e instanceof Error ? e.message : String(e)}`, "pfm-error pfm-coverage-results");
    }
    if (i.loss > 0) node(this.resultDetails, "p", "\uCD94\uAC00 \uC190\uC2E4\uC744 \uC801\uC6A9\uD55C \uCD94\uC815. GN\uC5D0 \uD3EC\uD568\uB41C \uC190\uC2E4\uC758 \uC911\uBCF5 \uBCF4\uC815\uC5D0 \uC8FC\uC758\uD558\uC138\uC694.");
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
    this.notes = Promise.resolve();
    this.saveError = "";
    this.active = false;
    this.opening = null;
  }
  async onload() {
    this.state = restore(await this.loadData());
    this.stableInputs = { ...this.state.inputs };
    this.active = true;
    this.writer = new LatestWriter((data) => this.saveData(data), () => {
      if (this.writer.error && !this.saveError) this.report(this.writer.error);
      this.saveError = this.writer.error ? `\uC124\uC815 \uC800\uC7A5 \uC2E4\uD328: ${this.writer.error instanceof Error ? this.writer.error.message : String(this.writer.error)} \xB7 \uB2E4\uC2DC \uC800\uC7A5\uD558\uC138\uC694.` : "";
      for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PhotoView) leaf.view.updateSaveStatus();
    });
    const flush = () => {
      void this.flush().catch((e) => this.reportSaveError(e));
    };
    this.registerDomEvent(document, "visibilitychange", () => {
      if (document.visibilityState === "hidden") flush();
    });
    this.registerDomEvent(window, "pagehide", flush);
    this.registerView(VIEW, (leaf) => new PhotoView(leaf, this));
    this.addCommand({ id: "open", name: "\uCD2C\uC601 \uACC4\uC0B0 \uC5F4\uAE30", icon: "camera", callback: () => {
      void this.open().catch((e) => this.report(e));
    } });
    this.addCommand({ id: "save-note", name: "\uC804\uCCB4 \uACC4\uC0B0\uC744 \uB178\uD2B8\uB85C \uC800\uC7A5", callback: () => {
      void this.saveNote().catch((e) => this.report(e));
    } });
    this.addCommand({ id: "save-tab-note", name: "\uD604\uC7AC \uD0ED \uACB0\uACFC \uC800\uC7A5", callback: () => {
      void this.saveNote(this.state.inputs.tab).catch((e) => this.report(e));
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
    return this.writer.request(data);
  }
  async flush() {
    if (this.writer) await this.writer.flush();
  }
  reportSaveError(e) {
    if (!this.saveError) {
      this.saveError = "\uC124\uC815 \uC800\uC7A5 \uC2E4\uD328 \xB7 \uB2E4\uC2DC \uC800\uC7A5\uD558\uC138\uC694.";
      this.report(e);
    }
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PhotoView) leaf.view.updateSaveStatus();
  }
  refresh(source) {
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PhotoView && leaf.view !== source) leaf.view.render();
  }
  saveNote(scope = "all") {
    const i = { ...this.state.inputs }, equipment = selectedEquipment(this.state);
    let content;
    try {
      validateNote(i, scope);
      content = note(i, /* @__PURE__ */ new Date(), { version: this.manifest.version, equipment, scope });
    } catch (e) {
      return Promise.reject(e);
    }
    const task = this.notes.catch(() => void 0).then(async () => {
      const folder = (0, import_obsidian2.normalizePath)("\uC0AC\uC9C4 \uCD2C\uC601 \uACC4\uC0B0");
      if (!this.app.vault.getAbstractFileByPath(folder)) try {
        await this.app.vault.createFolder(folder);
      } catch (e) {
        if (!(this.app.vault.getAbstractFileByPath(folder) instanceof import_obsidian2.TFolder)) throw e;
      }
      if (!(this.app.vault.getAbstractFileByPath(folder) instanceof import_obsidian2.TFolder)) throw Error("\uC800\uC7A5 \uD3F4\uB354 \uACBD\uB85C\uC5D0 \uD30C\uC77C\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uC774\uB984\uC73C\uB85C \uC62E\uACA8\uC8FC\uC138\uC694.");
      const base = `${folder}/\uCD2C\uC601 \uACC4\uC0B0 ${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}`;
      for (let n = 0; n < 1e3; n++) {
        const path = `${base}${n ? "-" + n : ""}.md`;
        if (this.app.vault.getAbstractFileByPath(path)) continue;
        try {
          await this.app.vault.create(path, content);
          this.noteNotice?.hide();
          this.noteNotice = new import_obsidian2.Notice(`\uC800\uC7A5 \uC644\uB8CC: ${path}`, 2500);
          return path;
        } catch (e) {
          if (!this.app.vault.getAbstractFileByPath(path)) throw e;
        }
      }
      throw Error("\uC0C8 \uB178\uD2B8 \uC774\uB984\uC744 \uD655\uBCF4\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4. \uB2E4\uC2DC \uC800\uC7A5\uD558\uC138\uC694.");
    });
    this.notes = task;
    return task;
  }
  update(key, value) {
    if (key === "gnMode") {
      setGnMode(this.state, value);
      return;
    }
    this.state.inputs[key] = value;
    if (key === "zoom") applyEquipment(this.state);
    if (["gn", "gnZoom", "conditions", "steps", "minDenominator"].includes(key) && this.state.inputs.gnMode === "equipment") {
      this.state.inputs.gnMode = "manual";
    }
  }
  onunload() {
    this.active = false;
    this.noteNotice?.hide();
    void this.flush().catch((e) => this.reportSaveError(e));
    this.app.workspace.detachLeavesOfType(VIEW);
  }
};
