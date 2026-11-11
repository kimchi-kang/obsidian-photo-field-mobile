import {defaults} from '../src/model';
import type {Inputs} from '../src/model';
/** Pre-film-baseline reference inputs (ISO 100, diagonal/1500 CoC). Numeric reference tests keep these so their expected values stay verifiable. */
export const digitalDefaults:Inputs={...defaults,iso:100,cocMode:'estimate',coc:0.029};
