import {Equipment} from './model';
import {positive,powerSteps} from './engine';
import {feetToMetres} from './units';
export function parseTable(text:string,unit:'m'|'ft'):Record<string,number> {
  const table:Record<string,number>={};
  for(const row of text.trim().split('\n')) {const parts=row.split(',').map(v=>Number(v.trim()));
    if(parts.length!==2)throw Error('각 줄은 줌mm,GN 형식이어야 합니다.');
    const [zoom,gn]=parts;positive(zoom,gn);if(String(zoom) in table)throw Error('줌 위치가 중복되었습니다.');table[String(zoom)]=unit==='ft'?feetToMetres(gn):gn;
  }return table;
}
export function equipmentValid(p:Equipment):boolean {
  try {if(!p.name.trim()||!p.conditions.trim()||!p.source.trim()||!Object.keys(p.table).length)return false;
    for(const [z,g] of Object.entries(p.table))positive(Number(z),g);
    positive(p.minDenominator);powerSteps(p.steps,p.minDenominator);return true;
  }catch{return false;}
}
