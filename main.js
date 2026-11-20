/* Photo Field Mobile · 원본 depth-of-field — Jack Herrington (MIT).
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
var FULL_STOP_APERTURES = "1.2,1.4,1.8,2,2.8,4,5.6,8,11,16,22,32";
var FM2_SHUTTERS = [1, 2, 4, 8, 15, 30, 60, 125, 250, 500, 1e3, 2e3, 4e3];
var FM2_SYNC_SHUTTER = 250;
var FILL_RATIOS = [-1, -1.5, -2, -3];
var defaults = {
  gnMode: "manual",
  equipmentId: "",
  sensor: "ff",
  width: 36,
  height: 24,
  focal: 50,
  aperture: 4,
  iso: 400,
  cameraDistance: 5,
  focusInfinity: false,
  linked: true,
  flashDistance: 5,
  cocMode: "film",
  coc: 0.03,
  gn: 40,
  gnUnit: "m",
  gnZoom: 50,
  zoom: 50,
  conditions: "\uC5F0\uC2B5\uC6A9 \uAC00\uC0C1 GN \xB7 \uC7A5\uBE44 \uC0AC\uC591 \uC544\uB2D8 \xB7 ISO100\xB7\uCD5C\uB300\uCD9C\uB825\xB7\uC9C1\uC811\uAD11\xB750mm",
  reciprocityFilm: "vision3-500t",
  meteredSeconds: 4,
  reciprocityOverrides: {},
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
  tab: "combined",
  flashOn: false,
  zoneOn: false,
  flashWasEnabled: false,
  nightMode: false,
  shutter: 125,
  fillRatio: -1.5,
  cropBasis: "nominal",
  zoneFlow: "current",
  zoneGoal: "infinity",
  zoneNear: 2,
  zoneFar: 5,
  zoneInfinity: false,
  apertureMin: 1.4,
  apertureMax: 16,
  apertureSteps: FULL_STOP_APERTURES
};
function assignInput(i, key, value) {
  i[key] = value;
  if (key === "cameraDistance") i.focusInfinity = false;
  if (key === "flashOn" && i.flashOn && !i.flashWasEnabled) {
    i.linked = true;
    i.flashWasEnabled = true;
  }
}
var sensors = {
  ff: { name: "35mm \uD544\uB984", width: 36, height: 24 },
  half: { name: "\uD558\uD504\uD504\uB808\uC784 \uD544\uB984", width: 24, height: 18 },
  mf645: { name: "\uC911\uD615 645 \uD544\uB984", width: 56, height: 41.5 },
  mf66: { name: "\uC911\uD615 6\xD76 \uD544\uB984", width: 56, height: 56 },
  mf67: { name: "\uC911\uD615 6\xD77 \uD544\uB984", width: 70, height: 56 },
  apsc: { name: "\uB514\uC9C0\uD138 APS-C 1.5\xD7", width: 23.6, height: 15.6 },
  apsc16: { name: "\uB514\uC9C0\uD138 APS-C 1.6\xD7", width: 22.3, height: 14.9 },
  mft: { name: "\uB514\uC9C0\uD138 \uB9C8\uC774\uD06C\uB85C \uD3EC\uC11C\uC988", width: 17.3, height: 13 }
};

// src/units.ts
var feetToMetres = (v) => v * 0.3048;
var metresToFeet = (v) => v / 0.3048;
function parseNumber(v) {
  return v.trim() === "" ? NaN : Number(v);
}
function fmt(v, digits = 2) {
  if (v === Infinity) return "\u221E";
  if (!Number.isFinite(v)) return "\u2014";
  return (Math.abs(v) < 0.5 * 10 ** -digits ? 0 : v).toLocaleString("ko-KR", { maximumFractionDigits: digits });
}
var DISTANCE_DIGITS = 1;
function stepDistance(value, direction, minimum) {
  const nearBoundary = (boundary2) => Math.abs(value - boundary2) <= 1e-9;
  const distance = nearBoundary(1) ? 1 : nearBoundary(10) ? 10 : value;
  const increment = distance < 1 || distance === 1 && direction < 0 ? 0.01 : distance < 10 || distance === 10 && direction < 0 ? 0.1 : 1;
  const next = Math.max(minimum, Number((distance + direction * increment).toPrecision(15)));
  const boundary = [1, 10].find((b) => b >= minimum && (b - distance) * direction > 0 && (next - b) * direction > 0);
  return (next - value) * direction > 0 ? boundary ?? next : void 0;
}
function distanceParts(v, digits = DISTANCE_DIGITS) {
  if (v === Infinity) return { value: "\u221E", unit: "" };
  if (!Number.isFinite(v) || v < 0) return { value: "\u2014", unit: "" };
  const unit = v <= 1 ? "cm" : "m", scaled = unit === "cm" ? v * 100 : v;
  const value = scaled > 0 && scaled < 0.5 * 10 ** -digits ? `<${fmt(10 ** -digits, digits)}` : fmt(scaled, digits);
  return { value, unit };
}
function metres(v, digits = DISTANCE_DIGITS) {
  const d = distanceParts(v, digits);
  return d.unit ? `${d.value} ${d.unit}` : d.value;
}

// src/engine.ts
function positive(...values) {
  if (values.some((v) => !Number.isFinite(v) || v <= 0)) throw Error("\uC591\uC758 \uC720\uD55C\uD55C \uC218\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
}
function angle(size, focal) {
  positive(size, focal);
  const result = 2 * Math.atan(size / focal / 2) * 180 / Math.PI;
  positive(result);
  if (result >= 180) throw Error("\uD654\uAC01\uC774 \uC218\uCE58 \uD45C\uD604 \uD55C\uACC4\uC5D0 \uB3C4\uB2EC\uD588\uC2B5\uB2C8\uB2E4. \uC785\uB825 \uADDC\uBAA8\uB97C \uC904\uC774\uC138\uC694.");
  return result;
}
function footprint(r, h, v) {
  positive(r, h, v);
  if (h >= 180 || v >= 180) throw Error("\uC870\uC0AC\uAC01\uC740 180\xB0 \uBBF8\uB9CC\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.");
  const width = 2 * r * Math.tan(h * Math.PI / 360), height = 2 * r * Math.tan(v * Math.PI / 360);
  positive(width, height);
  return { width, height };
}
var FILM_COC_35MM = 0.03;
function circleOfConfusion(i) {
  const diagonal = Math.hypot(i.width, i.height);
  return i.cocMode === "custom" ? i.coc : i.cocMode === "estimate" ? diagonal / 1500 : FILM_COC_35MM * diagonal / Math.hypot(36, 24);
}
var filmFromLens = (s, f) => s * s / (s - f);
var minFocusDistance = (focal) => 4 * focal / 1e3 + 1e-3;
function lensFromFilm(D, f) {
  positive(D, f);
  if (D < 4 * f) throw Error("\uCD08\uC810 \uB9DE\uCD9C \uAC70\uB9AC\uB294 \uD544\uB984\uBA74 \uAE30\uC900\uC73C\uB85C \uCD08\uC810\uAC70\uB9AC\uC758 4\uBC30 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4. (\uB4F1\uBC30\uBCF4\uB2E4 \uAC00\uAE4C\uC6B4 \uC811\uC0AC\uB294 \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4)");
  return (D + Math.sqrt(D * (D - 4 * f))) / 2;
}
var hyperfocalFilm = (h0, f) => {
  const H = h0 + f;
  return H * H / h0;
};
function optics(i) {
  positive(i.width, i.height, i.focal, i.aperture);
  if (!i.focusInfinity) positive(i.cameraDistance);
  const c = circleOfConfusion(i);
  positive(c);
  const f = i.focal, h0 = f * f / (i.aperture * c), H = h0 + f;
  positive(h0, H);
  const hyperfocal = hyperfocalFilm(h0, f) / 1e3;
  positive(hyperfocal);
  let near, far;
  if (i.focusInfinity) {
    near = H / 1e3;
    far = Infinity;
  } else {
    const s = lensFromFilm(i.cameraDistance * 1e3, f), v = f * s / (s - f);
    positive(s, v);
    const atInfinity = i.cameraDistance >= hyperfocal;
    near = (h0 * s / (h0 + s - f) + v) / 1e3;
    far = atInfinity ? Infinity : s * (H * s - f * (H + s)) / ((hyperfocal - i.cameraDistance) * 1e3 * (s - f)) / 1e3 + v / 1e3;
    if (!atInfinity) positive(far);
  }
  positive(near);
  const equivalent = f * (Math.hypot(36, 24) / Math.hypot(i.width, i.height)), airy = 2.44 * 55e-5 * i.aperture;
  positive(equivalent, airy);
  return {
    c,
    hyperfocal,
    near,
    far,
    total: far - near,
    horizontal: angle(i.width, f),
    vertical: angle(i.height, f),
    diagonal: angle(Math.hypot(i.width, i.height), f),
    equivalent,
    airy
  };
}
function effectiveGN(g, p, iso, loss) {
  positive(g, p, iso);
  if (p > 1 || !Number.isFinite(loss)) throw Error("\uCD9C\uB825\uC740 0 \uCD08\uACFC 1 \uC774\uD558, \uAD11\uB7C9 \uBCF4\uC815\uC740 \uC720\uD55C\uD55C \uC218\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
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
function nearestPower(steps, targetEV) {
  const residualFor = (n) => -Math.log2(n) - targetEV;
  const nearest = steps.reduce((best, n) => Math.abs(residualFor(n)) < Math.abs(residualFor(best)) ? n : best);
  return { nearest, residual: residualFor(nearest) };
}
function flash(i) {
  if (i.mode !== "manual") throw Error("\uC120\uD0DD \uC870\uAC74\uC740 \uAE30\uBCF8 GN \uBAA8\uB378\uB85C \uACC4\uC0B0\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC2E4\uCE21 \uB610\uB294 \uC804\uC6A9 \uC790\uB8CC\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
  positive(i.zoom);
  if (i.linked && i.focusInfinity) throw Error("\uCD08\uC810\uC774 \uBB34\uD55C\uB300\uB77C \uD50C\uB798\uC2DC\u2192\uD53C\uC0AC\uCCB4 \uAC70\uB9AC\uB97C \uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC624\uD504\uCE74\uBA54\uB77C\uB85C \uD50C\uB798\uC2DC \uAC70\uB9AC\uB97C \uC9C1\uC811 \uC785\uB825\uD558\uC138\uC694.");
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
  const neededEV = 2 * (Math.log2(i.aperture) + Math.log2(r) - Math.log2(effectiveGN(g, 1, i.iso, i.loss)));
  const { nearest, residual } = nearestPower(steps, neededEV);
  const low = d / 2 ** (i.tolerance / 2), high = d * 2 ** (i.tolerance / 2), requiredAperture = gn / r;
  positive(low, high, requiredAperture);
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
    requiredAperture,
    nearest,
    residual,
    low,
    high,
    status: needed > 1 ? "\uCD5C\uB300 \uCD9C\uB825\uC73C\uB85C\uB3C4 \uBD80\uC871" : needed < 1 / i.minDenominator ? "\uCD5C\uC18C \uCD9C\uB825\uBCF4\uB2E4 \uB0AE\uC740 \uCD9C\uB825 \uD544\uC694" : "\uC7A5\uBE44 \uCD9C\uB825 \uBC94\uC704 \uC548",
    steps,
    distances: steps.map((n) => ({ n, d: flashDistance(g, 1 / n, i.iso, i.aperture, i.loss) }))
  };
}
function coverage(i) {
  if (i.focusInfinity) throw Error("\uCD08\uC810 \uBB34\uD55C\uB300\uC5D0\uC11C\uB294 \uD504\uB808\uC784\xB7\uC870\uC0AC \uBC94\uC704\uB97C \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
  const h = i.coverage === "approx" ? angle(36, i.zoom) : i.horizontal;
  const v = i.coverage === "approx" ? angle(24, i.zoom) : i.vertical;
  const r = i.linked ? i.cameraDistance : i.flashDistance;
  positive(i.width, i.height);
  const s = lensFromFilm(i.cameraDistance * 1e3, i.focal), scale = (s - i.focal) / i.focal / 1e3, camera = { width: i.width * scale, height: i.height * scale };
  positive(camera.width, camera.height);
  return { h, v, flash: footprint(r, h, v), camera, narrow: h < angle(i.width, i.focal) || v < angle(i.height, i.focal) };
}

// src/field.ts
var shootingKeys = ["sensor", "width", "height", "focal", "aperture", "iso", "gnMode", "equipmentId", "gn", "gnUnit", "gnZoom", "zoom", "conditions", "denominator", "linked", "cocMode", "coc", "coverage", "horizontal", "vertical", "loss", "tolerance", "minDenominator", "steps", "mode"];
var freshField = () => ({ version: 1, simple: false, shots: [], zones: [], distances: [1, 1.5, 2, 3, 5].map((metres2, n) => ({ id: `distance-${n + 1}`, metres: metres2 })) });
function patch(i, values) {
  const before = {}, after = {};
  for (const k of Object.keys(values)) if (!Object.is(i[k], values[k])) {
    Object.assign(before, { [k]: i[k] });
    Object.assign(after, { [k]: values[k] });
  }
  Object.assign(i, after);
  return { before, after };
}
function canUndo(i, p) {
  return Object.entries(p.after).every(([k, v]) => Object.is(i[k], v));
}
function undo(i, p) {
  if (!canUndo(i, p)) return false;
  Object.assign(i, p.before);
  return true;
}
function nextPower(i, direction) {
  try {
    const list = powerSteps(i.steps, i.minDenominator);
    return direction === "weaker" ? list.find((n) => n > i.denominator) : [...list].reverse().find((n) => n < i.denominator);
  } catch {
    return void 0;
  }
}
function restoreField(raw) {
  const f = freshField();
  if (!raw || typeof raw !== "object") return f;
  const d = raw;
  if (typeof d.version === "number" && d.version > 1) throw Error("\uB354 \uC0C8 \uD604\uC7A5 \uC124\uC815 \uC2A4\uD0A4\uB9C8\uC785\uB2C8\uB2E4. \uB36E\uC5B4\uC4F0\uC9C0 \uC54A\uB3C4\uB85D \uB85C\uB4DC\uB97C \uC911\uB2E8\uD569\uB2C8\uB2E4.");
  if (typeof d.activeShotId === "string") f.activeShotId = d.activeShotId;
  f.simple = d.simple === true;
  const used = /* @__PURE__ */ new Set();
  const identity = (x) => {
    if (!x || typeof x.id !== "string" || !x.id || used.has(x.id)) return false;
    used.add(x.id);
    return true;
  };
  if (Array.isArray(d.distances)) {
    f.distances = [];
    for (const x of d.distances) if (identity(x) && typeof x.metres === "number" && Number.isFinite(x.metres) && x.metres > 0 && x.metres <= 1e6 && !f.distances.some((y) => y.metres === x.metres)) f.distances.push({ id: x.id, metres: x.metres });
  }
  if (Array.isArray(d.zones)) {
    for (const x of d.zones) if (identity(x) && typeof x.name === "string" && x.name.trim() && x.name.length <= 100 && Number.isFinite(x.near) && x.near > 0 && Number.isFinite(x.far) && x.far > 0 && typeof x.infinity === "boolean" && (x.infinity || x.far > x.near)) f.zones.push({ id: x.id, name: x.name, near: x.near, far: x.far, infinity: x.infinity });
  }
  if (Array.isArray(d.shots)) for (const x of d.shots) {
    if (!identity(x) || typeof x.name !== "string" || !x.name.trim() || x.name.length > 100 || !x.values || typeof x.values !== "object") continue;
    const v = x.values;
    const good = shootingKeys.every((k) => typeof v[k] === typeof defaults[k] && (typeof v[k] !== "number" || Number.isFinite(v[k]))) && ["manual", "equipment"].includes(v.gnMode) && ["m", "ft"].includes(v.gnUnit) && ["approx", "angles"].includes(v.coverage) && ["film", "estimate", "custom"].includes(v.cocMode) && ["manual", "ttl", "hss", "bounce", "modifier", "near"].includes(v.mode) && (!("focusInfinity" in v) || typeof v.focusInfinity === "boolean") && ["cameraDistance", "flashDistance"].every((k) => !(k in v) || Number.isFinite(v[k]) && Number(v[k]) > 0);
    if (!good) continue;
    const values = {};
    for (const k of [...shootingKeys, "cameraDistance", "flashDistance", "focusInfinity"]) if (k in v) Object.assign(values, { [k]: v[k] });
    f.shots.push({ id: x.id, name: x.name, values, ...typeof x.equipmentSignature === "string" ? { equipmentSignature: x.equipmentSignature } : {} });
  }
  return f;
}

// src/presets.ts
function signature(e) {
  return JSON.stringify([e.conditions, e.source, e.minDenominator, e.steps, Object.entries(e.table).sort(([a], [b]) => Number(a) - Number(b))]);
}
function issue(s, shot) {
  if (shot.values.gnMode !== "equipment") return "";
  const e = s.equipment.find((e2) => e2.id === shot.values.equipmentId);
  return !e ? "\uCC38\uC870 \uC7A5\uBE44 \uC0AD\uC81C\uB428 \xB7 \uC7A5\uBE44\uB97C \uBCF5\uAD6C\uD558\uAC70\uB098 \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694." : signature(e) !== shot.equipmentSignature ? "\uCC38\uC870 \uC7A5\uBE44 \uC0AC\uC591 \uBCC0\uACBD\uB428 \xB7 \uD604\uC7AC \uC0AC\uC591\uC744 \uD655\uC778\uD558\uACE0 \uC7A5\uBE44\uB97C \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694." : "";
}
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
  const active = state.legacyShotDetached ? void 0 : state.field?.shots.find((s) => s.id === state.field?.activeShotId);
  const problem = active && active.values.equipmentId === i.equipmentId ? issue(state, active) : "";
  if (problem) {
    i.gn = 0;
    i.gnZoom = 0;
    i.conditions = problem;
    i.steps = e?.steps ?? "";
    if (e) i.minDenominator = e.minDenominator;
    return;
  }
  if (!e) {
    i.steps = "";
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
function addQ20iii(state) {
  const spec = {
    name: "LightPix Labs FlashQ Q20III",
    conditions: "\uC81C\uC870\uC0AC \uACF5\uCE6D GN20m \xB7 ISO100\xB7\uCD5C\uB300 \uCD9C\uB825 \xB7 \uACE0\uC815 32mm \uCEE4\uBC84\uB9AC\uC9C0 (35mm\uD310). \uC9C1\uAD11\xB7\uC77C\uBC18 \uB3D9\uC870 \uACC4\uC0B0\uC6A9. \uB514\uD4E8\uC800\xB7\uC824 \uC190\uC2E4 \uBBF8\uCE21\uC815, \uC2E4\uCE21\uAC12 \uC544\uB2D8.",
    source: "LightPix Labs Q20III \uC81C\uD488 \uC0AC\uC591\xB7Quick Manual: https://www.lightpixlabs.com/pages/q20iii",
    table: { "32": 20 },
    minDenominator: 64,
    steps: "1,2,4,8,16,32,64"
  };
  let equipment = state.equipment.find((e) => e.name === spec.name && e.source === spec.source && e.conditions === spec.conditions && e.minDenominator === spec.minDenominator && e.steps === spec.steps && Object.keys(e.table).length === 1 && e.table["32"] === 20);
  if (!equipment) {
    equipment = { ...spec, id: equipmentId(state.equipment) };
    state.equipment.push(equipment);
  }
  state.inputs.zoom = 32;
  selectEquipment(state, equipment.id);
  return equipment;
}
function manualFlash(i) {
  return { gn: i.gn, gnUnit: i.gnUnit, gnZoom: i.gnZoom, conditions: i.conditions, minDenominator: i.minDenominator, steps: i.steps };
}
function selectEquipment(state, id) {
  if (state.field?.activeShotId) state.legacyShotDetached = true;
  if (state.inputs.gnMode === "manual") state.manualFlash = manualFlash(state.inputs);
  Object.assign(state.inputs, { equipmentId: id, gnMode: "equipment" });
  applyEquipment(state);
}
function setGnMode(state, mode) {
  if (state.field?.activeShotId) state.legacyShotDetached = true;
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

// src/reciprocity.ts
var vision3 = {
  uncorrectedMax: 1,
  officialNote: "10\uCD08 \uC804\uD6C4 +1\uC2A4\uD1B1, CC10R \uD544\uD130 (Kodak, \uB300\uB7B5\uAC12)",
  p: 1.3,
  source: "\uCEE4\uBBA4\uB2C8\uD2F0 \uCD94\uC815 (FilmMeter \uB4F1)",
  note: "p=1.30\uC774\uBA74 10\uCD08 \u2192 \uC57D 20\uCD08\uB85C Kodak\uC758 +1\uC2A4\uD1B1\uACFC \uAC70\uC758 \uAC19\uC2B5\uB2C8\uB2E4.",
  filter: "CC10R \uD544\uD130 \uAD8C\uC7A5(Kodak 10\uCD08 \uAE30\uC900)"
};
var RECIPROCITY_FILMS = {
  "vision3-250d": { ...vision3, id: "vision3-250d", name: "Kodak Vision3 250D (5207)" },
  "vision3-500t": { ...vision3, id: "vision3-500t", name: "Kodak Vision3 500T (5219)" },
  "double-x": {
    id: "double-x",
    name: "Eastman Double-X (5222)",
    uncorrectedMax: 1,
    officialNote: "1\uCD08 \uCD08\uACFC \uB370\uC774\uD130 \uC5C6\uC74C (Kodak)",
    p: 1.31,
    source: "\uCEE4\uBBA4\uB2C8\uD2F0 \uCD94\uC815 (Photrio, Ilford \uBC29\uC2DD \uCC28\uC6A9)",
    note: "\uD751\uBC31 \uD544\uB984 \xB7 \uBCF4\uC815 \uD544\uD130 \uBD88\uD544\uC694"
  },
  "ektachrome-100d": {
    id: "ektachrome-100d",
    name: "Kodak Ektachrome 100D (7294)",
    uncorrectedMax: 1,
    officialNote: "1\uCD08 \uCD08\uACFC \uB370\uC774\uD130 \uC5C6\uC74C (Kodak)",
    p: 1.3,
    source: "\uCEE4\uBBA4\uB2C8\uD2F0 \uCD94\uC815 (FilmMeter, Estimated)",
    note: "\uB9AC\uBC84\uC124 \uD544\uB984\uC740 \uB178\uCD9C \uAD00\uC6A9\uB3C4\uAC00 \uC881\uC2B5\uB2C8\uB2E4.",
    bracket: "\uB9AC\uBC84\uC124 \xB7 \xB11/2~1\uC2A4\uD1B1 \uBE0C\uB77C\uCF00\uD305 \uAD8C\uC7A5"
  },
  "ultramax-400": {
    id: "ultramax-400",
    name: "Kodak Ultramax 400",
    uncorrectedMax: 1,
    officialNote: "1\uCD08 \uCD08\uACFC \uC2DC \uBCF4\uC815\uC774 \uD544\uC694\uD560 \uC218 \uC788\uC74C \xB7 \uC218\uCE58 \uC5C6\uC74C (Kodak E-7023)",
    p: 1.3,
    source: "\uCEE4\uBBA4\uB2C8\uD2F0 \uCD94\uC815 (FilmMeter, Estimated)",
    note: ""
  },
  custom: {
    id: "custom",
    name: "\uC9C1\uC811 \uC785\uB825",
    uncorrectedMax: 1,
    officialNote: "\u2014",
    p: void 0,
    source: "\uC2E4\uCE21 \uC9C0\uC218",
    note: ""
  }
};
function isReciprocityFilmId(value) {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(RECIPROCITY_FILMS, value);
}
function validMeteredSeconds(value) {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
function validReciprocityExponent(value) {
  return typeof value === "number" && value >= 1 && value <= 2;
}
function correctedTime(metered, film, pOverride) {
  if (!validMeteredSeconds(metered)) throw Error("\uCE21\uAD11 \uC2DC\uAC04\uC740 \uC591\uC758 \uC720\uD55C\uD55C \uCD08\uB85C \uC785\uB825\uD558\uC138\uC694.");
  if (pOverride !== void 0 && !validReciprocityExponent(pOverride)) throw Error("\uC9C0\uC218 p\uB294 1.0~2.0\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.");
  const uncorrected = metered <= film.uncorrectedMax;
  const p = pOverride ?? film.p;
  if (!uncorrected && p === void 0) throw Error("\uC2E4\uCE21 \uC9C0\uC218 p\uB97C 1.0~2.0\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.");
  const corrected = uncorrected ? metered : metered ** (p ?? 1);
  if (!Number.isFinite(corrected)) throw Error("\uBCF4\uC815 \uC2DC\uAC04\uC774 \uACC4\uC0B0 \uBC94\uC704\uB97C \uBC97\uC5B4\uB0AC\uC2B5\uB2C8\uB2E4. \uCE21\uAD11 \uC2DC\uAC04\uC774\uB098 \uC9C0\uC218\uB97C \uD655\uC778\uD558\uC138\uC694.");
  return {
    corrected,
    extraStops: Math.log2(corrected / metered),
    basis: uncorrected ? "uncorrected" : pOverride === void 0 ? "community" : "measured",
    filter: metered >= 5 && "filter" in film ? film.filter : void 0,
    bracket: "bracket" in film ? film.bracket : "\uBE0C\uB77C\uCF00\uD305 \uAD8C\uC7A5(+1\uC2A4\uD1B1 \uD55C \uC7A5 \uCD94\uAC00)"
  };
}
function formatExposureSeconds(seconds) {
  if (seconds > 0 && seconds < 5e-3) return "0.01\uCD08 \uBBF8\uB9CC";
  return `${fmt(seconds)}\uCD08`;
}
function formatExposureMinutes(seconds) {
  if (seconds < 60) return "";
  const remainder = Math.round(seconds % 60 * 100) / 100;
  const minutes = Math.floor(seconds / 60) + (remainder === 60 ? 1 : 0);
  return `${fmt(minutes, 0)}\uBD84 ${formatExposureSeconds(remainder % 60)}`;
}

// src/shooting-presets.ts
var filmTypes = { negative: "\uB124\uAC70\uD2F0\uBE0C", slide: "\uC2AC\uB77C\uC774\uB4DC", bw: "\uD751\uBC31" };
var activeKeys = { cameras: "activeCameraId", lenses: "activeLensId", films: "activeFilmId" };
var presetLabels = { cameras: "\uCE74\uBA54\uB77C", lenses: "\uB80C\uC988", films: "\uD544\uB984" };
var presetKinds = ["cameras", "lenses", "films"];
function presetDefaults() {
  return {
    cameras: [{
      id: "nikon-fm2n",
      name: "Nikon FM2N (\uC2E0\uD615, 1984~)",
      sensor: "ff",
      shutters: FM2_SHUTTERS.map((n) => 1 / n),
      bulb: true,
      syncSeconds: 1 / 250,
      isoMin: 12,
      isoMax: 6400,
      memo: "\uAE30\uACC4\uC2DD \uC154\uD130 \xB7 \uC911\uC559\uC911\uC810 \uCE21\uAD11 \xB7 TTL\xB7HSS \uC5C6\uC74C \xB7 \uD30C\uC778\uB354 93%"
    }],
    lenses: [{
      id: "nikkor-50-14-ais",
      name: "Nikkor 50mm f/1.4 AI-S",
      focal: 50,
      apertureMin: 1.4,
      apertureMax: 16,
      apertureSteps: [1.4, 2, 2.8, 4, 5.6, 8, 11, 16],
      mfd: 0.45,
      memo: "\uD544\uD130 52mm"
    }],
    films: [
      { id: "vision3-250d", name: "Kodak Vision3 250D", iso: 250, type: "negative", reciprocityFilm: "vision3-250d", memo: "" },
      { id: "vision3-500t", name: "Kodak Vision3 500T", iso: 500, type: "negative", reciprocityFilm: "vision3-500t", memo: "\uD145\uC2A4\uD150 3200K" },
      { id: "double-x", name: "Eastman Double-X 5222", iso: 250, type: "bw", reciprocityFilm: "double-x", memo: "\uD145\uC2A4\uD150 EI 200" },
      { id: "ektachrome-100d", name: "Kodak Ektachrome 100D 7294", iso: 100, type: "slide", reciprocityFilm: "ektachrome-100d", memo: "" },
      { id: "ultramax-400", name: "Kodak Ultramax 400", iso: 400, type: "negative", reciprocityFilm: "ultramax-400", memo: "" }
    ],
    activeCameraId: "",
    activeLensId: "",
    activeFilmId: ""
  };
}
var positive2 = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
var validIso = (value) => positive2(value) && Number.isInteger(value);
var validSeconds = (value) => positive2(value) && positive2(1 / value);
function presetProblem(kind, value) {
  if (!value || typeof value !== "object") return "\uD504\uB9AC\uC14B\uC744 \uC785\uB825\uD558\uC138\uC694.";
  const p = value;
  if (typeof p.id !== "string" || !p.id || typeof p.name !== "string" || !p.name.trim() || p.name.length > 100)
    return "\uC774\uB984\uC740 1~100\uC790\uB85C \uC785\uB825\uD558\uC138\uC694.";
  if (typeof p.memo !== "string") return "\uBA54\uBAA8\uB97C \uD655\uC778\uD558\uC138\uC694.";
  if (kind === "cameras") {
    const camera = p;
    if (typeof camera.sensor !== "string" || !Object.prototype.hasOwnProperty.call(sensors, camera.sensor)) return "\uCE74\uBA54\uB77C \uD3EC\uB9F7\uC744 \uC120\uD0DD\uD558\uC138\uC694.";
    if (!Array.isArray(camera.shutters) || !camera.shutters.length || !camera.shutters.every(validSeconds) || new Set(camera.shutters).size !== camera.shutters.length)
      return "\uC154\uD130 \uC18D\uB3C4\uB294 \uC911\uBCF5 \uC5C6\uC774 0\uBCF4\uB2E4 \uD070 \uCD08 \uB2E8\uC704 \uC22B\uC790\uB85C \uC785\uB825\uD558\uC138\uC694.";
    if (typeof camera.bulb !== "boolean") return "B \uC154\uD130 \uC9C0\uC6D0 \uC5EC\uBD80\uB97C \uD655\uC778\uD558\uC138\uC694.";
    if (!validSeconds(camera.syncSeconds)) return "\uCD5C\uB300 \uB3D9\uC870\uB294 0\uBCF4\uB2E4 \uD070 \uCD08 \uB2E8\uC704 \uC22B\uC790\uB85C \uC785\uB825\uD558\uC138\uC694.";
    if (!validIso(camera.isoMin) || !validIso(camera.isoMax) || camera.isoMin > camera.isoMax) return "ISO \uBC94\uC704\uB294 \uC591\uC758 \uC815\uC218\uC774\uBA70 \uCD5C\uC18C\uAC00 \uCD5C\uB300 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.";
  } else if (kind === "lenses") {
    const lens = p;
    if (!positive2(lens.focal) || !Number.isFinite(minFocusDistance(lens.focal))) return "\uCD08\uC810\uAC70\uB9AC\uB294 0\uBCF4\uB2E4 \uD070 \uC720\uD55C\uD55C \uC22B\uC790\uB85C \uC785\uB825\uD558\uC138\uC694.";
    if (!positive2(lens.apertureMin) || !positive2(lens.apertureMax) || lens.apertureMin > lens.apertureMax) return "\uCD5C\uB300 \uAC1C\uBC29 f\uAC12\uC740 0\uBCF4\uB2E4 \uD06C\uACE0 \uCD5C\uC18C \uC870\uB9AC\uAC1C f\uAC12 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.";
    if (!Array.isArray(lens.apertureSteps) || !lens.apertureSteps.length || !lens.apertureSteps.every((n, index, steps) => positive2(n) && n >= lens.apertureMin && n <= lens.apertureMax && (index === 0 || n > steps[index - 1])))
      return "\uC870\uB9AC\uAC1C \uB2E8\uACC4\uB294 \uBC94\uC704 \uC548\uC758 \uC22B\uC790\uB97C \uC911\uBCF5 \uC5C6\uC774 \uC624\uB984\uCC28\uC21C\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.";
    if (!positive2(lens.mfd)) return "\uCD5C\uB2E8 \uCD08\uC810\uAC70\uB9AC\uB294 0\uBCF4\uB2E4 \uD070 \uBBF8\uD130 \uAC12\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.";
  } else {
    const film = p;
    if (!validIso(film.iso)) return "\uBC15\uC2A4 ISO\uB294 \uC591\uC758 \uC815\uC218\uB85C \uC785\uB825\uD558\uC138\uC694.";
    if (typeof film.type !== "string" || !Object.prototype.hasOwnProperty.call(filmTypes, film.type)) return "\uD544\uB984 \uC885\uB958\uB97C \uC120\uD0DD\uD558\uC138\uC694.";
    if (film.reciprocityFilm !== void 0 && !isReciprocityFilmId(film.reciprocityFilm)) return "\uC5F0\uACB0\uD560 \uC0C1\uBC18\uCE59 \uD544\uB984\uC744 \uD655\uC778\uD558\uC138\uC694.";
  }
  return "";
}
function validPreset(kind, value) {
  return !presetProblem(kind, value);
}
function presets(data, kind) {
  return data[kind] ?? [];
}
function selectedPreset(data, kind) {
  return presets(data, kind).find((p) => p.id === data[activeKeys[kind]]);
}
function restorePresets(data, raw) {
  function restoreList(kind) {
    const list = raw[kind];
    if (!Array.isArray(list)) return;
    const restored = presets(data, kind);
    restored.length = 0;
    for (const value of list) if (validPreset(kind, value) && !restored.some((p) => p.id === value.id))
      restored.push(JSON.parse(JSON.stringify(value)));
    const key = activeKeys[kind];
    data[key] = restored.some((p) => p.id === raw[key]) ? raw[key] ?? "" : "";
  }
  for (const kind of presetKinds) restoreList(kind);
  const deleted = raw.deletedPreset;
  if (deleted && presetKinds.includes(deleted.kind) && Number.isSafeInteger(deleted.index) && deleted.index >= 0 && validPreset(deleted.kind, deleted.preset))
    data.deletedPreset = JSON.parse(JSON.stringify(deleted));
}
function cameraShutters(camera) {
  if (!camera) return [...FM2_SHUTTERS];
  const values = [...camera.shutters].sort((a, b) => b - a).map((seconds) => 1 / seconds);
  if (camera.bulb) values.push(0);
  return values;
}
function syncLimit(camera) {
  return camera ? 1 / camera.syncSeconds : FM2_SYNC_SHUTTER;
}
function effectiveMinFocus(inputs, lens) {
  const minimum = minFocusDistance(inputs.focal);
  return lens ? Math.max(lens.mfd, minimum) : minimum;
}
function eiStops(ei, boxIso) {
  return Math.log2(ei / boxIso);
}
function isoOutsideCamera(iso, camera) {
  return !!camera && Number.isFinite(iso) && (iso < camera.isoMin || iso > camera.isoMax);
}
function selectPreset(state, kind, id) {
  const key = activeKeys[kind];
  if (id && !presets(state, kind).some((p) => p.id === id)) throw Error("\uD504\uB9AC\uC14B\uC744 \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
  state[key] = id;
  const i = state.inputs;
  if (kind === "cameras") {
    const camera = selectedPreset(state, "cameras");
    if (camera) Object.assign(i, { sensor: camera.sensor, width: sensors[camera.sensor].width, height: sensors[camera.sensor].height });
    const shutters = cameraShutters(camera);
    if (!shutters.includes(i.shutter)) {
      const target = positive2(i.shutter) ? i.shutter : i.shutter === 0 ? shutters[0] : defaults.shutter;
      i.shutter = shutters.reduce((best, n) => n > 0 && Math.abs(Math.log(n / target)) < Math.abs(Math.log(best / target)) ? n : best);
    }
  } else if (kind === "lenses") {
    const lens = selectedPreset(state, "lenses");
    if (!lens) return;
    const { focal, apertureMin, apertureMax, apertureSteps } = lens;
    Object.assign(i, { focal, apertureMin, apertureMax, apertureSteps: apertureSteps.join(",") });
    if (!positive2(i.aperture) || i.aperture < apertureMin) i.aperture = apertureSteps[0];
    else if (i.aperture > apertureMax) i.aperture = apertureSteps[apertureSteps.length - 1];
    const minimum = effectiveMinFocus(i, lens);
    if (i.cameraDistance < minimum) {
      i.cameraDistance = minimum;
      if (i.linked && !i.focusInfinity) i.flashDistance = minimum;
    }
    if (i.zoneNear < minimum) i.zoneNear = minimum;
  } else {
    const film = selectedPreset(state, "films");
    if (!film) return;
    i.iso = film.iso;
    if (film.reciprocityFilm) i.reciprocityFilm = film.reciprocityFilm;
  }
}
function updateShootingInput(state, key, value) {
  if (key === "focal" && !Object.is(state.inputs.focal, value)) state.activeLensId = "";
  assignInput(state.inputs, key, value);
}
function savePreset(state, kind, preset) {
  if (!validPreset(kind, preset)) throw Error(presetProblem(kind, preset));
  const list = presets(state, kind);
  const index = list.findIndex((p) => p.id === preset.id);
  if (index < 0) list.push(preset);
  else list[index] = preset;
  if (state[activeKeys[kind]] !== preset.id) return;
  const ei = state.inputs.iso;
  selectPreset(state, kind, preset.id);
  if (kind === "films") state.inputs.iso = ei;
}
function deletePreset(state, kind, id) {
  const list = presets(state, kind);
  const index = list.findIndex((p) => p.id === id);
  if (index < 0) return;
  state.deletedPreset = { kind, index, preset: list[index] };
  list.splice(index, 1);
  if (state[activeKeys[kind]] === id) selectPreset(state, kind, "");
}
function undoPresetDeletion(state) {
  const deleted = state.deletedPreset;
  if (!deleted) return;
  function insert(kind, value, index) {
    const list = presets(state, kind);
    if (validPreset(kind, value) && !list.some((p) => p.id === value.id)) list.splice(index, 0, value);
  }
  insert(deleted.kind, deleted.preset, deleted.index);
  delete state.deletedPreset;
}

// src/storage.ts
function restore(data) {
  const result = { version: 2, inputs: { ...defaults, reciprocityOverrides: {} }, equipment: [], field: restoreField(void 0), legacyShotDetached: false, ...presetDefaults() };
  if (!data || typeof data !== "object") return result;
  const d = data;
  if (typeof d.version === "number" && d.version > 2) throw Error("\uC774 \uB370\uC774\uD130\uB294 \uB354 \uC0C8 \uD50C\uB7EC\uADF8\uC778 \uBC84\uC804\uC5D0\uC11C \uC800\uC7A5\uB418\uC5C8\uC2B5\uB2C8\uB2E4. \uB36E\uC5B4\uC4F0\uC9C0 \uC54A\uB3C4\uB85D \uB85C\uB4DC\uB97C \uC911\uB2E8\uD569\uB2C8\uB2E4.");
  if (d.version !== 2 || !d.field) result.migrationBackup = JSON.parse(JSON.stringify(data));
  else if (d.migrationBackup) result.migrationBackup = d.migrationBackup;
  if (d.inputs && typeof d.inputs === "object") {
    for (const key of Object.keys(defaults)) {
      if (key === "reciprocityOverrides") continue;
      const value = d.inputs[key];
      if (typeof value === typeof defaults[key] && (typeof value !== "number" || Number.isFinite(value))) Object.assign(result.inputs, { [key]: value });
    }
    const tab = d.inputs.tab;
    if (typeof d.inputs.flashOn !== "boolean") result.inputs.flashOn = tab === "flash" || tab === "combined";
    if (typeof d.inputs.zoneOn !== "boolean") result.inputs.zoneOn = tab === "zone";
    if (typeof d.inputs.flashWasEnabled !== "boolean") result.inputs.flashWasEnabled = result.inputs.flashOn;
    const overrides = d.inputs.reciprocityOverrides;
    if (overrides && typeof overrides === "object" && !Array.isArray(overrides)) {
      for (const [id, p] of Object.entries(overrides)) {
        if (isReciprocityFilmId(id) && validReciprocityExponent(p)) result.inputs.reciprocityOverrides[id] = p;
      }
    }
  }
  const i = result.inputs;
  restorePresets(result, d);
  const shutters = cameraShutters(selectedPreset(result, "cameras"));
  if (!shutters.includes(i.shutter)) i.shutter = shutters.includes(defaults.shutter) ? defaults.shutter : shutters[0];
  if (!FILL_RATIOS.some((value) => value === i.fillRatio)) i.fillRatio = defaults.fillRatio;
  if (!isReciprocityFilmId(i.reciprocityFilm)) i.reciprocityFilm = defaults.reciprocityFilm;
  if (!validMeteredSeconds(i.meteredSeconds)) i.meteredSeconds = defaults.meteredSeconds;
  if (!["nominal", "dimensions"].includes(i.cropBasis)) i.cropBasis = "nominal";
  if (!["current", "target"].includes(i.zoneFlow)) i.zoneFlow = "current";
  if (!["infinity", "range"].includes(i.zoneGoal)) i.zoneGoal = "infinity";
  if (typeof d.inputs === "object" && d.inputs && !("zoneFlow" in d.inputs) && !result.migrationBackup) result.migrationBackup = JSON.parse(JSON.stringify(data));
  if (!["manual", "ttl", "hss", "bounce", "modifier", "near"].includes(i.mode)) i.mode = "manual";
  if (!["flash", "dof", "combined", "zone"].includes(i.tab)) i.tab = "combined";
  if (!["m", "ft"].includes(i.gnUnit)) i.gnUnit = "m";
  if (!["approx", "angles"].includes(i.coverage)) i.coverage = "approx";
  if (!["film", "estimate", "custom"].includes(i.cocMode)) i.cocMode = "film";
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
  result.field = restoreField(d.field);
  result.legacyShotDetached = d.legacyShotDetached === true;
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
async function verifiedWrite(data, write, read) {
  await write();
  let actual;
  try {
    actual = JSON.parse(await read());
  } catch (cause) {
    throw Object.assign(Error("\uC800\uC7A5 \uD30C\uC77C\uC744 \uB2E4\uC2DC \uC77D\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC800\uC7A5 \uC704\uCE58\xB7\uAD8C\uD55C\uC744 \uD655\uC778\uD558\uC138\uC694."), { cause });
  }
  if (JSON.stringify(actual) !== JSON.stringify(data)) throw Error("\uC800\uC7A5 \uD30C\uC77C\uC774 \uD604\uC7AC \uC124\uC815\uACFC \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
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

// src/zone.ts
function equivalence(i) {
  positive(i.width, i.height, i.focal, i.aperture);
  const dimensional = Math.hypot(36, 24) / Math.hypot(i.width, i.height);
  const nominal = { ff: 1, apsc: 1.5, apsc16: 1.6, mft: 2 };
  const useNominal = i.cropBasis === "nominal" && i.sensor in nominal;
  const crop = useNominal ? nominal[i.sensor] : dimensional;
  const focal = i.focal * crop, aperture = i.aperture * crop;
  positive(dimensional, crop, focal, aperture);
  return {
    crop,
    dimensional,
    basis: useNominal ? "\uBA85\uBAA9 \uACC4\uC218" : "\uC2E4\uCE58\uC218 \uB300\uAC01 \uBE44\uC728",
    focal,
    aperture,
    differentAspect: Math.abs(i.width / i.height - 1.5) > 1e-3,
    comparable: i.cocMode !== "custom"
  };
}
function zoneTarget(i) {
  positive(i.zoneNear, i.focal);
  if (i.zoneNear * 1e3 <= 4 * i.focal) throw Error("\uBAA9\uD45C \uADFC\uAC70\uB9AC\uB294 \uD544\uB984\uBA74 \uAE30\uC900\uC73C\uB85C \uCD08\uC810\uAC70\uB9AC\uC758 4\uBC30\uBCF4\uB2E4 \uCEE4\uC57C \uD569\uB2C8\uB2E4.");
  if (!i.zoneInfinity) {
    positive(i.zoneFar);
    if (i.zoneNear >= i.zoneFar) throw Error("\uBAA9\uD45C \uADFC\uAC70\uB9AC\uB294 \uC6D0\uAC70\uB9AC\uBCF4\uB2E4 \uC791\uC544\uC57C \uD569\uB2C8\uB2E4.");
  }
  return { near: i.zoneNear, far: i.zoneInfinity ? Infinity : i.zoneFar };
}
function includesTarget(o, t) {
  const le = (a, b) => a <= b || Number.isFinite(a) && Number.isFinite(b) && a - b <= 1e-12 * Math.max(Math.abs(a), Math.abs(b));
  return le(o.near, t.near) && (t.far === Infinity ? o.far === Infinity : le(t.far, o.far));
}
var tooClose = () => Error("\uBAA9\uD45C \uAD6C\uAC04\uC774 \uB108\uBB34 \uAC00\uAE5D\uC2B5\uB2C8\uB2E4. \uB4F1\uBC30\uBCF4\uB2E4 \uAC00\uAE4C\uC6B4 \uC811\uC0AC\uB294 \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.");
function solveFinite(a, b, f) {
  let s = 2 * a * b / (a + b), nl = 0, fl = 0, done = false;
  for (let n = 0; n < 500 && !done; n++) {
    if (!(s > 2 * f)) throw tooClose();
    const v2 = f * s / (s - f);
    nl = a - v2;
    fl = b - v2;
    if (!(nl > f)) throw tooClose();
    const next = 2 * nl * fl / (nl + fl);
    done = Math.abs(next - s) <= 4 * Number.EPSILON * s;
    s = next;
  }
  if (!done || !(s > 2 * f)) throw tooClose();
  const v = f * s / (s - f);
  nl = a - v;
  fl = b - v;
  return { s, h: (2 * nl * fl - f * (nl + fl)) / (fl - nl) };
}
function solveZone(i) {
  const target = zoneTarget(i);
  positive(i.apertureMin, i.apertureMax);
  if (i.apertureMin > i.apertureMax) throw Error("\uB80C\uC988 \uCD5C\uB300 \uAC1C\uBC29 f\uAC12\uC740 \uCD5C\uC18C \uAC1C\uBC29 f\uAC12 \uC774\uD558\uC5EC\uC57C \uD569\uB2C8\uB2E4.");
  const c = circleOfConfusion(i);
  positive(i.width, i.height, c);
  const a = target.near * 1e3, b = target.far * 1e3, f = i.focal;
  positive(a);
  if (!i.zoneInfinity) positive(b);
  let h, focus = 0;
  if (target.far === Infinity) {
    const p = 2 * a - 3 * f, disc = p * p - 8 * f * f;
    if (!(p > 0) || !(disc >= 0)) throw tooClose();
    h = (p + Math.sqrt(disc)) / 2;
  } else {
    const r = solveFinite(a, b, f);
    h = r.h;
    focus = filmFromLens(r.s, f);
    positive(focus);
  }
  positive(h);
  const required = f * f / (c * h);
  positive(required);
  const raw = i.apertureSteps.split(",").map((v) => v.trim());
  if (raw.some((v) => !v || !Number.isFinite(Number(v)) || Number(v) <= 0)) throw Error("\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC870\uB9AC\uAC1C \uB2E8\uACC4\uB97C \uC591\uC218 f\uAC12\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.");
  const steps = [...new Set(raw.map(Number))].filter((v) => v >= i.apertureMin && v <= i.apertureMax).sort((a2, b2) => a2 - b2);
  if (!steps.length) throw Error("\uB80C\uC988 \uBC94\uC704 \uC548\uC5D0 \uC120\uD0DD \uAC00\uB2A5\uD55C \uC870\uB9AC\uAC1C \uB2E8\uACC4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  const distanceFor = (aperture2) => target.far === Infinity ? hyperfocalFilm(f * f / (aperture2 * c), f) / 1e3 : focus / 1e3;
  for (const aperture2 of steps) {
    const cameraDistance2 = distanceFor(aperture2);
    const actual = optics({ ...i, aperture: aperture2, cameraDistance: cameraDistance2, focusInfinity: false });
    if (includesTarget(actual, target)) return { possible: true, aperture: aperture2, cameraDistance: cameraDistance2, actual, required, target };
  }
  const aperture = steps[steps.length - 1], cameraDistance = distanceFor(aperture);
  return { possible: false, aperture, cameraDistance, actual: optics({ ...i, aperture, cameraDistance, focusInfinity: false }), required, target };
}
var RING_MARKS = [0.45, 0.5, 0.6, 0.7, 0.8, 1, 1.2, 1.5, 2, 3, 5, 10];
function infinityFocus(i, aperture = i.aperture) {
  const at = { ...i, aperture, focusInfinity: false };
  const ring = optics(at).hyperfocal;
  const near = optics({ ...at, cameraDistance: ring }).near;
  return { aperture, ring, near };
}
function ringPosition(distance, marks = RING_MARKS) {
  positive(distance);
  const on = marks.find((m) => Math.abs(distance - m) / m <= 0.03);
  if (on !== void 0) return { on };
  const upper = marks.find((m) => m > distance);
  if (upper === void 0) return { between: [marks[marks.length - 1], Infinity] };
  const index = marks.indexOf(upper);
  return { between: [index > 0 ? marks[index - 1] : 0, upper] };
}

// src/diagram.ts
var ns = "http://www.w3.org/2000/svg";
var SCENE = { width: 400, start: 54, end: 382 };
var nextId = 0;
function sceneDistance(x, max, focal, minimum = minFocusDistance(focal)) {
  return Math.max(minimum, Math.min(max, (x - SCENE.start) / (SCENE.end - SCENE.start) * max));
}
function sceneUpperLimit(i, far) {
  const distances = [far, i.focusInfinity ? void 0 : i.cameraDistance];
  if (i.zoneOn) distances.push(i.zoneNear, i.zoneInfinity ? void 0 : i.zoneFar);
  if (i.flashOn) distances.push(i.linked ? i.cameraDistance : i.flashDistance);
  const largest = Math.max(0, ...distances.filter((distance) => distance !== void 0 && Number.isFinite(distance)));
  return [5, 10, 15, 30].find((limit) => limit >= 1.3 * largest) ?? 30;
}
function diagram(host, i, max, depth, light, safe) {
  host.replaceChildren();
  const showFlash = i.flashOn, zone = i.zoneOn;
  const axisY = zone ? 250 : 192;
  const height = axisY + (showFlash ? 68 : 20);
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", `0 0 ${SCENE.width} ${height}`);
  svg.setAttribute("role", "group");
  svg.dataset.scene = "true";
  svg.dataset.sceneMax = String(max);
  host.append(svg);
  function el(tag, attrs, text, parent = svg) {
    const n = document.createElementNS(ns, tag);
    for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
    if (text !== void 0) n.textContent = text;
    parent.append(n);
    return n;
  }
  const id = `pfm-scene-${++nextId}`;
  el("title", { id: `${id}-title` }, zone ? "\uCE74\uBA54\uB77C\uC640 \uC874 \uD3EC\uCEE4\uC2F1 \uBAA9\uD45C \uAD6C\uAC04 \uBC0F \uC2E4\uC81C \uC2EC\uB3C4" : "\uCE74\uBA54\uB77C\uC640 \uD53C\uC0AC\uCCB4, \uB80C\uC988 \uD654\uAC01\uACFC \uC2EC\uB3C4");
  svg.setAttribute("aria-labelledby", `${id}-title`);
  const defs = el("defs", {}), clip = el("clipPath", { id: id + "-clip" }, void 0, defs);
  el("rect", { x: SCENE.start, y: 24, width: SCENE.end - SCENE.start, height: 140 }, void 0, clip);
  const pattern = el("pattern", { id: id + "-hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse" }, void 0, defs);
  el("path", { d: "M0 7 L7 0", stroke: "var(--pfm-accent)", "stroke-width": 1.2 }, void 0, pattern);
  const coneFill = el("linearGradient", { id: id + "-cone", x1: 0, x2: 1, y1: 0, y2: 0 }, void 0, defs);
  el("stop", { offset: 0, class: "pfm-cone-stop-near" }, void 0, coneFill);
  el("stop", { offset: 1, class: "pfm-cone-stop-far" }, void 0, coneFill);
  const x = (d) => SCENE.start + (SCENE.end - SCENE.start) * Math.max(0, Math.min(d / max, 1));
  const inf = i.focusInfinity;
  const out = (d) => `${d > max && Number.isFinite(d) ? "\u2192 " : ""}${metres(d)}`;
  const cone = (degrees, cl) => {
    const half = (SCENE.end - SCENE.start) * Math.tan(degrees * Math.PI / 360);
    el("path", { d: `M${SCENE.start} 92 L${SCENE.end} ${92 - half} L${SCENE.end} ${92 + half} Z`, class: cl, "clip-path": `url(#${id}-clip)`, ...cl === "pfm-camera-cone" ? { fill: `url(#${id}-cone)` } : {} });
  };
  if (depth) {
    cone(depth.vertical, "pfm-camera-cone");
    if (!zone) {
      el("rect", { x: x(depth.near), y: 24, width: x(depth.far) - x(depth.near), height: 140, class: "pfm-dof-zone" });
      for (const d of [depth.near, depth.far]) el("line", { x1: x(d), x2: x(d), y1: 24, y2: 164, class: "pfm-dof-limit" });
    }
  } else el("text", { x: 70, y: 65 }, "\uB80C\uC988\xB7\uCD08\uC810 \uC785\uB825\uC744 \uD655\uC778\uD558\uC138\uC694.");
  if (showFlash && i.linked) try {
    cone(coverage(i).v, "pfm-flash-cone");
  } catch {
  }
  el("line", { x1: 4, x2: 390, y1: 164, y2: 164, class: "pfm-ground" });
  const fig = (d, parent, cls = "") => el("path", { d, ...cls ? { class: cls } : {} }, void 0, parent);
  const limb = (d, width, parent, cls = "") => el("path", { d, fill: "none", stroke: "currentColor", "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round", ...cls ? { class: cls } : {} }, void 0, parent);
  el("ellipse", { cx: 25, cy: 165, rx: 20, ry: 3, class: "pfm-shadow" });
  const photographer = el("g", { class: "pfm-person pfm-photographer" });
  limb("M29 96 L34 110 L51 100", 5.5, photographer, "pfm-figure-far");
  limb("M20 122 L17 142 L14 158", 8, photographer, "pfm-figure-pants");
  limb("M29 122 L33 142 L33 158", 8, photographer, "pfm-figure-pants");
  fig("M8 164 Q8 158 14 158 L18 158 Q21 158 21 161 L21 164 Z", photographer);
  fig("M30 164 Q30 158 35 158 L38 158 Q42 159 42 164 Z", photographer);
  fig("M19 93 C20 89 25 88 30 90 L35 93 C37 95 37 98 36 101 L32 125 L17 125 C15 113 16 101 19 93 Z", photographer);
  el("rect", { x: 24, y: 85, width: 6, height: 6, rx: 2 }, void 0, photographer);
  el("circle", { cx: 27, cy: 80, r: 7.5, class: "pfm-figure-skin" }, void 0, photographer);
  fig("M19.5 79 C19.5 72 24 70 28 70.5 C32 71 34.5 74 34 78 L27 76 Z", photographer, "pfm-figure-hair");
  limb("M32 95 L37 108 L44 99", 6, photographer);
  const cam = el("g", { class: "pfm-camera-body" }, void 0, photographer);
  el("rect", { x: 31, y: 83, width: 18, height: 15, rx: 3 }, void 0, cam);
  fig("M35 83 L37.5 78.5 L43.5 78.5 L46 83 Z", cam);
  el("rect", { x: 40, y: 80.5, width: 3, height: 2.5, rx: 1, class: "pfm-camera-shutter" }, void 0, cam);
  el("rect", { x: 48, y: 85, width: 9, height: 14, rx: 2 }, void 0, cam);
  el("rect", { x: 51, y: 85, width: 1.4, height: 14, class: "pfm-camera-detail" }, void 0, cam);
  el("ellipse", { cx: 57, cy: 92, rx: 1.6, ry: 5.5, class: "pfm-lens-glass" }, void 0, cam);
  el("text", { x: 6, y: 16, class: "pfm-scene-lens" }, `${fmt(i.focal)} mm \xB7 f/${fmt(i.aperture)}`);
  if (zone) {
    let target;
    try {
      target = zoneTarget(i);
    } catch {
    }
    if (target) {
      const band = (from, to, y, bandHeight, cls, fill) => {
        const start = x(from), end = x(to);
        if (end > start) el("rect", { x: start, y, width: end - start, height: bandHeight, class: cls, ...fill ? { fill } : {} });
      };
      if (i.zoneGoal !== "infinity") band(target.near, target.far, 155, 18, "pfm-target-zone", `url(#${id}-hatch)`);
      el("text", { x: SCENE.start, y: 38, class: "pfm-zone-axis-label" }, i.zoneGoal === "infinity" ? `\uC120\uBA85 ${out(target.near)} ~ \u221E \xB7 \uAC70\uB9AC\uB9C1 ${out(i.cameraDistance)}` : `\uBAA9\uD45C ${out(target.near)} ~ ${out(target.far)}`);
      if (depth) {
        band(depth.near, depth.far, 152, 9, "pfm-zone-depth");
        if (!includesTarget(depth, target)) {
          band(target.near, Math.min(target.far, depth.near), 155, 18, "pfm-zone-miss");
          band(Math.max(target.near, depth.far), target.far, 155, 18, "pfm-zone-miss");
          if (depth.far < target.far && target.far > max)
            el("line", { x1: SCENE.end, x2: SCENE.end, y1: 155, y2: 173, class: "pfm-zone-miss-edge" });
        }
      }
    }
    const handle = (key, centreY, label) => {
      const value = i[key], anchor = x(Number.isFinite(value) ? value : 0);
      const hitX = Math.min(SCENE.width - 60, anchor - 30);
      const control = el("g", {
        "data-zone-handle": key,
        tabindex: 0,
        role: "slider",
        "aria-label": label,
        "aria-valuemin": key === "zoneFar" && Number.isFinite(i.zoneNear) ? i.zoneNear + 0.01 : minFocusDistance(i.focal),
        "aria-valuemax": key === "zoneNear" && !i.zoneInfinity && Number.isFinite(i.zoneFar) ? Math.min(max, i.zoneFar - 0.01) : Math.max(max, Number.isFinite(value) ? value : 0),
        "aria-valuenow": Number.isFinite(value) ? value : 0,
        "aria-valuetext": Number.isFinite(value) ? metres(value) : "\uC785\uB825 \uD544\uC694"
      });
      el("rect", { x: hitX, y: centreY - 30, width: 60, height: 60, fill: "transparent", class: "pfm-zone-hit" }, void 0, control);
      el("line", { x1: anchor, x2: anchor, y1: centreY, y2: 164, class: "pfm-zone-handle-stem" }, void 0, control);
      el("circle", { cx: anchor, cy: centreY, r: 7, class: "pfm-zone-handle-dot" }, void 0, control);
    };
    if (i.zoneGoal === "infinity") {
      const ring = x(i.cameraDistance);
      el("line", { x1: ring, x2: ring, y1: 44, y2: 180, class: "pfm-focus-line" });
      el("circle", { cx: ring, cy: 177, r: 5, class: "pfm-focus-dot" });
    } else {
      handle("zoneNear", 148, "\uBAA9\uD45C \uADFC\uAC70\uB9AC");
      if (!i.zoneInfinity) handle("zoneFar", 208, "\uBAA9\uD45C \uC6D0\uAC70\uB9AC");
    }
  } else {
    const subject = inf ? SCENE.end : x(Number.isFinite(i.cameraDistance) && i.cameraDistance > 0 ? i.cameraDistance : 0);
    el("line", { x1: subject, x2: subject, y1: 24, y2: 180, class: "pfm-focus-glow" });
    el("line", { x1: subject, x2: subject, y1: 24, y2: 180, class: "pfm-focus-line" });
    el("ellipse", { cx: subject, cy: 165, rx: 16, ry: 3, class: "pfm-shadow" });
    const person = el("g", { transform: `translate(${subject},0)`, class: "pfm-person pfm-subject", "data-pfm-subject": "true", tabindex: 0, role: "slider", "aria-labelledby": `${id}-subject-title`, "aria-valuenow": Number.isFinite(i.cameraDistance) ? i.cameraDistance : 0, "aria-valuemin": Number.isFinite(i.focal) ? minFocusDistance(i.focal) : 1e-3, "aria-valuemax": Math.max(max, Number.isFinite(i.cameraDistance) ? i.cameraDistance : 0), "aria-valuetext": inf ? "\uBB34\uD55C\uB300" : metres(i.cameraDistance) });
    el("title", { id: `${id}-subject-title` }, "\uD53C\uC0AC\uCCB4 \uAC70\uB9AC \xB7 \uC88C\uC6B0 \uB4DC\uB798\uADF8 \uB610\uB294 \uD654\uC0B4\uD45C \uD0A4\uB85C \uC870\uC808", person);
    el("rect", { x: -26, y: 68, width: 52, height: 102, fill: "transparent" }, void 0, person);
    limb("M-4.5 122 L-5 159", 7.5, person, "pfm-figure-pants");
    limb("M4.5 122 L5 159", 7.5, person, "pfm-figure-pants");
    el("ellipse", { cx: -6, cy: 162, rx: 5.5, ry: 2.6 }, void 0, person);
    el("ellipse", { cx: 6, cy: 162, rx: 5.5, ry: 2.6 }, void 0, person);
    limb("M-12.5 96 L-15 110 L-14 123", 5.5, person);
    limb("M12.5 96 L15 110 L14 123", 5.5, person);
    fig("M-12 94 C-12 90 -8 89 -4 89 L4 89 C8 89 12 90 12 94 L9 125 L-9 125 Z", person);
    el("rect", { x: -3, y: 84, width: 6, height: 6, rx: 2 }, void 0, person);
    el("circle", { cx: 0, cy: 80, r: 7.5, class: "pfm-figure-skin" }, void 0, person);
    fig("M-7.8 80 C-8.5 72 -4 70 0 70 C4 70 8.5 72 7.8 80 C6 75.5 3 74 0 74 C-3 74 -6 75.5 -7.8 80 Z", person, "pfm-figure-hair");
    el("circle", { cx: 0, cy: 177, r: 5, class: "pfm-focus-dot" }, void 0, person);
    el("text", { x: Math.max(92, Math.min(subject, 340)), y: 38, "text-anchor": "middle", class: "pfm-subject-label" }, `\uD53C\uC0AC\uCCB4 ${inf ? "\u221E" : i.cameraDistance > max ? "\u2192 \uADF8\uB9BC \uBC16" : out(i.cameraDistance)}`);
  }
  el("line", { x1: SCENE.start, x2: SCENE.end, y1: axisY, y2: axisY, class: "pfm-distance-axis" });
  for (let n = 0; n <= 4; n++) {
    const d = max * n / 4;
    el("line", { x1: x(d), x2: x(d), y1: axisY - 3, y2: axisY + 3, class: "pfm-distance-axis" });
    el("text", { x: x(d), y: axisY + 16, "text-anchor": n === 4 ? "end" : "middle", class: "pfm-axis-label" }, metres(d));
  }
  if (safe?.kind === "range" && safe.near <= max) {
    const start = x(safe.near), end = x(safe.far), attrs = { class: "pfm-safe-band", "aria-hidden": "true" };
    if (end > start) el("rect", { ...attrs, x: start, y: zone ? 232 : 170, width: end - start, height: 12 });
    else el("line", { ...attrs, x1: start, x2: start, y1: zone ? 232 : 170, y2: zone ? 244 : 182 });
  }
  if (light) {
    const f = light, y = axisY + 36;
    el("rect", { x: SCENE.start, y, width: x(f.low) - SCENE.start, height: 12, class: "pfm-over-zone" });
    el("rect", { x: x(f.low), y, width: x(f.high) - x(f.low), height: 12, fill: `url(#${id}-hatch)` });
    el("rect", { x: x(f.high), y, width: SCENE.end - x(f.high), height: 12, class: "pfm-under-zone" });
    el("line", { x1: x(f.r), x2: x(f.r), y1: y - 5, y2: y + 17, class: "pfm-flash-marker" });
    el("text", { x: SCENE.start, y: axisY + 65, class: "pfm-axis-label" }, `${i.linked ? "\uD50C\uB798\uC2DC" : "\uD50C\uB798\uC2DC \uB3C5\uB9BD \uAC70\uB9AC \uCD95"} \xB7 \uD5C8\uC6A9 ${out(f.low)} ~ ${out(f.high)}`);
  } else if (showFlash) el("text", { x: SCENE.start, y: axisY + 51, class: "pfm-axis-label" }, "\uD50C\uB798\uC2DC \uAC70\uB9AC: \uD604\uC7AC \uC870\uAC74\uC5D0\uC11C \uACC4\uC0B0 \uBD88\uAC00");
  const legend = document.createElement("figcaption");
  legend.className = "pfm-scene-legend";
  const items = [["pfm-key-camera", "\uCE74\uBA54\uB77C \uD654\uAC01"], ["pfm-key-dof", "\uC120\uBA85 \uAD6C\uAC04"]];
  if (zone && i.zoneGoal !== "infinity") items.push(["pfm-key-target", "\uBAA9\uD45C \uAD6C\uAC04"], ["pfm-key-miss", "\uC2EC\uB3C4 \uBC16 \uBAA9\uD45C"]);
  if (showFlash && i.linked) items.push(["pfm-key-flash", "\uD50C\uB798\uC2DC \uC870\uC0AC\uAC01"]);
  if (safe?.kind === "range" && safe.near <= max) items.push(["pfm-key-safe", "\uC548\uC804 \uCD2C\uC601 \uAD6C\uAC04"]);
  for (const [cls, text] of items) {
    const label = document.createElement("span");
    label.className = cls;
    label.textContent = text;
    legend.append(label);
  }
  host.append(legend);
  const hint = document.createElement("p");
  hint.className = "pfm-scene-hint";
  hint.textContent = zone ? i.zoneGoal === "infinity" ? "\uC870\uB9AC\uAC1C\uB97C \uBC14\uAFB8\uBA74 \uAC70\uB9AC\uB9C1 \uC704\uCE58\uAC00 \uBC14\uB85C \uBC14\uB01D\uB2C8\uB2E4" : "\uC88C\uC6B0\uB85C \uB04C\uC5B4 \uBAA9\uD45C \uC870\uC808 \xB7 \uAD6C\uAC04 \uAC00\uC6B4\uB370\uB294 \uD1B5\uC9F8\uB85C \uC774\uB3D9" : "\uD53C\uC0AC\uCCB4 \uB4DC\uB798\uADF8 \xB7 \uAC70\uB9AC \uC9C1\uC811 \uC785\uB825";
  host.append(hint);
  if (showFlash) {
    const p = document.createElement("p");
    p.className = "pfm-scene-note";
    p.textContent = i.linked ? "\uD50C\uB798\uC2DC \uB760: \uC810\uC120 \uACFC\uB2E4 \xB7 \uBE57\uAE08 \uD5C8\uC6A9 \xB7 \uD30C\uC120 \uBD80\uC871" : "\uC624\uD504\uCE74\uBA54\uB77C \uD50C\uB798\uC2DC \uAC70\uB9AC\uB294 \uCE74\uBA54\uB77C\uC640 \uBCC4\uB3C4 \uCD95\uC73C\uB85C \uD45C\uC2DC\uD569\uB2C8\uB2E4.";
    host.append(p);
  }
  if (safe?.kind === "range" && safe.far > max) {
    const p = document.createElement("p");
    p.className = "pfm-scene-note";
    p.textContent = `\uADF8\uB9BC \uBC16 \uC548\uC804 \uCD2C\uC601 \uAD6C\uAC04: ${out(safe.near)} ~ ${out(safe.far)}`;
    host.append(p);
  }
  if (depth && (depth.near > max || Number.isFinite(depth.far) && depth.far > max)) {
    const p = document.createElement("p");
    p.className = "pfm-scene-note";
    p.textContent = `\uADF8\uB9BC \uBC16 \uC2EC\uB3C4: ${out(depth.near)} ~ ${out(depth.far)}`;
    host.append(p);
  }
}

// src/scale.ts
var FOCUS_SCALE_MAX = 30;
var FOCUS_SCALE_STEPS = 1e3;
var FOCUS_SCALE_TICKS = [0.5, 0.7, 1, 1.5, 2, 3, 5, 10, Infinity];
function focusScale(focal, minimum = minFocusDistance(focal)) {
  if (!Number.isFinite(focal) || focal <= 0 || minimum >= FOCUS_SCALE_MAX) return;
  const lower = Math.max(minimum, 0.5);
  const upper = Math.max(lower, 5);
  const left = Math.log(lower / minimum);
  const middle = Math.log(upper / lower);
  const right = Math.log(FOCUS_SCALE_MAX / upper);
  const weight = minimum <= 0.5 ? Math.max(1, (left + right) * 0.55 / (middle * 0.45)) : 1;
  const total = left + middle * weight + right;
  function position(distance2) {
    if (Number.isNaN(distance2) || distance2 <= minimum) return 0;
    if (distance2 >= FOCUS_SCALE_MAX) return 1;
    if (distance2 <= lower) return Math.log(distance2 / minimum) / total;
    if (distance2 <= upper) return (left + weight * Math.log(distance2 / lower)) / total;
    return (left + middle * weight + Math.log(distance2 / upper)) / total;
  }
  function distance(position2) {
    if (position2 <= 0) return minimum;
    if (position2 >= 1) return FOCUS_SCALE_MAX;
    const offset = position2 * total;
    if (offset <= left) return minimum * Math.exp(offset);
    if (offset <= left + middle * weight) return lower * Math.exp((offset - left) / weight);
    return upper * Math.exp(offset - left - middle * weight);
  }
  return { minimum, position, distance };
}

// src/flash-tools.ts
function safeShootingRange(linked, depth, flashRange) {
  if (!linked) return { kind: "off-camera" };
  if (!depth || !flashRange || ![depth.near, flashRange.low, flashRange.high].every((n) => Number.isFinite(n) && n > 0) || !(depth.far >= depth.near) || flashRange.high < flashRange.low) return { kind: "unavailable" };
  const near = Math.max(depth.near, flashRange.low), far = Math.min(depth.far, flashRange.high);
  return near <= far ? { kind: "range", near, far } : { kind: "empty" };
}
function safeRangeText(result) {
  if (result.kind === "range") return `\uC548\uC804 \uCD2C\uC601 \uAD6C\uAC04 ${metres(result.near)} ~ ${metres(result.far)}`;
  if (result.kind === "off-camera") return "\uC624\uD504\uCE74\uBA54\uB77C \xB7 \uAD50\uC9D1\uD569 \uACC4\uC0B0 \uC548 \uD568";
  if (result.kind === "empty") return "\uACB9\uCE58\uB294 \uAD6C\uAC04 \uC5C6\uC74C \xB7 \uC870\uB9AC\uAC1C \uB610\uB294 \uCD9C\uB825 \uC870\uC815";
  return "\uC548\uC804 \uCD2C\uC601 \uAD6C\uAC04 \uACC4\uC0B0 \uBD88\uAC00 \xB7 \uCD08\uC810\xB7\uD50C\uB798\uC2DC \uAC70\uB9AC\uC640 \uC785\uB825 \uC870\uAC74 \uD655\uC778";
}
function nominalGN(i) {
  if (!Number.isFinite(i.zoom) || i.zoom <= 0) throw Error("\uD50C\uB798\uC2DC \uC90C\uC740 \uC591\uC218\uB85C \uC785\uB825\uD558\uC138\uC694.");
  if (i.gnZoom !== i.zoom || !Number.isFinite(i.gn) || i.gn <= 0) throw Error("\uD604\uC7AC \uC90C\uC758 \uACF5\uCE6D GN \uC790\uB8CC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.");
  return i.gnUnit === "ft" ? feetToMetres(i.gn) : i.gn;
}
function calibrateGN(measurement, steps, nominal) {
  const { iso, denominator, distance, aperture } = measurement;
  if (![iso, distance, aperture].every((n) => Number.isFinite(n) && n > 0)) throw Error("\uC2E4\uCE21 ISO\xB7\uAC70\uB9AC\xB7\uC870\uB9AC\uAC1C\uB294 \uAC01\uAC01 \uC591\uC758 \uC720\uD55C\uD55C \uC218\uB85C \uC785\uB825\uD558\uC138\uC694.");
  if (!steps.includes(denominator)) throw Error("\uC2E4\uCE21\uC5D0 \uC0AC\uC6A9\uD55C \uC9C0\uC6D0 \uCD9C\uB825 \uB2E8\uACC4\uB97C \uC120\uD0DD\uD558\uC138\uC694.");
  const gn = aperture * distance / Math.sqrt(iso / 100) / Math.sqrt(1 / denominator);
  if (!Number.isFinite(gn) || gn <= 0) throw Error("\uC2E4\uCE21 GN\uC774 \uACC4\uC0B0 \uBC94\uC704\uB97C \uBC97\uC5B4\uB0AC\uC2B5\uB2C8\uB2E4. \uC785\uB825\uAC12\uC744 \uD655\uC778\uD558\uC138\uC694.");
  if (nominal === void 0) return { gn };
  positive(nominal);
  return { gn, loss: exposureEV(nominal, gn) };
}
function flashBasis(i) {
  if (i.mode !== "manual") throw Error("\uC218\uB3D9 \xB7 \uC9C1\uC811\uAD11 \xB7 \uC77C\uBC18 \uB3D9\uC870\uC5D0\uC11C \uACC4\uC0B0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
  const gn = nominalGN(i);
  if (!i.conditions.trim()) throw Error("GN \uCE21\uC815 \uC870\uAC74\uC744 \uC785\uB825\uD558\uC138\uC694.");
  positive(i.aperture);
  return { gn, fullGN: effectiveGN(gn, 1, i.iso, i.loss), steps: powerSteps(i.steps, i.minDenominator) };
}
function powerRecommendation(steps, targetEV) {
  const minimumEV = -Math.log2(steps[steps.length - 1]);
  const epsilon = Number.EPSILON * 8 * Math.max(1, Math.abs(targetEV), Math.abs(minimumEV));
  const range = targetEV > epsilon ? "above" : targetEV < minimumEV - epsilon ? "below" : "within";
  return { ...nearestPower(steps, targetEV), range };
}
function fillFlash(i, camera) {
  if (!cameraShutters(camera).includes(i.shutter)) throw Error(`${camera?.name ?? "FM2"} \uC154\uD130 \uC18D\uB3C4\uB97C \uC120\uD0DD\uD558\uC138\uC694.`);
  if (!FILL_RATIOS.some((value) => value === i.fillRatio)) throw Error("\uD544\uC778 \uBE44\uC728\uC744 \uC120\uD0DD\uD558\uC138\uC694.");
  if (i.linked && i.focusInfinity) throw Error("\uBB34\uD55C\uB300 \uCD08\uC810\uC5D0\uC11C\uB294 \uAC70\uB9AC \uC5F0\uB3D9\uC744 \uB044\uACE0 \uD50C\uB798\uC2DC \uAC70\uB9AC\uB97C \uC785\uB825\uD558\uC138\uC694.");
  const { fullGN, steps } = flashBasis(i), distance = i.linked ? i.cameraDistance : i.flashDistance;
  const targetEV = exposureEV(distance, fullGN / i.aperture) + i.fillRatio;
  return { ...powerRecommendation(steps, targetEV), syncExceeded: i.shutter > syncLimit(camera) };
}
var CHEATSHEET_DISTANCES = [0.7, 1, 1.5, 2, 3, 5];
var APERTURES = FULL_STOP_APERTURES.split(",").map(Number);
function flashCheatsheet(i) {
  const { gn, fullGN, steps } = flashBasis(i);
  if (!Number.isFinite(i.denominator) || i.denominator < 1) throw Error("\uD604\uC7AC \uCD9C\uB825 \uBD84\uBAA8\uB97C 1 \uC774\uC0C1\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.");
  const selectedGN = effectiveGN(gn, 1 / i.denominator, i.iso, i.loss);
  optics({ ...i, focusInfinity: true });
  const rows = CHEATSHEET_DISTANCES.map((distance) => {
    const power = powerRecommendation(steps, exposureEV(distance, fullGN / i.aperture));
    const requiredAperture = selectedGN / distance;
    const errorFor = (aperture2) => exposureEV(requiredAperture, aperture2);
    const aperture = APERTURES.reduce((best, n) => Math.abs(errorFor(n)) < Math.abs(errorFor(best)) ? n : best);
    let depth, depthError;
    try {
      depth = optics({ ...i, focusInfinity: false, cameraDistance: distance });
    } catch (e) {
      depthError = e instanceof Error ? e.message : String(e);
    }
    return { distance, power, requiredAperture, aperture, apertureEV: errorFor(aperture), depth, depthError };
  });
  return { gn, rows };
}

// src/view.ts
var VIEW = "photo-field-mobile";
var FILM_SPEEDS = [12, 25, 50, 100, 200, 400, 800, 1600, 3200, 6400];
var nextControlId = 0;
function node(parent, tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== void 0) e.textContent = text;
  if (cls) e.className = cls;
  parent.append(e);
  return e;
}
function shutterLabel(denominator) {
  if (denominator === 0) return "B";
  if (denominator > 1 && Number.isInteger(denominator)) return `1/${denominator}\uCD08`;
  return `${Number((1 / denominator).toPrecision(12))}\uCD08`;
}
function parseSeconds(text) {
  const parts = text.split("/").map(parseNumber);
  if (parts.length === 1) return parts[0];
  return parts.length === 2 && parts.every((value) => Number.isFinite(value) && value > 0) ? parts[0] / parts[1] : NaN;
}
function filmInfo(film, ei) {
  const stops = eiStops(ei, film.iso);
  const delta = Number.isFinite(stops) && stops !== 0 ? ` \xB7 ${stops > 0 ? "+" : ""}${fmt(stops)} \uC99D\uAC10` : "";
  return `${film.name} \xB7 ${filmTypes[film.type]} \xB7 \uBC15\uC2A4 ISO ${fmt(film.iso)} \xB7 EI ${Number.isFinite(ei) ? ei : "\u2014"}${delta}`;
}
var PhotoView = class extends import_obsidian.ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.sceneMax = 5;
    this.powerButtons = {};
    this.aborters = [];
    this.ringTableOpen = false;
    this.gnDisplayUnit = "m";
    this.detailState = /* @__PURE__ */ new Map();
    this.calibrationMessage = "";
    this.calibrationDraft = {};
    this.numeric = /* @__PURE__ */ new Map();
  }
  gearBar() {
    const bar = node(this.root, "section", void 0, "pfm-gear-bar");
    bar.setAttribute("aria-label", "\uCD2C\uC601 \uC7A5\uBE44");
    const chips = node(bar, "div", void 0, "pfm-gear-chips");
    const controls = presetKinds.map((kind) => {
      const chip = this.button(chips, "", () => {
        this.gearOpen = this.gearOpen === kind ? void 0 : kind;
        this.paintGear();
        this.paintGearList();
      });
      chip.className = "pfm-gear-chip";
      chip.dataset.presetChip = kind;
      node(chip, "span", presetLabels[kind], "pfm-gear-label");
      return { kind, chip, value: node(chip, "strong"), tag: node(chip, "small", void 0, "pfm-gear-tag") };
    });
    this.gearList = node(bar, "div", void 0, "pfm-gear-picker");
    this.gearList.id = `pfm-presets-${++nextControlId}`;
    for (const { chip } of controls) chip.setAttribute("aria-controls", this.gearList.id);
    this.paintGear = () => {
      const s = this.plugin.state;
      const lens = selectedPreset(s, "lenses"), camera = selectedPreset(s, "cameras"), film = selectedPreset(s, "films");
      const filmName = film?.name.replace(/^Kodak /, "");
      const values = {
        cameras: camera?.id === "nikon-fm2n" && camera.name === "Nikon FM2N (\uC2E0\uD615, 1984~)" ? "FM2N" : camera?.name ?? "\uC120\uD0DD \uC548 \uD568",
        lenses: lens?.id === "nikkor-50-14-ais" && lens.name === "Nikkor 50mm f/1.4 AI-S" ? `${fmt(lens.focal)}mm f/${fmt(lens.apertureMin)}` : lens?.name ?? `${fmt(s.inputs.focal)}mm \xB7 \uC800\uC7A5\uAC12`,
        films: film ? `${filmName} \xB7 EI ${Number.isFinite(s.inputs.iso) ? s.inputs.iso : "\u2014"}` : "\uC120\uD0DD \uC548 \uD568"
      };
      const accessible = { cameras: camera?.name, lenses: lens?.name, films: film ? filmInfo(film, s.inputs.iso) : void 0 };
      for (const { kind, chip, value, tag } of controls) {
        value.textContent = values[kind];
        tag.textContent = kind === "films" && film ? filmTypes[film.type] : "";
        tag.hidden = !tag.textContent;
        chip.setAttribute("aria-expanded", String(this.gearOpen === kind));
        const description = accessible[kind] ?? values[kind];
        chip.setAttribute("aria-label", `${presetLabels[kind]} \xB7 ${description}`);
        chip.title = description;
      }
      const info = this.root.querySelector(".pfm-film-info");
      if (info) {
        const text = film ? filmInfo(film, s.inputs.iso) : "";
        if (info.textContent !== text) info.textContent = text;
        info.hidden = !film;
      }
      const warning = this.root.querySelector(".pfm-iso-warning");
      if (warning) {
        const text = camera && isoOutsideCamera(s.inputs.iso, camera) ? `ISO ${fmt(s.inputs.iso)} \xB7 \uCE74\uBA54\uB77C \uBC94\uC704 ${camera.isoMin}\u2013${camera.isoMax} \uBC16` : "";
        if (warning.textContent !== text) warning.textContent = text;
        warning.hidden = !text;
      }
    };
    bar.onkeydown = (event) => {
      if (event.key !== "Escape" || !this.gearOpen) return;
      const kind = this.gearOpen;
      this.gearOpen = void 0;
      this.paintGear();
      this.paintGearList();
      controls.find((control) => control.kind === kind)?.chip.focus({ preventScroll: true });
    };
    this.paintGearList();
  }
  paintGearList() {
    const kind = this.gearOpen, list = this.gearList;
    list.replaceChildren();
    list.hidden = !kind;
    if (!kind) return;
    const state = this.plugin.state;
    const selected = selectedPreset(state, kind)?.id ?? "";
    const group = node(list, "div");
    group.setAttribute("role", "radiogroup");
    group.setAttribute("aria-label", `${presetLabels[kind]} \uD504\uB9AC\uC14B \uC120\uD0DD`);
    const items = [{ id: "", name: "\uC120\uD0DD \uC548 \uD568" }, ...state[kind]];
    for (const preset of items) {
      const label = node(group, "label", void 0, "pfm-gear-option");
      const radio = node(label, "input");
      radio.type = "radio";
      radio.name = list.id;
      radio.checked = preset.id === selected;
      node(label, "span", preset.name);
      radio.onclick = () => {
        selectPreset(state, kind, preset.id);
        this.gearOpen = void 0;
        this.changed();
        this.render();
        this.root.querySelector(`[data-preset-chip=${kind}]`)?.focus({ preventScroll: true });
      };
    }
    const manage = node(list, "button", "\uAD00\uB9AC\u2026");
    manage.type = "button";
    manage.onclick = () => {
      this.gearOpen = void 0;
      this.paintGear();
      this.paintGearList();
      this.jumpSettings("presets");
      const category = this.root.querySelector(`[data-preset-manager=${kind}]`);
      if (category) {
        category.open = true;
        category.scrollIntoView({ block: "start" });
        category.querySelector("summary")?.focus({ preventScroll: true });
      }
    };
  }
  presetManager() {
    const parent = this.details("\uCE74\uBA54\uB77C\xB7\uB80C\uC988\xB7\uD544\uB984 \uD504\uB9AC\uC14B", "presets"), state = this.plugin.state;
    const i = state.inputs;
    for (const kind of presetKinds) {
      const section = node(parent, "details");
      section.dataset.presetManager = kind;
      node(section, "summary", presetLabels[kind]);
      const body = node(section, "div", void 0, "pfm-preset-manager");
      if (kind === "cameras") {
        this.select(body, "CoC \uBC29\uC2DD", "cocMode", { film: "\uD544\uB984 \uAD00\uB840 (35mm \uAE30\uC900 0.03mm)", estimate: "\uD504\uB808\uC784 \uB300\uAC01 \xF71500", custom: "\uC0AC\uC6A9\uC790 \uC9C0\uC815 mm" });
        this.number(body, "\uC0AC\uC6A9\uC790 CoC (mm)", "coc");
      }
      if (kind === "films") {
        node(body, "p", void 0, "pfm-film-info");
        node(body, "p", void 0, "pfm-iso-warning").setAttribute("role", "status");
        this.number(body, "\uC0AC\uC6A9 \uAC10\uB3C4 (ISO/EI)", "iso");
      }
      const list = node(body, "select");
      list.setAttribute("aria-label", `\uC800\uC7A5\uB41C ${presetLabels[kind]} \uD504\uB9AC\uC14B`);
      node(list, "option", "\uC0C8 \uD504\uB9AC\uC14B").value = "";
      for (const preset of state[kind]) node(list, "option", preset.name).value = preset.id;
      list.value = selectedPreset(state, kind)?.id ?? "";
      const editor = node(body, "form", void 0, "pfm-preset-form");
      const edit = () => {
        editor.replaceChildren();
        const existing = state[kind].find((p) => p.id === list.value);
        const title = this.text(editor, "\uC774\uB984", existing?.name ?? "");
        title.maxLength = 100;
        const memo = this.text(editor, "\uBA54\uBAA8", existing?.memo ?? "");
        const description = (label, values, value) => {
          const field = node(editor, "label", void 0, "pfm-field");
          node(field, "span", label);
          const select = node(field, "select");
          for (const [key, text] of Object.entries(values)) node(select, "option", text).value = key;
          select.value = value;
          return select;
        };
        const numeric = (label, value) => {
          const input = this.text(editor, label, value === void 0 ? "" : String(value));
          input.inputMode = "decimal";
          return () => parseNumber(input.value);
        };
        let fields;
        if (kind === "cameras") {
          const camera = existing && "shutters" in existing ? existing : void 0;
          const sensor = description("\uD3EC\uB9F7", Object.fromEntries(Object.entries(sensors).map(([key, value]) => [key, value.name])), camera?.sensor ?? "ff");
          const shutters = this.text(editor, "\uC154\uD130 \uC18D\uB3C4 (\uCD08, \uC27C\uD45C \uAD6C\uBD84)", camera?.shutters.join(",") ?? "");
          shutters.placeholder = "1,1/2,1/125";
          const label = node(editor, "label", void 0, "pfm-check");
          const bulb = node(label, "input");
          bulb.type = "checkbox";
          bulb.checked = camera?.bulb ?? false;
          node(label, "span", "B \uC154\uD130 \uC9C0\uC6D0");
          const sync = this.text(editor, "\uCD5C\uB300 \uD50C\uB798\uC2DC \uB3D9\uC870 (\uCD08)", camera ? String(camera.syncSeconds) : "");
          sync.placeholder = "1/250";
          const isoMin = numeric("ISO \uCD5C\uC18C", camera?.isoMin), isoMax = numeric("ISO \uCD5C\uB300", camera?.isoMax);
          fields = () => ({ sensor: sensor.value, shutters: shutters.value.split(",").map(parseSeconds), bulb: bulb.checked, syncSeconds: parseSeconds(sync.value), isoMin: isoMin(), isoMax: isoMax() });
        } else if (kind === "lenses") {
          const lens = existing && "mfd" in existing ? existing : void 0;
          const focal = numeric("\uCD08\uC810\uAC70\uB9AC (mm)", lens?.focal), apertureMin = numeric("\uCD5C\uB300 \uAC1C\uBC29 f\uAC12", lens?.apertureMin), apertureMax = numeric("\uCD5C\uC18C \uC870\uB9AC\uAC1C f\uAC12", lens?.apertureMax);
          const steps = this.text(editor, "\uC870\uB9AC\uAC1C \uB2E8\uACC4 (\uC27C\uD45C \uAD6C\uBD84)", lens?.apertureSteps.join(",") ?? "");
          const mfd = numeric("\uCD5C\uB2E8 \uCD08\uC810\uAC70\uB9AC (m, \uD544\uB984\uBA74 \uAE30\uC900)", lens?.mfd);
          fields = () => ({ focal: focal(), apertureMin: apertureMin(), apertureMax: apertureMax(), apertureSteps: steps.value.split(",").map(parseNumber), mfd: mfd() });
        } else {
          const film = existing && "iso" in existing ? existing : void 0;
          const iso = numeric("\uBC15\uC2A4 ISO", film?.iso);
          const type = description("\uD544\uB984 \uC885\uB958", filmTypes, film?.type ?? "negative");
          const reciprocity = description("\uC0C1\uBC18\uCE59 \uD544\uB984 \uC5F0\uACB0", { "": "\uC5F0\uACB0 \uC548 \uD568", ...Object.fromEntries(Object.entries(RECIPROCITY_FILMS).map(([key, value]) => [key, value.name])) }, film?.reciprocityFilm ?? "");
          fields = () => ({ iso: iso(), type: type.value, reciprocityFilm: reciprocity.value || void 0 });
        }
        const error = node(editor, "p", "", "pfm-error");
        error.setAttribute("role", "alert");
        error.hidden = true;
        const submit = node(editor, "button", existing ? "\uBCC0\uACBD \uC800\uC7A5" : "\uD504\uB9AC\uC14B \uCD94\uAC00");
        submit.type = "submit";
        editor.onsubmit = (event) => {
          event.preventDefault();
          const presetId = existing?.id ?? crypto.randomUUID();
          try {
            savePreset(state, kind, { id: presetId, name: title.value.trim(), memo: memo.value.trim(), ...fields() });
          } catch (e) {
            error.hidden = false;
            error.textContent = e instanceof Error ? e.message : String(e);
            return;
          }
          this.changed();
          this.render();
          const select = this.root.querySelector(`[data-preset-manager=${kind}] select`);
          if (select) {
            select.value = presetId;
            select.dispatchEvent(new Event("change"));
          }
          select?.focus({ preventScroll: true });
        };
        if (existing) {
          const remove = this.button(editor, "\uC0AD\uC81C", () => {
            deletePreset(state, kind, existing.id);
            this.changed();
            this.render();
            this.root.querySelector("[data-preset-undo]")?.focus({ preventScroll: true });
          });
          remove.setAttribute("aria-label", `${existing.name} \uC0AD\uC81C`);
        }
      };
      list.onchange = edit;
      edit();
    }
    if (state.deletedPreset) {
      const deleted = state.deletedPreset;
      const undo2 = this.button(parent, `${deleted.preset.name} \uC0AD\uC81C \uB418\uB3CC\uB9AC\uAE30`, () => {
        undoPresetDeletion(state);
        this.changed();
        this.render();
        this.root.querySelector(`[data-preset-manager=${deleted.kind}] summary`)?.focus({ preventScroll: true });
      });
      undo2.dataset.presetUndo = "true";
    }
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
    this.dispose();
    this.contentEl.replaceChildren();
    await this.plugin.flush().catch((e) => this.plugin.reportSaveError(e));
  }
  dispose() {
    this.stopBulbTimer();
    this.clean();
  }
  clean() {
    for (const a of this.aborters) a.abort();
    this.aborters.length = 0;
    this.numeric.clear();
    this.power = void 0;
    this.powerButtons = {};
    this.linkToggle = void 0;
    this.dragMax = void 0;
    this.paintBulbTimer = void 0;
  }
  listen(el, event, fn) {
    const a = new AbortController();
    el.addEventListener(event, fn, { signal: a.signal });
    this.aborters.push(a);
  }
  minimumFocus() {
    const s = this.plugin.state;
    return effectiveMinFocus(s.inputs, selectedPreset(s, "lenses"));
  }
  focusHyperfocal() {
    try {
      const s = this.plugin.state, { hyperfocal } = optics(s.inputs);
      this.plugin.update("cameraDistance", selectedPreset(s, "lenses") ? Math.max(this.minimumFocus(), hyperfocal) : hyperfocal);
      this.syncNumeric("cameraDistance");
      this.changed();
    } catch (e) {
      this.plugin.report(e);
    }
  }
  sceneControls() {
    let dragging;
    const coordinate = (e) => {
      const rect = this.picture.querySelector("svg")?.getBoundingClientRect();
      return rect && rect.width > 0 ? (e.clientX - rect.left) / rect.width * SCENE.width : null;
    };
    const target = (e) => {
      if (!(e.target instanceof Element)) return;
      const element = e.target.closest("[data-pfm-subject],[data-zone-handle]");
      if (!element) return;
      const key = element.dataset.zoneHandle === "zoneNear" ? "zoneNear" : element.dataset.zoneHandle === "zoneFar" ? "zoneFar" : "cameraDistance";
      return { key, element };
    };
    const limits = (key) => {
      const i = this.plugin.state.inputs;
      const minimum = key === "zoneFar" ? Number.isFinite(i.zoneNear) ? i.zoneNear + 0.01 : 0.01 : this.minimumFocus();
      const maximum = this.dragMax ?? this.sceneMax;
      return { minimum, maximum: key === "zoneNear" && !i.zoneInfinity && Number.isFinite(i.zoneFar) ? Math.min(maximum, i.zoneFar - 0.01) : maximum };
    };
    const update = (key, distance) => {
      const { minimum, maximum } = limits(key);
      if (!Number.isFinite(distance) || minimum > maximum) return;
      this.plugin.update(key, Math.max(minimum, Math.min(maximum, distance)));
      this.syncNumeric(key);
      this.numeric.get(key)?.input.setAttribute("aria-invalid", "false");
      this.changed();
    };
    const fingerDistance = (x) => (x - SCENE.start) / (SCENE.end - SCENE.start) * (this.dragMax ?? this.sceneMax);
    const moveBand = (x, band) => {
      const minimum = this.minimumFocus(), maximum = this.dragMax ?? this.sceneMax;
      const near = Math.max(minimum, Math.min(maximum - band.width, fingerDistance(x) - band.offset));
      if (!Number.isFinite(near) || near < minimum) return;
      this.plugin.update("zoneNear", near);
      this.plugin.update("zoneFar", near + band.width);
      this.syncNumeric("zoneNear");
      this.syncNumeric("zoneFar");
      this.changed();
    };
    const applyFree = (x) => {
      const i = this.plugin.state.inputs, d = fingerDistance(x);
      const finiteFar = !i.zoneInfinity && Number.isFinite(i.zoneFar);
      const key = !finiteFar || !Number.isFinite(i.zoneNear) || Math.abs(d - i.zoneNear) <= Math.abs(d - i.zoneFar) ? "zoneNear" : "zoneFar";
      update(key, d);
    };
    this.listen(this.picture, "pointerdown", (event) => {
      if (!(event instanceof PointerEvent) || dragging) return;
      const control = target(event), x = coordinate(event);
      if (x === null) return;
      const i = this.plugin.state.inputs;
      if (!control) {
        if (!i.zoneOn || i.zoneGoal !== "range" || !this.picture.querySelector("svg")?.contains(event.target)) return;
        this.dragMax = this.sceneMax;
        const d = fingerDistance(x), finiteFar = !i.zoneInfinity && Number.isFinite(i.zoneFar) && Number.isFinite(i.zoneNear);
        const width = finiteFar ? i.zoneFar - i.zoneNear : 0;
        if (finiteFar && d > i.zoneNear + width * 0.2 && d < i.zoneFar - width * 0.2) dragging = { pointer: event.pointerId, key: "zoneNear", offset: 0, band: { offset: d - i.zoneNear, width } };
        else dragging = { pointer: event.pointerId, key: "zoneNear", offset: 0, free: { startX: x, moved: false } };
        this.picture.setPointerCapture(event.pointerId);
        return;
      }
      const current = i[control.key];
      const fraction = control.key === "cameraDistance" && i.focusInfinity ? 1 : Number.isFinite(current) ? Math.max(0, Math.min(1, current / this.sceneMax)) : 0;
      const anchor = SCENE.start + (SCENE.end - SCENE.start) * fraction;
      this.dragMax = this.sceneMax;
      dragging = { pointer: event.pointerId, key: control.key, offset: x - anchor };
      this.picture.setPointerCapture(event.pointerId);
      event.preventDefault();
    });
    this.listen(this.picture, "pointermove", (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== dragging?.pointer) return;
      const x = coordinate(event);
      if (x === null) return;
      event.preventDefault();
      if (dragging.band) {
        moveBand(x, dragging.band);
        return;
      }
      if (dragging.free) {
        if (!dragging.free.moved && Math.abs(x - dragging.free.startX) < 4) return;
        dragging.free.moved = true;
        applyFree(x);
        return;
      }
      const { minimum, maximum } = limits(dragging.key);
      update(dragging.key, Math.min(maximum, sceneDistance(x - dragging.offset, this.sceneMax, this.plugin.state.inputs.focal, minimum)));
    });
    this.listen(this.picture, "pointerup", (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== dragging?.pointer || !dragging.free || dragging.free.moved) return;
      const x = coordinate(event);
      if (x !== null) applyFree(x);
    });
    for (const kind of ["pointerup", "pointercancel", "lostpointercapture"]) this.listen(this.picture, kind, (event) => {
      if (!(event instanceof PointerEvent) || event.pointerId !== dragging?.pointer) return;
      dragging = void 0;
      this.dragMax = void 0;
      if (this.picture.hasPointerCapture(event.pointerId)) this.picture.releasePointerCapture(event.pointerId);
      this.paint();
      void this.plugin.flush().catch((e) => this.plugin.reportSaveError(e));
    });
    this.listen(this.picture, "keydown", (event) => {
      if (!(event instanceof KeyboardEvent) || !["ArrowLeft", "ArrowRight"].includes(event.key)) return;
      const control = target(event);
      if (!control) return;
      const value = this.plugin.state.inputs[control.key], direction = event.key === "ArrowLeft" ? -1 : 1;
      const minimum = limits(control.key).minimum;
      event.preventDefault();
      const next = stepDistance(value, direction, minimum);
      if (next === void 0) return;
      update(control.key, next);
      const selector = control.key === "cameraDistance" ? "[data-pfm-subject]" : `[data-zone-handle=${control.key}]`;
      this.picture.querySelector(selector)?.focus({ preventScroll: true });
    });
  }
  changed() {
    const i = this.plugin.state.inputs;
    if (i.linked && Number.isFinite(i.cameraDistance) && !i.focusInfinity && i.flashDistance !== i.cameraDistance) {
      this.plugin.update("flashDistance", i.cameraDistance);
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
    const span = Number(range.max) - Number(range.min);
    const percent = span > 0 ? (Number(range.value) - Number(range.min)) / span * 100 : 0;
    range.style.setProperty("--pfm-range-progress", `${percent}%`);
    range.style.setProperty("--pfm-range-fraction", String(percent / 100));
  }
  apertureStops() {
    const lens = selectedPreset(this.plugin.state, "lenses");
    if (lens) return lens.apertureSteps;
    const { apertureSteps, apertureMin, apertureMax } = this.plugin.state.inputs;
    const stops = [...new Set(apertureSteps.split(",").map(Number))].filter((n) => n > 0 && Number.isFinite(n) && n >= apertureMin && n <= apertureMax).sort((a, b) => a - b);
    return stops.length ? stops : FULL_STOP_APERTURES.split(",").map(Number);
  }
  number(parent, label, key, options) {
    const isFocus = key === "cameraDistance";
    const hasFocusMinimum = isFocus || key === "zoneNear";
    const apertureStops = () => this.apertureStops();
    const wrap = node(parent, "div", void 0, "pfm-field");
    wrap.dataset.field = key;
    const infinite = () => isFocus && this.plugin.state.inputs.focusInfinity;
    const compact = { cameraDistance: "\uCD08\uC810 \uB9DE\uCD9C \uAC70\uB9AC (m)", aperture: "\uC2E4\uC81C \uC870\uB9AC\uAC1C (f/)" };
    const caption = node(wrap, "label", compact[key] ?? label);
    const entry = node(wrap, "div", void 0, "pfm-number-entry");
    const input = node(wrap, "input");
    input.type = "number";
    input.inputMode = "decimal";
    input.step = "any";
    input.value = Number.isFinite(this.plugin.state.inputs[key]) ? String(this.plugin.state.inputs[key]) : "";
    input.dataset.key = key;
    input.setAttribute("aria-label", label);
    input.id = `pfm-control-${++nextControlId}`;
    caption.htmlFor = input.id;
    const isDistance = ["cameraDistance", "flashDistance", "zoneNear", "zoneFar"].includes(key);
    let scale = 1, minimum = options?.min ?? 0.1;
    let range;
    let infinityButton;
    const ruler = isFocus ? node(wrap, "div", void 0, "pfm-focus-ruler") : void 0;
    const ticks = ruler ? node(ruler, "div", void 0, "pfm-focus-ticks") : void 0;
    ticks?.setAttribute("aria-hidden", "true");
    const depth = ruler ? node(ruler, "div", void 0, "pfm-focus-depth") : void 0;
    depth?.setAttribute("role", "img");
    let axis;
    let lastMinimum;
    const currentStops = () => key === "aperture" ? apertureStops() : void 0;
    let stops = currentStops();
    const toRange = (v) => {
      if (isFocus) {
        const fraction = infinite() ? 1 : axis?.position(v) ?? 0;
        return String(Math.round(fraction * FOCUS_SCALE_STEPS));
      }
      const values = stops;
      if (!values) return String(v);
      if (!Number.isFinite(v) || v <= 0) return "0";
      let best = 0;
      values.forEach((stop, n) => {
        if (Math.abs(Math.log(v / stop)) < Math.abs(Math.log(v / values[best]))) best = n;
      });
      return String(best);
    };
    const rangeText = (v) => key === "aperture" ? `f/${fmt(stops ? stops[Number(toRange(v))] : v)}` : fmt(v);
    const updateFocusScale = () => {
      if (!ruler || !ticks || !range) return;
      const { focal } = this.plugin.state.inputs;
      const floor = this.minimumFocus();
      if (Object.is(floor, lastMinimum)) return;
      lastMinimum = floor;
      axis = focusScale(focal, floor);
      if (Number.isFinite(focal) && focal > 0) minimum = floor;
      input.min = String(minimum * scale);
      range.disabled = !axis;
      ruler.hidden = !axis;
      ticks.replaceChildren();
      if (!axis) return;
      for (const distance of FOCUS_SCALE_TICKS) {
        if (distance < axis.minimum) continue;
        const tick = node(ticks, "span", distance === Infinity ? "\u221E" : String(distance));
        tick.style.left = `${axis.position(distance) * 100}%`;
      }
    };
    const syncRange = (value) => {
      if (!range) return;
      range.value = toRange(value);
      this.rangeProgress(range);
      if (isFocus) range.setAttribute("aria-valuetext", infinite() ? "\uBB34\uD55C\uB300" : metres(value));
      else if (stops) range.setAttribute("aria-valuetext", rangeText(value));
    };
    const rangeOptions = isFocus ? { min: 0, max: FOCUS_SCALE_STEPS, step: 1 } : options;
    if (rangeOptions) {
      wrap.classList.add("pfm-range-field");
      input.min = String(minimum);
      range = node(wrap, "input");
      range.type = "range";
      range.min = stops ? "0" : String(rangeOptions.min);
      range.max = String(stops ? stops.length - 1 : rangeOptions.max);
      range.step = String(stops ? 1 : rangeOptions.step);
      if (stops) {
        range.dataset.stops = String(stops.length);
        range.style.setProperty("--pfm-range-div", String(stops.length - 1));
      }
      range.setAttribute("aria-label", `${label} \uBE60\uB978 \uC870\uC808`);
      range.dataset.range = key;
      const r = range;
      this.listen(r, "input", () => {
        const position = Number(r.value);
        const value = isFocus ? axis?.distance(position / FOCUS_SCALE_STEPS) : stops ? stops[position] : position;
        if (value === void 0) return;
        this.plugin.update(key, value);
        sync();
        input.setAttribute("aria-invalid", "false");
        this.changed();
      });
    }
    if (key === "flashDistance") wrap.classList.add("pfm-flash-distance");
    const infinityUi = () => {
      if (key !== "cameraDistance") return;
      input.placeholder = infinite() ? "\u221E" : "";
      if (infinite()) {
        input.value = "";
        input.setAttribute("aria-invalid", "false");
      }
      wrap.dataset.focusInfinity = String(infinite());
      infinityButton?.setAttribute("aria-pressed", String(infinite()));
    };
    const sync = () => {
      const value = this.plugin.state.inputs[key];
      if (isDistance && Number.isFinite(value) && value >= 0) scale = value <= 1 ? 100 : 1;
      const unit = scale === 100 ? "cm" : "m";
      if (isDistance) {
        caption.textContent = (compact[key] ?? label).replace("(m)", `(${unit})`);
        input.setAttribute("aria-label", label.replace("(m)", `(${unit})`));
        input.dataset.displayUnit = unit;
        if (hasFocusMinimum) minimum = this.minimumFocus();
        if ((options || hasFocusMinimum) && Number.isFinite(minimum)) input.min = String(minimum * scale);
      }
      input.value = infinite() ? "" : Number.isFinite(value) ? String(isDistance && document.activeElement !== input ? Number((value * scale).toFixed(1)) : scale === 100 ? Number((value * scale).toPrecision(15)) : value) : "";
      infinityUi();
      syncRange(value);
    };
    const apply = (value) => {
      if (input.disabled) return;
      this.plugin.update(key, value);
      sync();
      input.dispatchEvent(new Event("input", { bubbles: true }));
    };
    const choices = { aperture: apertureStops(), iso: FILM_SPEEDS, cameraDistance: [0.3, 0.5, 1, 2, 3, 5, 10], flashDistance: [0.3, 0.5, 1, 2, 3, 5, 10], loss: [0, 0.5, 1, 2, 3] };
    const candidate = (direction) => {
      const value = this.plugin.state.inputs[key];
      if (input.disabled || !Number.isFinite(value)) return;
      let steps = key === "aperture" ? apertureStops() : choices[key];
      if (key === "denominator") try {
        steps = powerSteps(this.plugin.state.inputs.steps, this.plugin.state.inputs.minDenominator);
      } catch {
        return;
      }
      if (steps && !isDistance && key !== "loss") {
        const next = direction > 0 ? steps.find((n) => n > value) : [...steps].reverse().find((n) => n < value);
        return next;
      }
      if (isDistance) return stepDistance(value, direction, hasFocusMinimum ? this.minimumFocus() : 0.01);
      const increment = key === "coc" ? 1e-3 : ["loss"].includes(key) ? 0.1 : 1;
      const result = Math.max(key === "loss" ? -Infinity : increment, Number((value + direction * increment).toPrecision(15)));
      return (result - value) * direction > 0 ? result : void 0;
    };
    const adjust = (direction) => {
      if (infinite()) {
        if (direction < 0) apply(this.plugin.state.inputs[key]);
        return;
      }
      const value = candidate(direction);
      if (value !== void 0) apply(value);
    };
    const minus = this.button(entry, "\u2212", () => adjust(-1));
    minus.dataset.step = "down";
    minus.setAttribute("aria-label", `${label} \uC904\uC774\uAE30`);
    entry.append(input);
    const plus = this.button(entry, "+", () => adjust(1));
    plus.dataset.step = "up";
    plus.setAttribute("aria-label", `${label} \uB298\uB9AC\uAE30`);
    let picker;
    if (choices[key]) {
      picker = node(wrap, "select", void 0, "pfm-value-picker");
      picker.dataset.preset = key;
      picker.setAttribute("aria-label", `${label} \uC790\uC8FC \uC4F0\uB294 \uAC12`);
      const control = picker;
      this.listen(control, "change", () => {
        if (control.value !== "") apply(Number(control.value));
        control.value = "";
      });
    }
    let pickerOptions = "";
    const updateControls = (limits) => {
      const lens = selectedPreset(this.plugin.state, "lenses"), value = this.plugin.state.inputs[key];
      if (hasFocusMinimum) {
        minimum = this.minimumFocus();
        if (Number.isFinite(minimum)) input.min = String(minimum * scale);
        else input.removeAttribute("min");
      }
      if (key === "aperture" && range) {
        stops = currentStops();
        if (stops) {
          range.max = String(stops.length - 1);
          range.disabled = stops.length === 1;
          range.dataset.stops = String(stops.length);
          range.style.setProperty("--pfm-range-div", String(Math.max(1, stops.length - 1)));
          syncRange(value);
        }
        if (lens) {
          input.min = String(lens.apertureMin);
          input.max = String(lens.apertureMax);
        } else {
          input.min = String(options?.min ?? 0);
          input.removeAttribute("max");
        }
      }
      if (picker) {
        let values = (key === "aperture" ? apertureStops() : choices[key]) ?? [];
        if (hasFocusMinimum && lens) values = values.filter((n) => n >= minimum);
        const optionKey = values.join(",") + ";";
        if (pickerOptions !== optionKey) {
          pickerOptions = optionKey;
          picker.replaceChildren();
          const placeholder = node(picker, "option", "\uC790\uC8FC \uC4F0\uB294 \uAC12");
          placeholder.value = "";
          for (const n of values) {
            const option = node(picker, "option", isDistance ? metres(n) : key === "aperture" ? `f/${n}` : String(n));
            option.value = String(n);
          }
        }
        picker.disabled = input.disabled || !values.length;
      }
      infinityUi();
      minus.disabled = infinite() ? false : candidate(-1) === void 0;
      plus.disabled = infinite() || candidate(1) === void 0;
      if (!depth) return;
      updateFocusScale();
      const focus = this.plugin.state.inputs.cameraDistance;
      syncRange(focus);
      depth.hidden = !axis || !limits;
      if (!axis || !limits) return;
      depth.style.setProperty("--pfm-depth-near", `${axis.position(limits.near) * 100}%`);
      depth.style.setProperty("--pfm-depth-far", `${axis.position(limits.far) * 100}%`);
      depth.style.setProperty("--pfm-depth-focus", `${axis.position(infinite() ? Infinity : focus) * 100}%`);
      depth.setAttribute("aria-label", `\uC2EC\uB3C4 ${metres(limits.near)} ~ ${metres(limits.far)} \xB7 \uCD08\uC810 ${infinite() ? "\uBB34\uD55C\uB300" : metres(focus)}`);
    };
    if (isFocus) {
      const b = node(wrap, "button", "\u221E", "pfm-infinity-toggle");
      b.type = "button";
      b.dataset.focusInfinity = "true";
      b.setAttribute("aria-label", "\uBB34\uD55C\uB300 \uCD08\uC810");
      infinityButton = b;
      this.listen(b, "click", () => {
        this.plugin.setFocusInfinity(!this.plugin.state.inputs.focusInfinity);
        sync();
        this.changed();
        b.focus({ preventScroll: true });
      });
    }
    updateFocusScale();
    this.numeric.set(key, { input, range, sync, updateControls });
    sync();
    this.listen(input, "input", () => {
      const v = parseNumber(input.value) / scale;
      this.plugin.update(key, v);
      if (key === "denominator") this.syncPower();
      if (range && Number.isFinite(v)) {
        range.value = toRange(v);
        this.rangeProgress(range);
      }
      input.setAttribute("aria-invalid", String(!Number.isFinite(v) || key !== "loss" && v <= 0));
      this.changed();
    });
    if (isDistance) this.listen(input, "blur", () => {
      const value = this.plugin.state.inputs[key], lens = selectedPreset(this.plugin.state, "lenses");
      if (lens && hasFocusMinimum && !infinite() && Number.isFinite(value) && value < this.minimumFocus()) {
        this.plugin.update(key, this.minimumFocus());
        input.setAttribute("aria-invalid", "false");
        this.changed();
      }
      sync();
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
      const value = typeof this.plugin.state.inputs[key] === "number" ? Number(s.value) : s.value;
      this.plugin.update(key, value);
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
  jumpSettings(target) {
    const section = this.root.querySelector(`[data-pfm-settings=${target}]`);
    if (!section) return;
    section.open = true;
    section.scrollIntoView({ block: "start" });
    section.querySelector("summary")?.focus({ preventScroll: true });
  }
  details(label, id) {
    const d = node(this.root, "details");
    if (id) d.dataset.pfmSettings = id;
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
    if (this.retry) this.retry.hidden = !this.plugin.saveError;
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
      steps = powerSteps(i.steps, i.minDenominator);
    } catch {
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
    this.numeric.get(key)?.sync();
    if (key === "denominator") this.syncPower();
  }
  applyOutput(denominator) {
    this.outputUndo = { before: this.plugin.state.inputs.denominator, applied: denominator };
    this.plugin.update("denominator", denominator);
    this.syncNumeric("denominator");
    this.changed();
  }
  stopBulbTimer() {
    if (this.bulbRemaining === void 0) return;
    window.clearTimeout(this.bulbTimeout);
    this.bulbTimeout = void 0;
    this.bulbRemaining = void 0;
    this.bulbFlash?.cancel();
    this.bulbFlash = void 0;
    this.root?.removeAttribute("data-bulb-ended");
    this.paintBulbTimer?.();
  }
  startBulbTimer(seconds) {
    this.stopBulbTimer();
    const started = Date.now();
    const tick = () => {
      const elapsed = Math.max(0, (Date.now() - started) / 1e3);
      const left = seconds - elapsed;
      if (left <= 0) {
        this.bulbTimeout = void 0;
        this.bulbRemaining = 0;
        this.paintBulbTimer?.();
        this.root.dataset.bulbEnded = "true";
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          this.bulbFlash = this.root.querySelector(".pfm-bulb-flash")?.animate([{ opacity: 0.88 }, { opacity: 0 }], { duration: 220, easing: "ease-out" });
        }
        navigator.vibrate?.(160);
        return;
      }
      this.bulbRemaining = seconds - Math.floor(elapsed);
      this.bulbTimeout = window.setTimeout(tick, Math.ceil(1e3 * Math.min(left, 1 - elapsed % 1)));
      this.paintBulbTimer?.();
    };
    tick();
  }
  reciprocityPanel() {
    const body = this.details("\uC7A5\uB178\uCD9C \xB7 \uC0C1\uBC18\uCE59 \uBD88\uADA4");
    body.classList.add("pfm-reciprocity");
    node(this.root, "div", void 0, "pfm-bulb-flash").setAttribute("aria-hidden", "true");
    const i = this.plugin.state.inputs;
    if (!isReciprocityFilmId(i.reciprocityFilm)) i.reciprocityFilm = "vision3-500t";
    if (!i.reciprocityOverrides || typeof i.reciprocityOverrides !== "object" || Array.isArray(i.reciprocityOverrides)) i.reciprocityOverrides = {};
    if (!validMeteredSeconds(i.meteredSeconds)) i.meteredSeconds = 4;
    const filmLabel = node(body, "label", void 0, "pfm-field");
    node(filmLabel, "span", "\uD544\uB984");
    const filmSelect = node(filmLabel, "select");
    for (const film of Object.values(RECIPROCITY_FILMS)) node(filmSelect, "option", film.name).value = film.id;
    filmSelect.value = i.reciprocityFilm;
    const time = this.text(body, "\uCE21\uAD11 \uC2DC\uAC04 (\uCD08)", String(i.meteredSeconds));
    const meteredEquivalent = node(body, "p");
    const exponent = this.text(body, "\uC9C0\uC218 p (1.0~2.0)", "");
    for (const input of [time, exponent]) {
      input.type = "number";
      input.step = "any";
      input.inputMode = "decimal";
    }
    exponent.min = "1";
    exponent.max = "2";
    const persist = () => {
      void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
      this.plugin.refresh(this);
    };
    const reset = this.button(body, "\uC2E4\uCE21 \uC9C0\uC218 \uCD08\uAE30\uD654", () => {
      this.stopBulbTimer();
      delete i.reciprocityOverrides[i.reciprocityFilm];
      syncExponent();
      paintResult();
      persist();
    });
    const result = node(body, "div");
    result.setAttribute("role", "status");
    const duration = node(result, "p", void 0, "pfm-exposure-time");
    const equivalent = node(result, "p");
    const basis = node(result, "p");
    const official = node(result, "p");
    const note2 = node(result, "p");
    const advice = node(result, "p");
    const bulb = node(result, "p", "B \uC154\uD130 \xB7 \uB9B4\uB9AC\uC988 \uC7A0\uAE08");
    const error = node(result, "p", void 0, "pfm-reciprocity-error");
    const countdown = node(body, "p", void 0, "pfm-bulb-countdown");
    countdown.setAttribute("role", "timer");
    countdown.setAttribute("aria-label", "\uB0A8\uC740 \uB178\uCD9C \uC2DC\uAC04");
    const timerStatus = node(body, "p");
    timerStatus.setAttribute("role", "status");
    let corrected;
    const timer = this.button(body, "\uBC8C\uBE0C \uD0C0\uC774\uBA38 \uC2DC\uC791", () => {
      if (this.bulbTimeout !== void 0) this.stopBulbTimer();
      else if (corrected !== void 0 && corrected > 1) this.startBulbTimer(corrected);
    });
    const syncExponent = () => {
      exponent.value = String(i.reciprocityOverrides[i.reciprocityFilm] ?? RECIPROCITY_FILMS[i.reciprocityFilm].p ?? "");
    };
    this.paintBulbTimer = () => {
      const running = this.bulbTimeout !== void 0;
      const remaining = this.bulbRemaining;
      countdown.hidden = remaining === void 0;
      countdown.textContent = remaining === void 0 ? "" : formatExposureSeconds(remaining);
      const status = remaining === 0 ? "\uB178\uCD9C \uC885\uB8CC \xB7 \uB9B4\uB9AC\uC988 \uC7A0\uAE08 \uD574\uC81C" : "";
      if (timerStatus.textContent !== status) timerStatus.textContent = status;
      timer.textContent = running ? "\uBC8C\uBE0C \uD0C0\uC774\uBA38 \uC815\uC9C0" : "\uBC8C\uBE0C \uD0C0\uC774\uBA38 \uC2DC\uC791";
      const canStart = corrected !== void 0 && corrected > 1;
      timer.hidden = !canStart && !running;
      filmSelect.disabled = time.disabled = exponent.disabled = running;
      reset.disabled = running || i.reciprocityOverrides[i.reciprocityFilm] === void 0 && exponent.value === String(RECIPROCITY_FILMS[i.reciprocityFilm].p ?? "") && !exponent.validity.badInput;
    };
    const paintResult = () => {
      const film = RECIPROCITY_FILMS[i.reciprocityFilm];
      const metered = time.valueAsNumber;
      const override = i.reciprocityOverrides[film.id];
      const p = override === void 0 && !exponent.validity.badInput && exponent.value === String(film.p ?? "") ? void 0 : exponent.valueAsNumber;
      const validTime = validMeteredSeconds(metered);
      time.setAttribute("aria-invalid", String(!validTime));
      meteredEquivalent.textContent = validTime ? formatExposureMinutes(metered) : "";
      exponent.setAttribute("aria-invalid", String(p !== void 0 ? !validReciprocityExponent(p) : film.p === void 0 && metered > film.uncorrectedMax));
      try {
        const value = correctedTime(metered, film, p);
        corrected = value.corrected;
        duration.textContent = `\uC2E4\uC81C \uB178\uCD9C ${formatExposureSeconds(corrected)}`;
        equivalent.textContent = formatExposureMinutes(corrected);
        const label = value.basis === "uncorrected" ? `${film.id === "custom" ? "1\uCD08 \uAE30\uC900" : "\uACF5\uC2DD \uBC94\uC704"} \xB7 \uBCF4\uC815 \uBD88\uD544\uC694` : value.basis === "measured" ? "\uC2E4\uCE21 \uC9C0\uC218 \uAE30\uBC18 \uCD94\uC815" : film.source;
        const extra = value.extraStops > 0 ? "+" : "";
        basis.textContent = `${label} \xB7 ${extra}${fmt(value.extraStops)}\uC2A4\uD1B1${override === void 0 ? "" : ` \xB7 \uB0B4 \uC2E4\uCE21 \uC9C0\uC218 p=${fmt(override)}`}`;
        official.textContent = film.id === "custom" ? "" : film.officialNote;
        note2.textContent = override !== void 0 && "filter" in film ? "" : film.note;
        advice.textContent = [value.filter, value.bracket].filter(Boolean).join(" \xB7 ");
        bulb.hidden = corrected <= 1;
        error.textContent = "";
      } catch (e) {
        corrected = void 0;
        for (const line of [duration, equivalent, basis, official, note2, advice]) line.textContent = "";
        bulb.hidden = true;
        error.textContent = e instanceof Error ? e.message : String(e);
      }
      this.paintBulbTimer?.();
    };
    this.listen(filmSelect, "change", () => {
      if (!isReciprocityFilmId(filmSelect.value)) return;
      i.reciprocityFilm = filmSelect.value;
      this.stopBulbTimer();
      syncExponent();
      paintResult();
      persist();
    });
    this.listen(time, "input", () => {
      this.stopBulbTimer();
      const value = time.valueAsNumber;
      if (validMeteredSeconds(value)) {
        i.meteredSeconds = value;
        persist();
      }
      paintResult();
    });
    this.listen(exponent, "input", () => {
      this.stopBulbTimer();
      const p = exponent.valueAsNumber;
      if (validReciprocityExponent(p)) {
        i.reciprocityOverrides[i.reciprocityFilm] = p;
        persist();
      }
      paintResult();
    });
    syncExponent();
    paintResult();
  }
  fillPanel(parent) {
    const fill = node(parent, "details", void 0, "pfm-fill");
    node(fill, "summary", "\uD544\uC778 \uD50C\uB798\uC2DC");
    node(fill, "p", "\uC8FC\uAD11 \uB178\uCD9C\uC744 \uBA3C\uC800 \uB9DE\uCD94\uC138\uC694. \uD604\uC7AC \uC870\uB9AC\uAC1C\uB85C \uD544\uC778 \uCD9C\uB825\uC744 \uACC4\uC0B0\uD569\uB2C8\uB2E4.");
    const camera = selectedPreset(this.plugin.state, "cameras");
    const limit = syncLimit(camera);
    const shutter = this.select(fill, "\uC154\uD130 \uC18D\uB3C4", "shutter", {});
    for (const n of cameraShutters(camera)) node(shutter, "option", shutterLabel(n)).value = String(n);
    shutter.value = String(this.plugin.state.inputs.shutter);
    const ratio = this.select(fill, "\uD544\uC778 \uBE44\uC728", "fillRatio", Object.fromEntries(FILL_RATIOS.map((ev) => [ev, `\u2212${Math.abs(ev)} EV`])));
    const result = node(fill, "p");
    result.setAttribute("role", "status");
    const warning = node(fill, "p", `${camera?.name ?? "FM2"} \uB3D9\uC870 \uD55C\uACC4 ${shutterLabel(limit)}${camera ? "" : " (\uCD08\uAE30 FM2\uB294 1/200\uCD08)"} \xB7 \uD604\uC7AC \uC154\uD130\uAC00 \uB354 \uBE68\uB77C \uD50C\uB798\uC2DC\uAC00 \uC77C\uBD80\uB9CC \uCC0D\uD790 \uC218 \uC788\uC2B5\uB2C8\uB2E4`, "pfm-flash-warning");
    warning.setAttribute("role", "status");
    let recommended;
    const apply = this.button(fill, "\uCD9C\uB825 \uC801\uC6A9", () => {
      if (recommended !== void 0) this.applyOutput(recommended);
    });
    this.paintFill = () => {
      const i = this.plugin.state.inputs;
      shutter.value = String(i.shutter);
      ratio.value = String(i.fillRatio);
      try {
        const value = fillFlash(i, camera);
        warning.hidden = !value.syncExceeded;
        recommended = value.nearest;
        const range = value.range === "below" ? " \xB7 \uCD5C\uC18C \uCD9C\uB825\uC73C\uB85C\uB3C4 \uACFC\uD568 \xB7 \uAC70\uB9AC\uB97C \uB298\uB9AC\uAC70\uB098 \uC870\uB9AC\uAC1C\uB97C \uC870\uC774\uC138\uC694" : value.range === "above" ? " \xB7 \uCD5C\uB300 \uCD9C\uB825\uC73C\uB85C\uB3C4 \uBD80\uC871" : "";
        result.textContent = `\uAD8C\uC7A5 1/${recommended} \xB7 \uBAA9\uD45C \uB300\uBE44 \uC624\uCC28 ${fmt(value.residual)} EV${range}`;
        result.classList.toggle("pfm-flash-warning", value.range !== "within");
      } catch (e) {
        warning.hidden = i.shutter <= limit;
        recommended = void 0;
        result.textContent = e instanceof Error ? e.message : String(e);
        result.classList.add("pfm-flash-warning");
      }
      apply.disabled = recommended === void 0 || recommended === i.denominator;
      apply.textContent = recommended === void 0 ? "\uCD9C\uB825 \uC801\uC6A9" : `\uCD9C\uB825 1/${recommended} ${apply.disabled ? "\uC801\uC6A9\uB428" : "\uC801\uC6A9"}`;
    };
  }
  calibrationPanel(parent) {
    const panel = node(parent, "details", void 0, "pfm-calibration");
    node(panel, "summary", "\uC2E4\uCE21\uC73C\uB85C GN \uB9DE\uCD94\uAE30");
    const i = this.plugin.state.inputs;
    const fields = [
      ["iso", "\uC2E4\uCE21 ISO", () => i.iso],
      ["distance", "\uD50C\uB798\uC2DC\u2013\uD53C\uC0AC\uCCB4 \uC2E4\uCE21 \uAC70\uB9AC (m)", () => i.linked ? i.focusInfinity ? NaN : i.cameraDistance : i.flashDistance],
      ["aperture", "\uC801\uC815\uC774\uC5C8\uB358 \uC870\uB9AC\uAC1C f/", () => i.aperture]
    ];
    const controls = fields.map(([key, label, current]) => {
      const input = this.text(panel, label, this.calibrationDraft[key] ?? "");
      input.type = "number";
      input.step = "any";
      input.inputMode = key === "iso" ? "numeric" : "decimal";
      this.listen(input, "input", () => {
        this.calibrationDraft[key] = input.value;
        this.paintCalibration();
      });
      return { key, current, input };
    });
    const powerLabel = node(panel, "label", void 0, "pfm-field");
    controls[0].input.closest("label")?.after(powerLabel);
    node(powerLabel, "span", "\uC2E4\uCE21 \uCD9C\uB825");
    const power = node(powerLabel, "select");
    this.listen(power, "change", () => {
      this.calibrationDraft.denominator = power.value;
      this.paintCalibration();
    });
    const result = node(panel, "p");
    result.setAttribute("role", "status");
    const status = node(panel, "p");
    status.setAttribute("role", "status");
    status.hidden = true;
    let measurement, calibration;
    const apply = (manual) => {
      if (!calibration || !manual && calibration.loss === void 0) return;
      const { iso, denominator, distance, aperture } = measurement;
      const values = manual ? {
        gnMode: "manual",
        gn: calibration.gn,
        gnUnit: "m",
        gnZoom: i.zoom,
        loss: 0,
        conditions: `\uC2E4\uCE21 \uC5ED\uC0B0 \xB7 ISO ${iso} \xB7 \uCD9C\uB825 1/${denominator} \xB7 \uAC70\uB9AC ${distance} m \xB7 f/${aperture}`
      } : { loss: calibration.loss };
      const change = patch(i, values);
      if (Object.keys(change.after).length) {
        this.calibrationUndo = { ...change, after: { ...change.after, gnMode: i.gnMode, zoom: i.zoom, equipmentId: i.equipmentId } };
        this.calibrationMessage = manual ? `\uC218\uB3D9 GN ${fmt(i.gn)} m \uC801\uC6A9 \xB7 \uAD11\uB7C9 \uBCF4\uC815 0 EV` : `\uAD11\uB7C9 \uBCF4\uC815 ${fmt(i.loss)} EV \uC801\uC6A9`;
      } else this.calibrationMessage = "\uD604\uC7AC \uC124\uC815\uACFC \uAC19\uC740 \uAC12\uC785\uB2C8\uB2E4.";
      this.syncNumeric("loss");
      this.changed();
      if (this.calibrationUndo) undoButton.focus({ preventScroll: true });
    };
    const lossButton = this.button(panel, "\uAD11\uB7C9 \uBCF4\uC815\uC5D0 \uC801\uC6A9", () => apply(false));
    const manualButton = this.button(panel, "\uC218\uB3D9 GN\uC73C\uB85C \uC801\uC6A9", () => apply(true));
    const undoButton = this.button(panel, "\uC2E4\uCE21 GN \uC801\uC6A9 \uCDE8\uC18C", () => {
      if (this.calibrationUndo && undo(i, this.calibrationUndo)) this.calibrationMessage = "\uC2E4\uCE21 GN \uC801\uC6A9\uC744 \uCDE8\uC18C\uD588\uC2B5\uB2C8\uB2E4.";
      this.calibrationUndo = void 0;
      this.syncNumeric("loss");
      this.changed();
      (lossButton.disabled ? manualButton : lossButton).focus({ preventScroll: true });
    });
    let powerOptions = "";
    this.paintCalibration = () => {
      if (this.calibrationUndo && !canUndo(i, this.calibrationUndo)) {
        this.calibrationUndo = void 0;
        this.calibrationMessage = "\uC124\uC815\uC774 \uBCC0\uACBD\uB418\uC5B4 \uC2E4\uCE21 GN \uC801\uC6A9 \uCDE8\uC18C\uAC00 \uB9CC\uB8CC\uB418\uC5C8\uC2B5\uB2C8\uB2E4.";
      }
      undoButton.hidden = !this.calibrationUndo;
      status.textContent = this.calibrationMessage;
      status.hidden = !this.calibrationMessage;
      for (const { key, current, input } of controls) {
        if (this.calibrationDraft[key] === void 0) {
          const value = current();
          input.value = Number.isFinite(value) ? String(value) : "";
        }
      }
      calibration = void 0;
      let steps = [];
      try {
        steps = powerSteps(i.steps, i.minDenominator);
      } catch (e) {
        result.textContent = e instanceof Error ? e.message : String(e);
      }
      const options = steps.join(",");
      if (options !== powerOptions || !power.options.length) {
        power.replaceChildren();
        node(power, "option", "\uC9C0\uC6D0 \uCD9C\uB825 \uC120\uD0DD").value = "";
        for (const n of steps) node(power, "option", `1/${n}`).value = String(n);
        powerOptions = options;
      }
      const selected = this.calibrationDraft.denominator ?? String(i.denominator);
      power.value = steps.includes(Number(selected)) ? selected : "";
      power.disabled = !steps.length;
      if (steps.length) try {
        const [iso, distance, aperture] = controls.map(({ input }) => parseNumber(input.value));
        measurement = { iso, distance, aperture, denominator: parseNumber(power.value) };
        let nominal;
        try {
          nominal = nominalGN(i);
        } catch {
        }
        calibration = calibrateGN(measurement, steps, nominal);
        result.textContent = `\uC2E4\uCE21 ISO100 \uCD5C\uB300\uCD9C\uB825 GN ${fmt(calibration.gn)} m \xB7 ${calibration.loss === void 0 ? "\uD604\uC7AC \uC90C\uC758 \uACF5\uCE6D GN \uC790\uB8CC \uC5C6\uC74C" : `\uACF5\uCE6D ${fmt(nominal)} m \uB300\uBE44 \uAD11\uB7C9 \uBCF4\uC815 ${fmt(calibration.loss)} EV`}`;
      } catch (e) {
        result.textContent = e instanceof Error ? e.message : String(e);
      }
      result.classList.toggle("pfm-flash-warning", !calibration);
      lossButton.disabled = calibration?.loss === void 0;
      manualButton.disabled = !calibration || !Number.isFinite(i.zoom) || i.zoom <= 0;
    };
  }
  render() {
    if (this.plugin.state.version !== 2 || !Array.isArray(this.plugin.state.lenses)) this.plugin.state = restore(this.plugin.state);
    this.rememberDetails();
    this.clean();
    this.contentEl.replaceChildren();
    this.contentEl.addClass("pfm-container");
    this.root = node(this.contentEl, "div", void 0, "pfm-root");
    const i = this.plugin.state.inputs;
    this.root.dataset.night = String(i.nightMode);
    this.gearBar();
    const modes = node(this.root, "div", void 0, "pfm-mode-toggles");
    modes.setAttribute("role", "group");
    modes.setAttribute("aria-label", "\uCD2C\uC601 \uBAA8\uB4DC");
    for (const [key, label] of [["flashOn", "\uD50C\uB798\uC2DC"], ["zoneOn", "\uC874 \uD3EC\uCEE4\uC2F1"]]) {
      const button = this.button(modes, label, () => {
        this.plugin.update(key, !i[key]);
        this.render();
        this.root.querySelector(`[data-mode=${key}]`)?.focus({ preventScroll: true });
        void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
        this.plugin.refresh(this);
      });
      button.dataset.mode = key;
      button.setAttribute("aria-pressed", String(i[key]));
    }
    const night = this.button(modes, "\uC57C\uAC04", () => {
      this.plugin.update("nightMode", !i.nightMode);
      syncNight();
      void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
      this.plugin.refresh(this);
    });
    night.className = "pfm-night-toggle";
    night.setAttribute("aria-label", "\uC801\uC0C9 \uC57C\uAC04 \uBAA8\uB4DC");
    const syncNight = () => {
      this.root.dataset.night = String(i.nightMode);
      night.setAttribute("aria-pressed", String(i.nightMode));
    };
    syncNight();
    this.results = node(this.root, "section", void 0, "pfm-results");
    this.results.setAttribute("aria-live", "polite");
    this.picture = node(this.root, "figure", void 0, "pfm-diagram");
    this.sceneControls();
    this.flushOnEnd();
    this.quickControls();
    if (i.flashOn) this.flashPanel();
    this.reciprocityPanel();
    this.saveControls();
    this.presetManager();
    this.restoreDetails();
    this.paint();
  }
  quickControls() {
    const i = this.plugin.state.inputs;
    const quick = node(this.root, "section", void 0, "pfm-quick");
    node(quick, "h2", "\uBE60\uB978 \uC870\uC808");
    if (i.zoneOn && i.zoneGoal === "infinity") {
    } else if (i.zoneOn) {
      this.number(quick, "\uBAA9\uD45C \uC6D0\uAC70\uB9AC (m)", "zoneFar");
      const wrap = node(quick, "label", void 0, "pfm-check");
      const infinity = node(wrap, "input");
      infinity.type = "checkbox";
      infinity.checked = i.zoneInfinity;
      infinity.dataset.key = "zoneInfinity";
      node(wrap, "span", "\uBAA9\uD45C \uC6D0\uAC70\uB9AC \uBB34\uD55C\uB300");
      this.listen(infinity, "change", () => {
        this.plugin.update("zoneInfinity", infinity.checked);
        this.changed();
      });
    } else this.number(quick, "\uCD08\uC810 \uB9DE\uCD9C \uAC70\uB9AC (m)", "cameraDistance");
    this.number(quick, "\uC870\uB9AC\uAC1C (f/)", "aperture", { min: 0.7, max: 32, step: 0.1 });
    if (!i.flashOn) return;
    this.power = this.select(quick, "\uCD9C\uB825 \uC120\uD0DD", "denominator", {}, () => this.numeric.get("denominator")?.sync());
    const powerAdjust = node(quick, "div", void 0, "pfm-field-power");
    for (const [direction, label] of [["weaker", "\uCD9C\uB825 \uC57D\uD558\uAC8C"], ["stronger", "\uCD9C\uB825 \uAC15\uD558\uAC8C"]]) {
      const button = this.button(powerAdjust, label, () => {
        const next = nextPower(i, direction);
        if (next === void 0) return;
        this.plugin.update("denominator", next);
        this.syncNumeric("denominator");
        this.changed();
        if (button.disabled) this.powerButtons[direction === "weaker" ? "stronger" : "weaker"]?.focus({ preventScroll: true });
      });
      button.dataset.powerDirection = direction;
      this.powerButtons[direction] = button;
    }
    this.linkToggle = this.button(quick, "", () => {
      this.plugin.update("linked", !i.linked);
      this.changed();
    });
    this.linkToggle.className = "pfm-link-toggle";
    this.number(quick, "\uD50C\uB798\uC2DC \u2192 \uD53C\uC0AC\uCCB4 \uAC70\uB9AC (m)", "flashDistance", { min: 0.1, max: 30, step: 0.1 });
  }
  flashPanel() {
    const i = this.plugin.state.inputs;
    const fl = this.details("\uD50C\uB798\uC2DC \uC7A5\uBE44\xB7\uACE0\uAE09", "flash");
    this.equipmentPanel(fl);
    this.select(fl, "\uBC1C\uAD11 \uC870\uAC74", "mode", { manual: "\uC218\uB3D9 \xB7 \uC9C1\uC811\uAD11 \xB7 \uC77C\uBC18 \uB3D9\uC870", ttl: "TTL (FM2 \uBCF8\uCCB4 \uBBF8\uC9C0\uC6D0)", hss: "HSS (FM2 \uBBF8\uC9C0\uC6D0 \xB7 \uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", bounce: "\uBC14\uC6B4\uC2A4 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", modifier: "\uC18C\uD504\uD2B8\uBC15\uC2A4 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)", near: "\uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0 (\uACC4\uC0B0 \uBBF8\uC9C0\uC6D0)" });
    this.select(fl, "GN \uC785\uB825 \uBAA8\uB4DC", "gnMode", { manual: "\uC218\uB3D9 GN", equipment: "\uC120\uD0DD \uC7A5\uBE44 \uD45C" }, () => applyEquipment(this.plugin.state));
    this.number(fl, "\uC120\uD0DD \uD50C\uB798\uC2DC \uC90C (mm)", "zoom");
    this.number(fl, "ISO100 \xB7 \uCD5C\uB300 \uCD9C\uB825 GN", "gn");
    this.gnDisplayUnit = i.gnUnit;
    this.select(fl, "GN \uB2E8\uC704", "gnUnit", { m: "m \uAE30\uC900", ft: "ft \uAE30\uC900" }, () => {
      if (i.gnUnit !== this.gnDisplayUnit) {
        i.gn = i.gnUnit === "ft" ? metresToFeet(i.gn) : feetToMetres(i.gn);
        this.syncNumeric("gn");
        this.gnDisplayUnit = i.gnUnit;
      }
    });
    this.number(fl, "GN\uC774 \uCE21\uC815\uB41C \uC90C (mm)", "gnZoom");
    const conditions = this.text(fl, "GN \uCE21\uC815 \uC870\uAC74\xB7\uCD9C\uCC98 (ISO100 \uCD5C\uB300 \uCD9C\uB825)", i.conditions);
    conditions.dataset.key = "conditions";
    this.listen(conditions, "input", () => {
      this.plugin.update("conditions", conditions.value);
      this.changed();
    });
    this.number(fl, "\uAD11\uB7C9 \uBCF4\uC815 (EV)", "loss");
    const output = node(fl, "details");
    node(output, "summary", "\uCD9C\uB825 \uB2E8\uACC4 \uC9C1\uC811 \uC124\uC815");
    this.number(output, "\uC0AC\uC6A9\uC790 \uCD9C\uB825 1/n \xB7 n", "denominator");
    this.number(output, "\uC7A5\uBE44 \uCD5C\uC18C \uCD9C\uB825 1/n \xB7 n", "minDenominator");
    const steps = this.text(output, "\uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8 (\uC27C\uD45C \uAD6C\uBD84)", i.steps);
    steps.dataset.key = "steps";
    this.listen(steps, "input", () => {
      this.plugin.update("steps", steps.value);
      this.changed();
    });
    this.calibrationPanel(fl);
    this.fillPanel(fl);
  }
  saveControls() {
    const footer = node(this.root, "footer");
    this.saveStatus = node(footer, "p", void 0, "pfm-error");
    this.saveStatus.setAttribute("role", "status");
    this.retry = this.button(footer, "\uC124\uC815 \uB2E4\uC2DC \uC800\uC7A5", () => {
      void this.plugin.persist().then(() => this.plugin.flush()).catch((e) => this.plugin.reportSaveError(e));
    });
    this.retry.className = "pfm-retry";
    this.updateSaveStatus();
    const actions = node(footer, "div", void 0, "pfm-save-actions");
    const save = (label, action, className) => {
      const button = this.button(actions, label, () => {
        button.disabled = true;
        void action().catch((e) => this.plugin.report(e)).finally(() => {
          button.disabled = false;
        });
      });
      button.className = className;
    };
    save("\uB178\uD2B8\uB85C \uC800\uC7A5", () => this.plugin.saveNote(), "pfm-save");
    if (this.plugin.state.inputs.flashOn) save("\uCE58\uD2B8\uC2DC\uD2B8 \uC800\uC7A5", () => this.plugin.saveCheatsheet(), "pfm-cheatsheet-save");
  }
  paintZone(limits) {
    const i = this.plugin.state.inputs;
    const card = node(this.results, "div", void 0, "pfm-zone-result");
    node(card, "h2", "\uC874 \uD3EC\uCEE4\uC2F1");
    const goals = node(card, "div", void 0, "pfm-zone-goals");
    goals.setAttribute("role", "group");
    goals.setAttribute("aria-label", "\uC874 \uD3EC\uCEE4\uC2F1 \uBAA9\uD45C");
    for (const [goal, label] of [["infinity", "\u221E\uAE4C\uC9C0 \uC120\uBA85"], ["range", "\uAD6C\uAC04 \uC9C0\uC815"]]) {
      const button = this.button(goals, label, () => {
        if (i.zoneGoal === goal) return;
        this.plugin.update("zoneGoal", goal);
        this.render();
        this.root.querySelector(`[data-zone-goal=${goal}]`)?.focus({ preventScroll: true });
        void this.plugin.persist().catch((e) => this.plugin.reportSaveError(e));
        this.plugin.refresh(this);
      });
      button.dataset.zoneGoal = goal;
      button.setAttribute("aria-pressed", String(i.zoneGoal === goal));
    }
    if (i.zoneGoal === "infinity") {
      this.paintInfinity(card);
      return;
    }
    try {
      if (i.zoneNear < this.minimumFocus()) throw Error(`\uBAA9\uD45C \uADFC\uAC70\uB9AC\uB294 ${metres(this.minimumFocus())} \uC774\uC0C1\uC73C\uB85C \uC785\uB825\uD558\uC138\uC694.`);
      const zone = solveZone(i);
      node(card, "p", `\uBAA9\uD45C ${metres(zone.target.near)} ~ ${metres(zone.target.far)}`);
      if (!zone.possible) {
        node(card, "p", `\uB80C\uC988 \uCD5C\uC18C \uC870\uB9AC\uAC1C f/${fmt(zone.aperture)}\uC73C\uB85C\uB3C4 \uBD80\uC871 \xB7 \uC774\uB860\uC0C1 f/${fmt(zone.required, 2)} \uD544\uC694`, "pfm-error");
        return;
      }
      if (zone.cameraDistance < this.minimumFocus()) {
        node(card, "p", `\uD544\uC694\uD55C \uCD08\uC810 \uC704\uCE58 ${metres(zone.cameraDistance)}\uB294 \uB80C\uC988 \uCD5C\uB2E8 \uCD08\uC810\uAC70\uB9AC ${metres(this.minimumFocus())}\uBCF4\uB2E4 \uAC00\uAE5D\uC2B5\uB2C8\uB2E4.`, "pfm-error");
        return;
      }
      node(card, "strong", `f/${fmt(zone.aperture)} \xB7 ${metres(zone.cameraDistance)}`, "pfm-zone-solution");
      node(card, "p", `\uD544\uB984\uBA74 \uAE30\uC900 \uCD08\uC810 \xB7 ${limits && includesTarget(limits, zone.target) ? `\uC9C0\uAE08 \uC124\uC815(f/${fmt(i.aperture)})\uC774 \uBAA9\uD45C\uB97C \uB2F4\uC74C` : `\uC9C0\uAE08 \uC124\uC815(f/${fmt(i.aperture)} \xB7 ${i.focusInfinity ? "\u221E" : metres(i.cameraDistance)})\uC73C\uB85C\uB294 \uBD80\uC871 \xB7 \uC801\uC6A9\uD558\uBA74 \uBAA9\uD45C \uC804\uCCB4 \uC120\uBA85`}`);
      const apply = node(card, "button", "\uC774 \uC124\uC815 \uC801\uC6A9");
      apply.type = "button";
      apply.dataset.zoneApply = "true";
      apply.onclick = () => {
        this.plugin.update("cameraDistance", zone.cameraDistance);
        this.plugin.update("aperture", zone.aperture);
        this.syncNumeric("aperture");
        this.changed();
        this.results.querySelector("[data-zone-apply]")?.focus({ preventScroll: true });
      };
    } catch (e) {
      node(card, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
  }
  /** ∞까지 선명하게: 지금 조리개에서 거리링을 둘 위치(과초점)와 조리개별 표. */
  paintInfinity(card) {
    const i = this.plugin.state.inputs;
    try {
      const r = infinityFocus(i);
      const ringText = (d) => {
        const p = ringPosition(d);
        return p.on !== void 0 ? `\uB9C1 \uB208\uAE08 ${fmt(p.on)}` : `\uB9C1 \uB208\uAE08 ${fmt(p.between[0])}\uACFC ${p.between[1] === Infinity ? "\u221E" : fmt(p.between[1])} \uC0AC\uC774`;
      };
      node(card, "p", "\uAC70\uB9AC\uB9C1\uC744 \uC5EC\uAE30\uC5D0", "pfm-zone-eyebrow");
      node(card, "strong", metres(r.ring), "pfm-zone-solution");
      node(card, "p", `${ringText(r.ring)} \xB7 f/${fmt(r.aperture)}\uC774\uBA74 ${metres(r.near)}\uBD80\uD130 \u221E\uAE4C\uC9C0 \uC120\uBA85`);
      node(card, "p", `\uB80C\uC988 \uC2EC\uB3C4 \uB208\uAE08\uC744 \uC4F4\uB2E4\uBA74: \u221E \uD45C\uC2DC\uB97C f/${fmt(r.aperture)} \uB208\uAE08\uC120\uC5D0 \uB9DE\uCD94\uBA74 \uAC19\uC2B5\uB2C8\uB2E4.`, "pfm-zone-tip");
      const set = !i.focusInfinity && Math.abs(i.cameraDistance - r.ring) <= r.ring * 5e-3;
      const apply = node(card, "button", set ? "\uCD08\uC810\uC774 \uC5EC\uAE30\uC5D0 \uB9DE\uCDB0\uC838 \uC788\uC74C" : "\uCD08\uC810\uC744 \uC5EC\uAE30\uC5D0 \uB9DE\uCD94\uAE30");
      apply.type = "button";
      apply.dataset.zoneApply = "true";
      apply.disabled = set;
      apply.onclick = () => {
        this.plugin.update("focusInfinity", false);
        this.plugin.update("cameraDistance", r.ring);
        this.syncNumeric("cameraDistance");
        this.changed();
      };
      const table = node(card, "details", void 0, "pfm-ring-table");
      table.open = this.ringTableOpen;
      this.listen(table, "toggle", () => {
        this.ringTableOpen = table.open;
      });
      node(table, "summary", "\uC870\uB9AC\uAC1C\uBCC4 \uAC70\uB9AC\uB9C1 \uC704\uCE58");
      for (const aperture of this.apertureStops()) {
        const row = infinityFocus(i, aperture);
        const button = node(table, "button");
        button.type = "button";
        button.className = "pfm-ring-row";
        node(button, "span", `f/${fmt(aperture)}`);
        node(button, "strong", metres(row.ring));
        node(button, "span", `${metres(row.near)}~\u221E`);
        if (aperture === i.aperture) button.setAttribute("aria-current", "true");
        button.setAttribute("aria-label", `f/${fmt(aperture)}: \uAC70\uB9AC\uB9C1 ${metres(row.ring)}, ${metres(row.near)}\uBD80\uD130 \uBB34\uD55C\uB300\uAE4C\uC9C0 \uC120\uBA85. \uB204\uB974\uBA74 \uC774 \uC870\uB9AC\uAC1C\uB85C`);
        button.onclick = () => {
          this.plugin.update("aperture", aperture);
          this.syncNumeric("aperture");
          this.changed();
        };
      }
    } catch (e) {
      node(card, "p", e instanceof Error ? e.message : String(e), "pfm-error");
    }
  }
  equipmentPanel(parent) {
    const section = node(parent, "details");
    node(section, "summary", "\uC7A5\uBE44 \uD504\uB9AC\uC14B \xB7 \uC90C\uBCC4 GN \uD45C");
    const p = node(section, "div", void 0, "pfm-settings");
    const state = this.plugin.state;
    this.button(p, "FlashQ Q20III \uCD94\uAC00\xB7\uC120\uD0DD", () => {
      addQ20iii(state);
      this.changed();
      this.render();
      void this.plugin.flush().then(() => new import_obsidian.Notice("Q20III \uC120\uD0DD \xB7 \uACE0\uC815 32mm \uCEE4\uBC84\uB9AC\uC9C0 \xB7 \uC81C\uC870\uC0AC \uACF5\uCE6D GN20m")).catch((e) => this.plugin.reportSaveError(e));
    });
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
      const o = node(unit, "option", `GN \uB2E8\uC704 ${u}`);
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
  paintFlash() {
    const i = this.plugin.state.inputs;
    const flashPanel = node(this.results, "div", void 0, "pfm-flash-results");
    const equipment = selectedEquipment(this.plugin.state);
    if (i.gnMode === "equipment") node(flashPanel, "small", equipment ? `${equipment.name} \xB7 \uC0AC\uC6A9 \uAC00\uB2A5 \uC90C ${Object.keys(equipment.table).join(", ")}mm` : "\uC120\uD0DD \uC7A5\uBE44 \uC5C6\uC74C \xB7 \uC7A5\uBE44\uB97C \uC120\uD0DD\uD558\uAC70\uB098 \uC218\uB3D9 GN\uC73C\uB85C \uC804\uD658\uD558\uC138\uC694.");
    try {
      const f = flash(i);
      if (!f.supported) node(flashPanel, "p", f.powerLabel, "pfm-warning");
      node(flashPanel, "p", "\uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC", "pfm-eyebrow");
      const hero = node(flashPanel, "div", void 0, "pfm-hero");
      const display = distanceParts(f.d);
      node(hero, "span", display.value, "pfm-value");
      hero.append(document.createTextNode(" "));
      node(hero, "span", display.unit, "pfm-unit");
      node(flashPanel, "p", `1/${i.denominator} \xB7 f/${fmt(i.aperture)} \xB7 ISO ${fmt(i.iso, 0)} \xB7 ${equipment ? "GN" : "\uC218\uB3D9 GN"} ${fmt(f.g)}m (${fmt(i.zoom)}mm\xB7ISO100 \uCD5C\uB300) \xB7 ${i.linked ? "\uC628\uCE74\uBA54\uB77C" : "\uC624\uD504\uCE74\uBA54\uB77C"} \xB7 \uC9C1\uC811\uAD11\xB7\uC77C\uBC18 \uB3D9\uC870`);
      if (i.conditions.includes("\uC5F0\uC2B5\uC6A9 \uAC00\uC0C1 GN")) node(flashPanel, "small", "\uC5F0\uC2B5\uC6A9 GN \xB7 \uC2E4\uC81C \uC7A5\uBE44 \uC0AC\uC591 \uC544\uB2D8", "pfm-model-note");
      const label = f.ev > i.tolerance ? "\uC608\uC0C1 \uACFC\uB2E4 \uB178\uCD9C" : f.ev < -i.tolerance ? "\uC608\uC0C1 \uBD80\uC871 \uB178\uCD9C" : "\uD5C8\uC6A9 \uBC94\uC704 \uB0B4";
      node(flashPanel, "p", `${metres(f.r)}\uC5D0\uC11C ${f.ev > 0 ? "+" : ""}${fmt(f.ev)} EV \xB7 ${label}`, "pfm-ev").dataset.state = f.ev > i.tolerance ? "over" : f.ev < -i.tolerance ? "under" : "ok";
      const action = node(flashPanel, "div", void 0, "pfm-output-action");
      node(action, "p", `\uAD8C\uC7A5 \uC9C0\uC6D0 \uCD9C\uB825 1/${f.nearest} \xB7 \uC801\uC6A9 \uD6C4 \uB0A8\uB294 \uC624\uCC28 ${f.residual > 0 ? "+" : ""}${fmt(f.residual)} EV${f.status === "\uC7A5\uBE44 \uCD9C\uB825 \uBC94\uC704 \uC548" ? "" : ` \xB7 ${f.status}`}`);
      const apply = node(action, "button", i.denominator === f.nearest ? "\uAD8C\uC7A5 \uCD9C\uB825\uACFC \uAC19\uC74C" : `\uAD8C\uC7A5 \uCD9C\uB825 1/${f.nearest} \uC801\uC6A9`);
      apply.type = "button";
      apply.dataset.flashApply = "true";
      apply.disabled = i.denominator === f.nearest;
      apply.onclick = () => {
        this.applyOutput(f.nearest);
        this.root.querySelector("[data-flash-undo]")?.focus({ preventScroll: true });
      };
      if (this.outputUndo) {
        const before = this.outputUndo.before;
        const undo2 = node(action, "button", `\uAD8C\uC7A5 \uCD9C\uB825 \uC801\uC6A9 \uCDE8\uC18C \xB7 1/${before}\uB85C`);
        undo2.type = "button";
        undo2.dataset.flashUndo = "true";
        undo2.onclick = () => {
          this.outputUndo = void 0;
          this.plugin.update("denominator", before);
          this.syncNumeric("denominator");
          this.changed();
          this.root.querySelector("[data-flash-apply]")?.focus({ preventScroll: true });
        };
      }
      return f;
    } catch (e) {
      node(flashPanel, "p", "\uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC", "pfm-eyebrow");
      node(flashPanel, "div", "\u2014", "pfm-hero");
      node(flashPanel, "p", i.gnMode === "equipment" && !equipment ? "\uC120\uD0DD \uC7A5\uBE44\uB97C \uCC3E\uC744 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uB0B4 \uC7A5\uBE44\uC5D0\uC11C \uBCF5\uAD6C\uD558\uAC70\uB098 \uC7A5\uBE44\uB97C \uB2E4\uC2DC \uC120\uD0DD\uD558\uC138\uC694." : i.gnMode === "equipment" && i.gn <= 0 ? equipment?.table[String(i.zoom)] === void 0 ? `${fmt(i.zoom)}mm \uC90C\uC758 GN \uC790\uB8CC\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC774 \uC7A5\uBE44\uC758 \uC0AC\uC6A9 \uAC00\uB2A5 \uC90C: ${Object.keys(equipment?.table ?? {}).join(", ")}mm. \uD50C\uB798\uC2DC \uC90C \uB610\uB294 \uC7A5\uBE44 GN \uD45C\uB97C \uD655\uC778\uD558\uC138\uC694.` : i.conditions : !Number.isFinite(i.gn) || i.gn <= 0 ? "\uC218\uB3D9 GN\uC774 \uBE44\uC5C8\uAC70\uB098 0 \uC774\uD558\uC785\uB2C8\uB2E4. ISO100 \uCD5C\uB300 \uCD9C\uB825 GN\uC744 \uC785\uB825\uD558\uC138\uC694." : e instanceof Error ? e.message : String(e), "pfm-error");
      const disabled = node(flashPanel, "button", "\uAD8C\uC7A5 \uCD9C\uB825 \uC801\uC6A9 \uBD88\uAC00");
      disabled.type = "button";
      disabled.disabled = true;
      disabled.dataset.flashApply = "true";
      disabled.className = "pfm-error-action";
      const fix = node(flashPanel, "button", i.gnMode === "equipment" && i.gn <= 0 ? equipment ? "\uC7A5\uBE44 \uC90C\xB7GN \uD655\uC778" : "\uC7A5\uBE44 \uC120\uD0DD \uD655\uC778" : "\uD50C\uB798\uC2DC \uC870\uAC74 \uD655\uC778");
      fix.type = "button";
      fix.className = "pfm-error-action";
      fix.onclick = () => this.jumpSettings("flash");
    }
  }
  paint() {
    const i = this.plugin.state.inputs;
    this.root.dataset.cocMode = i.cocMode;
    this.root.dataset.linked = String(i.linked);
    const coc = this.numeric.get("coc");
    if (coc) coc.input.disabled = i.cocMode !== "custom";
    const far = this.numeric.get("zoneFar");
    if (far) far.input.disabled = i.zoneInfinity;
    this.paintGear();
    this.results.replaceChildren();
    if (this.outputUndo && this.outputUndo.applied !== i.denominator) this.outputUndo = void 0;
    let flashResult;
    if (i.flashOn) {
      this.syncFlashControls();
      flashResult = this.paintFlash();
      this.paintCalibration();
      this.paintFill();
    }
    let focusLimits, focusError = "";
    try {
      focusLimits = optics(i);
    } catch (e) {
      focusError = e instanceof Error ? e.message : String(e);
    }
    if (i.zoneOn) this.paintZone(focusLimits);
    else this.paintDepth(focusLimits, focusError);
    const safe = i.flashOn && i.linked ? safeShootingRange(true, focusLimits, flashResult) : void 0;
    if (safe) node(this.results, "p", safeRangeText(safe), "pfm-safe-range").dataset.state = safe.kind;
    for (const pair of this.numeric.values()) pair.updateControls(focusLimits);
    let shown = i, shownLimits = focusLimits;
    if (i.zoneOn && i.zoneGoal === "infinity") {
      try {
        const r = infinityFocus(i);
        shown = { ...i, zoneNear: r.near, zoneInfinity: true, cameraDistance: r.ring, focusInfinity: false };
        shownLimits = optics(shown);
      } catch {
      }
    }
    this.sceneMax = this.dragMax ?? sceneUpperLimit(shown, shownLimits?.far);
    diagram(this.picture, shown, this.sceneMax, shownLimits, flashResult, safe);
  }
  syncFlashControls() {
    const i = this.plugin.state.inputs;
    this.syncPower();
    for (const direction of ["weaker", "stronger"]) {
      const button = this.powerButtons[direction];
      if (button) button.disabled = nextPower(i, direction) === void 0;
    }
    if (this.linkToggle) {
      this.linkToggle.textContent = i.linked ? "\uD50C\uB798\uC2DC \uAC70\uB9AC \uC5F0\uB3D9 \xB7 \uC628\uCE74\uBA54\uB77C" : "\uD50C\uB798\uC2DC \uAC70\uB9AC \uB3C5\uB9BD \xB7 \uC624\uD504\uCE74\uBA54\uB77C";
      this.linkToggle.setAttribute("aria-pressed", String(i.linked));
    }
    const distance = this.numeric.get("flashDistance");
    if (distance) {
      distance.input.disabled = i.linked;
      if (distance.range) distance.range.disabled = i.linked;
    }
    for (const key of ["gn", "gnZoom", "minDenominator"])
      if (document.activeElement !== this.numeric.get(key)?.input) this.syncNumeric(key);
    for (const key of ["gnMode", "gnUnit", "conditions", "steps"]) {
      const control = this.root.querySelector(`[data-key=${key}]`);
      if (control && document.activeElement !== control) control.value = i[key];
    }
    this.gnDisplayUnit = i.gnUnit;
  }
  paintDepth(limits, error) {
    const card = node(this.results, "div", void 0, "pfm-dof-results");
    node(card, "h2", "\uC120\uBA85\uD558\uAC8C \uB098\uC624\uB294 \uAC70\uB9AC");
    if (!limits) {
      node(card, "p", error, "pfm-error");
      return;
    }
    const range = node(card, "div", void 0, "pfm-dof-range");
    for (const [key, label, value] of [["near", "\uC2DC\uC791", limits.near], ["far", "\uB05D", limits.far]]) {
      const stat = node(range, "div", void 0, "pfm-stat");
      stat.dataset.stat = key;
      node(stat, "span", label);
      node(stat, "strong", metres(value));
      if (key === "near") node(range, "span", "\u2014", "pfm-dof-dash");
    }
    const total = node(card, "p", void 0, "pfm-stat pfm-dof-total");
    total.dataset.stat = "total";
    node(total, "span", "\uBC94\uC704 ");
    node(total, "strong", metres(limits.total));
    const bar = node(card, "div", void 0, "pfm-dof-bar");
    const focus = node(bar, "button", Number.isFinite(limits.hyperfocal) ? `\u221E\uAE4C\uC9C0 \uC120\uBA85\uD558\uAC8C \xB7 ${metres(limits.hyperfocal)}\uC5D0 \uB9DE\uCD94\uAE30` : "\u221E\uAE4C\uC9C0 \uC120\uBA85\uD558\uAC8C");
    focus.type = "button";
    focus.dataset.pfmHyperfocal = "true";
    focus.dataset.stat = "hyperfocal";
    focus.setAttribute("aria-label", Number.isFinite(limits.hyperfocal) ? `\uACFC\uCD08\uC810 ${metres(limits.hyperfocal)}\uC5D0 \uB9DE\uCD94\uAE30: \uC57D ${metres(limits.hyperfocal / 2)}\uBD80\uD130 \uBB34\uD55C\uB300\uAE4C\uC9C0 \uC120\uBA85` : "\uACFC\uCD08\uC810\uC5D0 \uB9DE\uCD94\uAE30");
    focus.onclick = () => {
      this.focusHyperfocal();
      this.results.querySelector("[data-pfm-hyperfocal]")?.focus({ preventScroll: true });
    };
  }
};

// src/note.ts
var limitations = "\uD544\uB984 \uCE74\uBA54\uB77C(Nikon FM2) \uAE30\uC900: \uD50C\uB798\uC2DC \uB3D9\uC870\uB294 \uC154\uD130 1/250\uCD08 \uC774\uD558(FM2n, \uCD08\uAE30 FM2\uB294 1/200\uCD08)\uC774\uBA70 TTL\xB7HSS\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4. \uC218\uB3D9 \uD50C\uB798\uC2DC\xB7\uC9C1\uC811\uAD11\xB7\uC77C\uBC18 \uB3D9\uC870\xB7\uC911\uC2EC\uBD80 \uB178\uCD9C\uC758 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC810\uAD11\uC6D0 \uC5ED\uC81C\uACF1 \uADFC\uC0AC\uC774\uBA70 \uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0\uC5D0\uB294 \uBD80\uC801\uC808\uD569\uB2C8\uB2E4. \uC2E4\uC81C \uBC30\uAD11\xB7\uBC18\uC0AC\uC728\xB7\uD658\uACBD\uAD11\xB7\uC7A5\uBE44 \uD3B8\uCC28\uB97C \uD3EC\uD568\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. TTL, HSS, \uBC14\uC6B4\uC2A4, \uC18C\uD504\uD2B8\uBC15\uC2A4, \uADFC\uAC70\uB9AC \uB300\uD615 \uAD11\uC6D0\uC740 \uC774 \uAE30\uBCF8 \uBAA8\uB378\uB85C \uD655\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uC190\uC2E4 \uBCF4\uC815\uC740 \uCD94\uC815\uC774\uBA70 GN\uC5D0 \uC774\uBBF8 \uD3EC\uD568\uB41C \uC190\uC2E4\uC744 \uC911\uBCF5 \uC801\uC6A9\uD558\uC9C0 \uB9C8\uC138\uC694.";
function localDateTime(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${String(date.getFullYear()).padStart(4, "0")}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}
function noteTimestamp(date) {
  return localDateTime(date).replace("T", " ").replace(/:/g, "-");
}
function frontmatter(properties) {
  const lines = ["---"];
  for (const [key, value] of Object.entries(properties)) {
    if (value === void 0 || typeof value === "number" && !Number.isFinite(value)) continue;
    const scalar = typeof value === "string" ? JSON.stringify(value).replace(/[\x7f-\x9f\u2028\u2029\ufeff]/g, (char) => "\\u" + char.charCodeAt(0).toString(16).padStart(4, "0")) : String(value);
    lines.push(`${key}: ${scalar}`);
  }
  return [...lines, "tags: [photo-field]", "---", ""].join("\n");
}
var positiveProperty = (value) => Number.isFinite(value) && value > 0 ? value : void 0;
var rounded = (value, digits = 2) => Number(value.toFixed(digits));
var distanceProperty = (value) => value === Infinity ? "inf" : Number.isFinite(value) && value > 0 ? rounded(value) : void 0;
var tableCell = (value) => value.replace(/\|/g, "\\|").replace(/[\r\n]+/g, " / ");
function modeNoteScope(i) {
  return i.flashOn ? i.zoneOn ? "all" : "combined" : i.zoneOn ? "zone" : "dof";
}
function presetProperties(i, context) {
  const film = context?.film;
  return { camera: context?.camera?.name, lens: context?.lens?.name, film: film?.name, film_type: film?.type, film_iso: film?.iso, ei: film ? positiveProperty(i.iso) : void 0 };
}
function cheatsheetNote(i, date, context) {
  const { gn, rows } = flashCheatsheet(i);
  const equipment = context.equipment?.name ?? "\uC218\uB3D9 GN";
  const properties = frontmatter({
    type: "cheatsheet",
    date: localDateTime(date),
    plugin_version: context.version,
    focal_mm: i.focal,
    iso: i.iso,
    gn,
    equipment,
    zoom_mm: i.zoom,
    aperture: i.aperture,
    flash_power: `1/${i.denominator}`,
    loss_ev: i.loss,
    ...presetProperties(i, context)
  });
  const ev = (value) => {
    const display = fmt(value);
    return `${value > 0 && display !== "0" ? "+" : ""}${display} EV`;
  };
  const lines = [
    "# \uAC70\uB9AC\uBCC4 \uCD2C\uC601 \uCE58\uD2B8\uC2DC\uD2B8",
    "",
    `\uCD08\uC810\uAC70\uB9AC ${fmt(i.focal)} mm \xB7 ISO ${fmt(i.iso)} \xB7 ISO100 \uCD5C\uB300\uCD9C\uB825 GN ${fmt(gn)} m \xB7 ${tableCell(equipment)} \xB7 \uD50C\uB798\uC2DC \uC90C ${fmt(i.zoom)} mm`,
    `\uD604\uC7AC \uC870\uB9AC\uAC1C f/${fmt(i.aperture)} \xB7 \uD604\uC7AC \uCD9C\uB825 1/${i.denominator} \xB7 \uAD11\uB7C9 \uBCF4\uC815 ${ev(i.loss)}`,
    "\uAC01 \uD589\uC758 \uAC70\uB9AC\uB97C \uCE74\uBA54\uB77C \uCD08\uC810 \uAC70\uB9AC\uC640 \uD50C\uB798\uC2DC\u2013\uD53C\uC0AC\uCCB4 \uAC70\uB9AC\uC5D0 \uAC01\uAC01 \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uB0A8\uB294 \uC624\uCC28\uAC00 \uC591\uC218\uBA74 \uC608\uC0C1 \uACFC\uB2E4, \uC74C\uC218\uBA74 \uC608\uC0C1 \uBD80\uC871\uC785\uB2C8\uB2E4.",
    "",
    "| \uAC70\uB9AC | \uD604\uC7AC \uC870\uB9AC\uAC1C\uC5D0\uC11C \uC9C0\uC6D0 \uCD9C\uB825 \xB7 \uC624\uCC28 | \uD604\uC7AC \uCD9C\uB825\uC5D0\uC11C \uD544\uC694 \uC870\uB9AC\uAC1C \u2192 \uD480\uC2A4\uD1B1 \xB7 \uC624\uCC28 | \uD604\uC7AC \uC870\uB9AC\uAC1C\uC758 \uC2EC\uB3C4 |",
    "| --- | --- | --- | --- |",
    ...rows.map((row) => {
      const range = row.power.range === "below" ? " \xB7 \uCD5C\uC18C \uCD9C\uB825\uC73C\uB85C\uB3C4 \uACFC\uD568" : row.power.range === "above" ? " \xB7 \uCD5C\uB300 \uCD9C\uB825\uC73C\uB85C\uB3C4 \uBD80\uC871" : "";
      const depth = row.depth ? `${metres(row.depth.near)} ~ ${metres(row.depth.far)}` : `\uACC4\uC0B0 \uBD88\uAC00 \xB7 ${tableCell(row.depthError ?? "")}`;
      return `| ${metres(row.distance)} | 1/${row.power.nearest} \xB7 ${ev(row.power.residual)}${range} | f/${fmt(row.requiredAperture)} \u2192 f/${fmt(row.aperture)} \xB7 ${ev(row.apertureEV)} | ${depth} |`;
    })
  ];
  return properties + "\n" + lines.join("\n") + "\n";
}
function validateNote(i, scope = "all") {
  if (scope !== "flash") optics(i);
  if ((scope === "zone" || scope === "all" && i.zoneOn) && i.zoneFlow === "target") solveZone(i);
  if (scope !== "dof" && scope !== "zone") flash(i);
  if (scope === "all" || scope === "combined") coverage(i);
}
function note(i, date = /* @__PURE__ */ new Date(), context) {
  const scope = context?.scope ?? "all";
  const properties = {
    date: localDateTime(date),
    plugin_version: context?.version ?? "\uAC1C\uBC1C/\uBBF8\uC9C0\uC815",
    scope,
    format: sensors[i.sensor]?.name ?? "\uC0AC\uC6A9\uC790 \uC9C0\uC815",
    focal_mm: positiveProperty(i.focal),
    aperture: positiveProperty(i.aperture),
    iso: positiveProperty(i.iso),
    focus_m: i.focusInfinity ? "inf" : distanceProperty(i.cameraDistance),
    ...presetProperties(i, context)
  };
  const lines = ["# \uC0AC\uC9C4 \uCD2C\uC601 \uACC4\uC0B0", `
\uB0A0\uC9DC: ${date.toISOString()} (${date.toLocaleString("ko-KR")}, \uAE30\uAE30 \uD604\uC9C0 \uC2DC\uAC01)`];
  lines.push(`\uC800\uC7A5 \uBC94\uC704: ${scope === "zone" ? "\uC874 \uD3EC\uCEE4\uC2F1 (\uD50C\uB798\uC2DC \uC81C\uC678)" : scope === "dof" ? "\uC2EC\uB3C4\xB7\uD654\uAC01 (\uD50C\uB798\uC2DC\xB7\uC870\uC0AC \uBC94\uC704 \uC81C\uC678)" : scope === "flash" ? "\uD50C\uB798\uC2DC (\uC2EC\uB3C4\xB7\uC870\uC0AC \uBC94\uC704 \uC81C\uC678)" : scope === "combined" ? "\uD1B5\uD569 (\uC804\uCCB4 \uACC4\uC0B0)" : "\uC804\uCCB4 \uACC4\uC0B0"}`);
  lines.push(`\uD50C\uB7EC\uADF8\uC778 \uBC84\uC804: ${context?.version ?? "\uAC1C\uBC1C/\uBBF8\uC9C0\uC815"}`, `GN \uC785\uB825 \uBAA8\uB4DC: ${i.gnMode === "equipment" ? "\uC7A5\uBE44 \uD45C" : "\uC218\uB3D9 GN"}`, `\uC120\uD0DD \uC7A5\uBE44: ${context?.equipment?.name ?? "\uC5C6\uC74C \xB7 \uC218\uB3D9 GN"}`, `\uC7A5\uBE44 \uCD9C\uCC98: ${context?.equipment?.source ?? "GN \uC870\uAC74 \uCC38\uC870"}`);
  lines.push("\n## \uC785\uB825\uAC12\n", "| \uD56D\uBAA9 | \uAC12 |", "| --- | --- |");
  const labels = { gnMode: "GN \uBAA8\uB4DC", equipmentId: "\uC7A5\uBE44 ID (\uC218\uB3D9 \uBAA8\uB4DC\uC5D0\uC11C\uB294 \uC801\uC6A9 \uC548 \uD568)", sensor: "\uD544\uB984\xB7\uD3EC\uB9F7 \uD504\uB9AC\uC14B", width: "\uD504\uB808\uC784 \uAC00\uB85C mm", height: "\uD504\uB808\uC784 \uC138\uB85C mm", focal: "\uC2E4\uC81C \uCD08\uC810\uAC70\uB9AC mm", aperture: "\uC870\uB9AC\uAC1C f/", iso: "\uD544\uB984 \uAC10\uB3C4 ISO", cameraDistance: "\uCE74\uBA54\uB77C \uAC70\uB9AC", focusInfinity: "\uBB34\uD55C\uB300 \uCD08\uC810 (\uCF1C\uBA74 \uCE74\uBA54\uB77C \uAC70\uB9AC\uB294 \uB9C8\uC9C0\uB9C9 \uC720\uD55C\uAC12 \uBCF4\uC874)", linked: "\uC628\uCE74\uBA54\uB77C \uC5F0\uB3D9", flashDistance: "\uBCC4\uB3C4 \uD50C\uB798\uC2DC \uAC70\uB9AC", cocMode: "CoC \uBC29\uC2DD", coc: "\uC0AC\uC6A9\uC790 CoC mm", gn: "ISO100 \uCD5C\uB300 \uCD9C\uB825 GN", gnUnit: "GN \uB2E8\uC704", gnZoom: "GN \uCE21\uC815 \uC90C mm", zoom: "\uC120\uD0DD \uD50C\uB798\uC2DC \uC90C mm", conditions: "GN \uC870\uAC74", denominator: "\uCD9C\uB825 1/n\uC758 n", loss: "\uCD94\uAC00 \uC190\uC2E4 stop", tolerance: "\uD5C8\uC6A9 \uC624\uCC28 \xB1EV", minDenominator: "\uCD5C\uC18C \uCD9C\uB825 1/n\uC758 n", steps: "\uC9C0\uC6D0 \uCD9C\uB825 \uBD84\uBAA8", coverage: "\uC870\uC0AC\uAC01 \uBC29\uC2DD (approx=35mm \uD504\uB808\uC784 \uAC00\uC815)", horizontal: "\uC9C1\uC811 \uC785\uB825 \uC218\uD3C9 \uC870\uC0AC\uAC01 \xB0", vertical: "\uC9C1\uC811 \uC785\uB825 \uC218\uC9C1 \uC870\uC0AC\uAC01 \xB0", mode: "\uBC1C\uAD11 \uC870\uAC74", diagramMax: "\uADF8\uB9BC \uCD5C\uB300 \uAC70\uB9AC", tab: "\uD654\uBA74", cropBasis: "35mm \uD658\uC0B0 \uAE30\uC900", zoneFlow: "\uC874 \uD750\uB984", zoneNear: "\uBAA9\uD45C \uADFC\uAC70\uB9AC", zoneFar: "\uBAA9\uD45C \uC720\uD55C \uC6D0\uAC70\uB9AC (\uBB34\uD55C\uB300 \uC120\uD0DD \uC2DC \uBBF8\uC0AC\uC6A9)", zoneInfinity: "\uBAA9\uD45C \uC6D0\uAC70\uB9AC \uBB34\uD55C\uB300", apertureMin: "\uB80C\uC988 \uCD5C\uB300 \uAC1C\uBC29 f\uAC12", apertureMax: "\uB80C\uC988 \uCD5C\uC18C \uAC1C\uBC29 f\uAC12", apertureSteps: "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uC2E4\uC81C \uC870\uB9AC\uAC1C \uB2E8\uACC4" };
  const opticalKeys = /* @__PURE__ */ new Set(["sensor", "width", "height", "focal", "aperture", "cameraDistance", "focusInfinity", "cocMode", "coc", "tab", "cropBasis"]);
  const flashKeys = /* @__PURE__ */ new Set(["gnMode", "equipmentId", "aperture", "iso", "linked", "cameraDistance", "focusInfinity", "flashDistance", "gn", "gnUnit", "gnZoom", "zoom", "conditions", "denominator", "loss", "tolerance", "minDenominator", "steps", "mode", "tab"]);
  const distanceKeys = /* @__PURE__ */ new Set(["cameraDistance", "flashDistance", "zoneNear", "zoneFar", "diagramMax"]);
  const zoneKeys = /* @__PURE__ */ new Set(["zoneFlow", "zoneNear", "zoneFar", "zoneInfinity", "apertureMin", "apertureMax", "apertureSteps"]);
  for (const key of Object.keys(labels)) {
    if ((scope === "dof" || scope === "zone") && !opticalKeys.has(key) && !(scope === "zone" && zoneKeys.has(key))) continue;
    if (scope === "flash" && !flashKeys.has(key)) continue;
    const unused = key === "flashDistance" && i.linked || key === "cameraDistance" && scope === "flash" && !i.linked || key === "coc" && i.cocMode !== "custom" || ["horizontal", "vertical"].includes(key) && i.coverage === "approx" || key === "zoneFar" && i.zoneInfinity;
    const value = unused ? "\uBBF8\uC0AC\uC6A9" : key === "cameraDistance" && i.focusInfinity ? "\u221E (\uBB34\uD55C\uB300 \uCD08\uC810)" : distanceKeys.has(key) ? metres(i[key]) : i[key];
    lines.push(`| ${labels[key]} | ${String(value).replace(/\|/g, "\\|").replace(/\n/g, " / ")} |`);
  }
  lines.push("\n## \uACC4\uC0B0 \uACB0\uACFC\n", "\uBAA8\uB4E0 \uAC70\uB9AC\uB294 \uC18C\uC218 \uCCAB\uC9F8 \uC790\uB9AC\uAE4C\uC9C0\uB9CC \uD45C\uC2DC\uD558\uACE0 1m \uC774\uD558\uB294 cm\uB85C \uC790\uB3D9 \uD45C\uC2DC\uD569\uB2C8\uB2E4. \uB0B4\uBD80 \uC800\uC7A5 \uAC12\uACFC \uACC4\uC0B0\uC740 \uBC18\uC62C\uB9BC\uD558\uC9C0 \uC54A\uC73C\uBA70 \uD45C\uC2DC \uC22B\uC790\uB9CC \uBC18\uC62C\uB9BC\uD569\uB2C8\uB2E4. \uD3EC\uD568\xB7\uCD9C\uB825 \uACBD\uACC4\xB7\uB178\uCD9C \uD310\uC815\uC740 \uBC18\uC62C\uB9BC \uC804 \uAC12\uC774\uBBC0\uB85C \uAC19\uC740 \uD45C\uC2DC \uC22B\uC790\uB77C\uB3C4 \uD310\uC815\uC774 \uB2E4\uB97C \uC218 \uC788\uC2B5\uB2C8\uB2E4.");
  let flashResult, depthResult;
  if (scope !== "dof" && scope !== "zone") {
    properties.equipment = i.gnMode === "equipment" ? context?.equipment?.name ?? "manual" : "manual";
    try {
      const f = flashResult = flash(i);
      Object.assign(properties, { flash_gn: rounded(f.gn), flash_power: `1/${i.denominator}`, flash_distance_m: distanceProperty(f.r), flash_ev: rounded(f.ev) });
      lines.push(`- \uC120\uD0DD \uCD9C\uB825 1/${i.denominator}: **${f.powerLabel}**`, `- \uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC: ${metres(f.d)}`, `- \uD50C\uB798\uC2DC\u2013\uD53C\uC0AC\uCCB4 \uAC70\uB9AC: ${metres(f.r)} \xB7 \uB178\uCD9C \uCC28\uC774: ${fmt(f.ev)} EV (${f.ev > 0 ? "\uC608\uC0C1 \uACFC\uB2E4" : f.ev < 0 ? "\uC608\uC0C1 \uBD80\uC871" : "\uAE30\uC900 \uC801\uC815"})`, `- \uC720\uD6A8 GN(m): ${fmt(f.gn)}`, `- \xB1${i.tolerance}EV \uAC70\uB9AC \uAD6C\uAC04: ${metres(f.low)} ~ ${metres(f.high)}`, `- \uD544\uC694\uD55C \uC870\uB9AC\uAC1C f/${fmt(f.requiredAperture)} \xB7 \uD544\uC694 \uCD9C\uB825 ${fmt(f.needed * 100)}% \xB7 ${f.status}`, `- \uAD8C\uC7A5 \uC9C0\uC6D0 \uB2E8\uACC4 1/${f.nearest} \xB7 \uD574\uB2F9 \uB2E8\uACC4 \uC608\uC0C1 \uAC70\uB9AC ${metres(f.nearestDistance)}, \uB0A8\uB294 \uB178\uCD9C \uC624\uCC28 ${fmt(f.residual)} EV`);
      lines.push("\n### \uCD9C\uB825\uBCC4 \uAC70\uB9AC\n", "| \uCD9C\uB825 | \uC801\uC815 \uB178\uCD9C \uC608\uC0C1 \uAC70\uB9AC |", "| --- | --- |", ...f.distances.map((x) => `| 1/${x.n} | ${metres(x.d)} |`));
    } catch (e) {
      lines.push(`- \uD50C\uB798\uC2DC \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  try {
    const o = depthResult = optics(i);
    Object.assign(properties, { coc_mm: rounded(o.c, 5), dof_near_m: distanceProperty(o.near), dof_far_m: distanceProperty(o.far), hyperfocal_m: distanceProperty(o.hyperfocal) });
    if (scope === "zone" && i.zoneFlow === "current") Object.assign(properties, { zone_near_m: properties.dof_near_m, zone_far_m: properties.dof_far_m });
    if (scope !== "flash") lines.push(`
- \uC2EC\uB3C4 \uADFC\uAC70\uB9AC ${metres(o.near)} / \uC6D0\uAC70\uB9AC ${metres(o.far)} / \uC804\uCCB4 ${metres(o.total)}`, `- \uACFC\uCD08\uC810\uAC70\uB9AC ${metres(o.hyperfocal)} \xB7 CoC ${fmt(o.c, 5)} mm`, `- \uC218\uD3C9/\uC218\uC9C1/\uB300\uAC01 \uD654\uAC01 ${fmt(o.horizontal)}\xB0 / ${fmt(o.vertical)}\xB0 / ${fmt(o.diagonal)}\xB0`, `- \uC2E4\uCE58\uC218 \uB300\uAC01 \uAE30\uC900 35mm \uD658\uC0B0 \uCD08\uC810\uAC70\uB9AC ${fmt(o.equivalent)} mm`, `- \uD68C\uC808 Airy \uC9C0\uB984 (\uD30C\uC7A5 550nm) ${fmt(o.airy, 5)} mm, CoC \uB300\uBE44 ${fmt(o.airy / o.c)}\uBC30 (\uADFC\uC0AC)`);
  } catch (e) {
    if (scope !== "flash") lines.push(`- \uAD11\uD559 \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (scope === "all" || scope === "combined") {
    const safe = safeShootingRange(i.linked, depthResult, flashResult);
    lines.push(`- ${safeRangeText(safe)}`);
    if (safe.kind === "range") Object.assign(properties, { safe_near_m: safe.near, safe_far_m: safe.far });
  }
  if (scope !== "flash") try {
    const e = equivalence(i);
    lines.push(`
## 35mm \uD658\uC0B0
- ${e.basis} ${fmt(e.crop, 4)}\xD7 \xB7 \uC2E4\uCE58\uC218 \uB300\uAC01 \uACC4\uC218 ${fmt(e.dimensional, 4)}\xD7`, `- \uC2E4\uC81C ${fmt(i.focal)}mm f/${fmt(i.aperture)} \u2192 35mm \uD654\uAC01 \uD658\uC0B0 ${fmt(e.focal)}mm \xB7 \uC2EC\uB3C4 \uB300\uC751 \uC57D f/${fmt(e.aperture)}`, "- \uC2E4\uC81C \uB178\uCD9C \uC870\uB9AC\uAC1C\uB294 \uADF8\uB300\uB85C\uC785\uB2C8\uB2E4. \uAC19\uC740 \uC704\uCE58\xB7\uAD6C\uB3C4\xB7\uBE44\uAD50 \uAC10\uC0C1 \uC870\uAC74\uC758 \uADFC\uC0AC\uC774\uBA70 \uADFC\uC811 \uCD2C\uC601\xB7\uBE0C\uB9AC\uB529\xB7\uD654\uBA74\uBE44 \uCC28\uC774\uB294 \uBBF8\uBC18\uC601.", i.cocMode === "custom" ? "- \uC0AC\uC6A9\uC790 \uC9C0\uC815 CoC: \uC815\uD655\uD55C \uC2EC\uB3C4 \uC77C\uCE58 \uC544\uB2D8." : i.cocMode === "film" ? "- CoC\uB294 35mm \uD544\uB984 0.03mm(\uB2C8\uCF58 DOF \uB208\uAE08 \uAD00\uB840)\uB97C \uD504\uB808\uC784 \uB300\uAC01\uC5D0 \uBE44\uB840\uD574 \uD658\uC0B0. 35mm \uCABD CoC\uB3C4 \uAC19\uC740 \uAC10\uC0C1 \uAE30\uC900\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4." : "- CoC\uB294 \uD504\uB808\uC784 \uB300\uAC01/1500. 35mm CoC\uB3C4 \uB300\uC751\uC2DC\uCF1C \uBE44\uAD50\uD574\uC57C \uD569\uB2C8\uB2E4. \uBA85\uBAA9/\uC2E4\uCE58\uC218 \uCC28\uC774 \uC874\uC7AC.");
    if (i.zoneFlow === "target") {
      const r = solveZone(i);
      if (scope === "zone" || scope === "all" && i.zoneOn) Object.assign(properties, { zone_near_m: distanceProperty(r.target.near), zone_far_m: distanceProperty(r.target.far) });
      lines.push("\n## \uC874 \uD3EC\uCEE4\uC2F1 \uC5ED\uC0B0", `- \uBAA9\uD45C ${metres(r.target.near)} ~ ${metres(r.target.far)}`, `- ${r.possible ? "\uC81C\uC548 \uAC00\uB2A5" : "\uB2EC\uC131 \uBD88\uAC00 \xB7 \uC870\uB9AC\uAC1C \uC81C\uD55C"}: \uCD08\uC810 \uB9DE\uCD9C \uAC70\uB9AC ${metres(r.cameraDistance)}, \uC2E4\uC81C f/${fmt(r.aperture)}`, `- \uC81C\uC548 \uAC80\uC0B0 ${metres(r.actual.near)} ~ ${metres(r.actual.far)} \xB7 \uC774\uB860 \uD544\uC694 f/${fmt(r.required, 4)}`);
    }
    lines.push("- \uC5ED\uC0B0 \uAC00\uC815: \uBAA9\uD45C a,b\uB294 \uD544\uB984\uBA74 \uAE30\uC900. \uC720\uD55C \uAD6C\uAC04\uC740 \uB80C\uC988 \uAE30\uC900 \uD55C\uACC4 a\u2032=a\u2212v, b\u2032=b\u2212v (v=f\xB7s/(s\u2212f))\uC5D0\uC11C s=2a\u2032b\u2032/(a\u2032+b\u2032)\uB97C \uBC18\uBCF5\uD574 \uD480\uACE0, h=(2a\u2032b\u2032\u2212f(a\u2032+b\u2032))/(b\u2032\u2212a\u2032), N=f\xB2/(c\xB7h). \uBB34\uD55C\uB300\uB294 (h+f)/2+f(h+f)/h=a\uB97C \uD480\uBA70 \uC801\uC6A9 \uCD08\uC810\uC740 \uACFC\uCD08\uC810 \uB208\uAE08. \uC2E4\uC81C \uC0AC\uC6A9 \uB2E8\uACC4 \uC911 \uAC00\uC7A5 \uAC1C\uBC29\uB41C \uC870\uB9AC\uAC1C\uBD80\uD130 \uAE30\uC874 \uC2EC\uB3C4 \uC5D4\uC9C4\uC73C\uB85C \uC7AC\uAC80\uC0B0. CoC \uD5C8\uC6A9 \uBC94\uC704\uC774\uBA70 \uC808\uB300 \uC120\uBA85\uB3C4 \uACBD\uACC4 \uC544\uB2D8.");
  } catch (e) {
    lines.push(`- \uC874/\uD658\uC0B0 \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (scope === "all" || scope === "combined") try {
    const c = coverage(i);
    lines.push(`- \uCE74\uBA54\uB77C \uD504\uB808\uC784 ${metres(c.camera.width)} \xD7 ${metres(c.camera.height)} (\uCD08\uC810 \uB9DE\uCD98 \uD3C9\uBA74)`, `- \uD50C\uB798\uC2DC \uC870\uC0AC \uBC94\uC704 ${metres(c.flash.width)} \xD7 ${metres(c.flash.height)} (\uD50C\uB798\uC2DC \uAC70\uB9AC \uD3C9\uBA74)`, `- \uC870\uC0AC\uAC01 ${fmt(c.h)}\xB0 \xD7 ${fmt(c.v)}\xB0 \xB7 ${i.coverage === "approx" ? "35mm \uD504\uB808\uC784 \uCEE4\uBC84\uB9AC\uC9C0 \uAC00\uC815, \uC81C\uC870\uC0AC \uC0AC\uC591 \uC544\uB2D8" : "\uC218\uB3D9 \uC785\uB825 \uC870\uC0AC\uAC01"}`, `- ${i.linked ? c.narrow ? "\uD504\uB808\uC784 \uAC00\uC7A5\uC790\uB9AC \uAD11\uB7C9 \uBD80\uC871 \uAC00\uB2A5\uC131" : "\uB3D9\uC77C \uC704\uCE58\xB7\uBC29\uD5A5 \uAC00\uC815\uC758 \uBC94\uC704 \uBE44\uAD50" : "\uC624\uD504\uCE74\uBA54\uB77C: \uC704\uCE58\xB7\uBC29\uD5A5 \uBBF8\uC785\uB825, \uACF5\uAC04 \uC911\uCCA9 \uBE44\uAD50 \uBD88\uAC00"}`);
  } catch (e) {
    lines.push(`- \uC870\uC0AC \uBC94\uC704 \uACC4\uC0B0 \uBD88\uAC00: ${e instanceof Error ? e.message : String(e)}`);
  }
  lines.push(
    "\n## \uC870\uAC74\uACFC \uD55C\uACC4\n",
    limitations,
    "\uBE5B\uC740 \uC608\uC0C1 \uAC70\uB9AC\uC5D0\uC11C \uB05D\uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uAC00\uAE4C\uC6B0\uBA74 \uACFC\uB2E4 \uB178\uCD9C\uB420 \uC218 \uC788\uC2B5\uB2C8\uB2E4. CoC(\uD544\uB984 0.03mm \uB610\uB294 \uD504\uB808\uC784 \uB300\uAC01/1500)\uB294 \uAC10\uC0C1 \uD06C\uAE30\xB7\uC2DC\uB825\xB7\uD655\uB300\uC728\uC5D0 \uC758\uC874\uD558\uB294 \uACBD\uD5D8\uC801 \uCD94\uC815\uC785\uB2C8\uB2E4. \uC9C1\uC120\uD22C\uC601 \uBC15\uB9C9\uB80C\uC988 \uBAA8\uB378\uC774\uBA70 \uADFC\uC811 \uCD2C\uC601\xB7\uD3EC\uCEE4\uC2A4 \uBE0C\uB9AC\uB529\xB7\uB3D9\uACF5 \uBC30\uC728\uC740 \uBC18\uC601\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
    "\n## \uACF5\uC2DD\n",
    "\uC720\uD6A8 GN = G\u221Ap\u221A(ISO/100) \xD7 2^(\u2212L/2), d = \uC720\uD6A8 GN/N, \uD544\uC694 p = (Nr/G)\xB2(100/ISO)2^L, EV = 2log\u2082(d/r).",
    "H=f\xB2/(N\xB7CoC)+f, h=H\u2212f, \uB80C\uC988 \uAE30\uC900 \uADFC\uAC70\uB9AC h\xB7s/(h+s\u2212f), \uC6D0\uAC70\uB9AC h\xB7s/(h\u2212s+f); s\u2265H\uC774\uBA74 \uC6D0\uAC70\uB9AC \u221E. \uD45C\uC2DC\uD558\uB294 \uBAA8\uB4E0 \uAC70\uB9AC\uB294 \uB80C\uC988 \uAC70\uB9AC \uB208\uAE08\uACFC \uAC19\uC740 \uD544\uB984\uBA74 \uAE30\uC900\uC785\uB2C8\uB2E4: \uCD08\uC810 \uAC70\uB9AC D=s+v, v=f\xB7s/(s\u2212f), \uADFC\xB7\uC6D0\uAC70\uB9AC\uC640 \uACFC\uCD08\uC810\uC5D0\uB3C4 \uAC19\uC740 v\uB97C \uB354\uD569\uB2C8\uB2E4. \uAD11\uD559 \uAE38\uC774\uB294 mm\uB85C \uD1B5\uC77C \uD6C4 m\uB85C \uD45C\uC2DC. \uB4F1\uBC30\uBCF4\uB2E4 \uAC00\uAE4C\uC6B4 \uC811\uC0AC(D<4f)\uB294 \uACC4\uC0B0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4. \uD654\uAC01\uC740 \uBB34\uD55C\uB300 \uCD08\uC810 \uAE30\uC900\uC774\uBA70 \uD504\uB808\uC784 \uD06C\uAE30\uB294 \uD544\uB984 \uD06C\uAE30\xF7\uBC30\uC728\uC785\uB2C8\uB2E4.",
    "\n## \uCD9C\uCC98\n",
    "\uC2EC\uB3C4\xB7\uD654\uAC01 \uD45C\uD604\uC758 \uAE30\uBC18: [depth-of-field](https://github.com/jherr/depth-of-field), Jack Herrington, Copyright (c) 2026 Jack Herrington, MIT. \uCC38\uACE0 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. \uBAA8\uBC14\uC77C\uC6A9 \uC7AC\uAD6C\uD604\xB7\uC218\uC815 \uBC0F \uD50C\uB798\uC2DC \uD655\uC7A5. \uACF5\uC2DD\xB7\uD6C4\uC6D0 \uD50C\uB7EC\uADF8\uC778\uC774 \uC544\uB2D9\uB2C8\uB2E4.",
    "[\uB80C\uC988 \uACB0\uC0C1\xB7\uCC29\uB780\uC6D0 MIT](https://people.csail.mit.edu/fredo/comp-photo-book/02-fundamentals-03-lens-image-formation.html) \xB7 [\uD654\uAC01 Edmund Optics](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/understanding-focal-length-and-field-of-view/) \xB7 [Airy \uC9C0\uB984 Edmund Optics](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/limitations-on-resolution-and-contrast-the-airy-disk/) \xB7 [GN \uAE30\uBCF8 \uAD00\uACC4 Nikon](https://download.nikonimglib.com/archive2/rOYAB007rd7k028ePIg11W7lyc97/SB-500_CH%28En%2904.pdf)"
  );
  return frontmatter(properties) + "\n" + lines.join("\n") + "\n";
}

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
    const data = await this.loadData();
    this.state = restore(data);
    this.stableInputs = { ...this.state.inputs };
    this.active = true;
    this.writer = new LatestWriter((data2) => verifiedWrite(data2, () => this.saveData(data2), () => this.app.vault.adapter.read((0, import_obsidian2.normalizePath)(`${this.manifest.dir ?? `${this.app.vault.configDir}/plugins/${this.manifest.id}`}/data.json`))), () => {
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
    this.addCommand({ id: "save-note", name: "\uB178\uD2B8\uB85C \uC800\uC7A5", callback: () => {
      void this.saveNote().catch((e) => this.report(e));
    } });
    this.addCommand({ id: "save-cheatsheet", name: "\uD604\uC7AC \uC7A5\uBE44\uB85C \uAC70\uB9AC\uBCC4 \uCE58\uD2B8\uC2DC\uD2B8 \uC800\uC7A5", callback: () => {
      void this.saveCheatsheet().catch((e) => this.report(e));
    } });
    this.addRibbonIcon("camera", "\uC0AC\uC9C4 \uCD2C\uC601 \uB3C4\uC6B0\uBBF8 \uC5F4\uAE30", () => {
      void this.open().catch((e) => this.report(e));
    });
    const inputs = data && typeof data === "object" && "inputs" in data ? data.inputs : void 0;
    if (inputs && typeof inputs === "object" && (!("flashOn" in inputs) || typeof inputs.flashOn !== "boolean" || !("zoneOn" in inputs) || typeof inputs.zoneOn !== "boolean")) void this.persist().catch((e) => this.reportSaveError(e));
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
  saveNote() {
    const i = { ...this.state.inputs }, equipment = selectedEquipment(this.state), date = /* @__PURE__ */ new Date();
    const scope = modeNoteScope(i);
    i.zoneFlow = i.zoneOn ? "target" : "current";
    try {
      validateNote(i, scope);
      return this.writeNote(note(i, date, { version: this.manifest.version, equipment, scope, ...this.notePresets() }), date, "\uCD2C\uC601 \uACC4\uC0B0");
    } catch (e) {
      return Promise.reject(e);
    }
  }
  async saveCheatsheet() {
    const i = { ...this.state.inputs }, equipment = selectedEquipment(this.state), date = /* @__PURE__ */ new Date();
    return this.writeNote(cheatsheetNote(i, date, { version: this.manifest.version, equipment, ...this.notePresets() }), date, "\uAC70\uB9AC\uBCC4 \uCE58\uD2B8\uC2DC\uD2B8");
  }
  notePresets() {
    return { camera: selectedPreset(this.state, "cameras"), lens: selectedPreset(this.state, "lenses"), film: selectedPreset(this.state, "films") };
  }
  writeNote(content, date, title) {
    const task = this.notes.catch(() => void 0).then(async () => {
      const folder = (0, import_obsidian2.normalizePath)("\uC0AC\uC9C4 \uCD2C\uC601 \uACC4\uC0B0");
      if (!this.app.vault.getAbstractFileByPath(folder)) try {
        await this.app.vault.createFolder(folder);
      } catch (e) {
        if (!(this.app.vault.getAbstractFileByPath(folder) instanceof import_obsidian2.TFolder)) throw e;
      }
      if (!(this.app.vault.getAbstractFileByPath(folder) instanceof import_obsidian2.TFolder)) throw Error("\uC800\uC7A5 \uD3F4\uB354 \uACBD\uB85C\uC5D0 \uD30C\uC77C\uC774 \uC788\uC2B5\uB2C8\uB2E4. \uB2E4\uB978 \uC774\uB984\uC73C\uB85C \uC62E\uACA8\uC8FC\uC138\uC694.");
      const base = `${folder}/${title} ${noteTimestamp(date)}`;
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
    updateShootingInput(this.state, key, value);
    if (key === "zoom") applyEquipment(this.state);
    if (["gn", "gnZoom", "conditions", "steps", "minDenominator"].includes(key) && this.state.inputs.gnMode === "equipment") {
      this.state.inputs.gnMode = "manual";
    }
  }
  setFocusInfinity(on) {
    this.state.inputs.focusInfinity = on;
  }
  onunload() {
    this.active = false;
    this.noteNotice?.hide();
    void this.flush().catch((e) => this.reportSaveError(e));
    for (const leaf of this.app.workspace.getLeavesOfType(VIEW)) if (leaf.view instanceof PhotoView) leaf.view.dispose();
  }
};
