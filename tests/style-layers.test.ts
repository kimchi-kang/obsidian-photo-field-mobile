import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const css=readFileSync('styles.css','utf8');
// 뉴모피즘 층에서 이 세 요소를 마지막으로 꾸미는 규칙(벌브 종료 반전) 바로 뒤부터 검사한다.
const marker='.pfm-root[data-bulb-ended=true] .pfm-bulb-countdown{outline:0;';
const layer=css.indexOf(marker);

test('뉴모피즘 층 뒤의 옛 규칙이 안전 구간·보조광·벌브 카운트다운 모양을 다시 덮지 않는다',()=>{
  assert.ok(layer>0);
  const after=css.slice(css.indexOf('}',layer)+1);
  const rules=[...after.matchAll(/([^{}]+)\{([^}]*)\}/g)].map(m=>({selector:m[1].trim(),body:m[2]}));
  for(const {selector,body} of rules){
    if(/\.pfm-safe-range|\.pfm-fill(?![-\w])/.test(selector))assert.doesNotMatch(body,/border:1px|background:/,selector);
    if(/\.pfm-bulb-countdown/.test(selector))assert.doesNotMatch(body,/background:|outline:/,selector);
  }
});
