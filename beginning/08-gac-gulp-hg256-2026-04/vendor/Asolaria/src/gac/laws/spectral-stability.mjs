import { createRequire } from "module";

const require = createRequire(import.meta.url);
const cjs = require("./spectral-stability.js");

export const LAW_ID = cjs.LAW_ID;
export const DEFAULT_MAX_LOOPS = cjs.DEFAULT_MAX_LOOPS;
export const SPECTRAL_STABILITY_LAW = cjs.SPECTRAL_STABILITY_LAW;
export const evaluateSpectralStability = cjs.evaluateSpectralStability;

export default SPECTRAL_STABILITY_LAW;
