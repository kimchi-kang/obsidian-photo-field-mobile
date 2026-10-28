# 원본 분석 및 변경 내역

확인일: 2026-10-28 (KST). 실제 저장소를 clone하여 고정한 SHA: `c75dd6d40e4a96e96fd38e57657fe4b9737bf776`.
원본: https://github.com/jherr/depth-of-field / Jack Herrington.
`LICENSE.txt`: MIT, `Copyright (c) 2026 Jack Herrington`. 원문을 `vendor/depth-of-field-LICENSE.txt`에 그대로 보관하고 배포 ZIP 및 THIRD_PARTY_NOTICES에도 포함한다.

## 실제 조사 대상

- `src/App.tsx`: React 상태·CoC·환산초점거리·과초점·심도·회절·화각과 입력 UI. 전체 파일 및 의존 함수 확인.
- `src/PhotographyGraphic.tsx`: React/SVG 장면, 드래그 피사체와 여러 인물·동물의 긴 인라인 SVG 경로. 계산·화각 원뿔 표시 흐름 확인. 그림 최대 360 inch.
- `src/utils/units.ts`: inch를 ft/in 또는 cm로 표시. 새로운 계산에서는 m·mm를 단일 기준으로 사용.
- `src/selectStyles.ts`, CSS: Chakra와 테마 기반 웹 전용 구성. Obsidian 네이티브 입력과 테마 변수로 대체.
- `package.json`, `package-lock.json`: React, ReactDOM, Chakra UI, Emotion, Framer Motion, react-icons. 직접 런타임 의존성의 잠금 버전·라이선스 및 전체 전이 라이선스 목록은 `dependency-license-audit.json`에 기록.
- `src/assets/fishey.png`, `src/assets/100-400.png`, `public/vite.svg`, 인라인 인물/동물 SVG: 개별 출처·사용권 또는 상표 사용 조건을 별도로 확증할 자료가 저장소에 없음. 재사용하지 않음. 폰트 파일도 가져오지 않음.

## 원본과 신규 코드 구분

| 원본 파일 | 이번 배포의 대응 | 재사용 범위·주요 변경 |
| --- | --- | --- |
| LICENSE.txt | vendor/depth-of-field-LICENSE.txt | **원문 그대로 복사**, SHA256은 감사 JSON에 기록 |
| App.tsx | src/engine.ts | 광학 공식·CoC 경험칙의 의미를 참고한 새 구현. 원본 UI 코드 복사 없음. 일관된 박막렌즈 모델, 과초점 경계 및 유한값 보존으로 수정 |
| PhotographyGraphic.tsx | src/diagram.ts | 화각·심도 시각화 발상 참고. React/SVG 경로 코드 복사 없음. 1.1.0에서 촬영자·피사체·원뿔·심도 장면과 드래그/네 카드/빠른 조절 순서를 복원. 새 단순 SVG 기호·독립 플래시 축·빗금·숫자 표시 |
| utils/units.ts | src/units.ts | 신규 작성. m↔ft 및 숫자 파싱/표시, 광학 mm 분리 |
| selectStyles.ts, CSS, main.tsx | src/view.ts, main.ts, styles.css | 신규 Obsidian ItemView·명령·한글 UI, 테마 변수, 모바일 CSS |
| 해당 없음 | presets.ts, storage.ts, note.ts 및 engine.ts 플래시 부분 | 신규 GN 모델, 줌별 장비 표, loadData/saveData, Vault API Markdown 저장 |
| 해당 없음 | tests/, build.mjs, 문서 | 신규 검증·빌드·배포 자료 |

원본의 실행 코드나 자산 파일을 통째로 재사용하지 않는다. 원본의 계산·표현 방식을 수정·재구현한 부분은 보수적으로 MIT 원저작권 고지를 유지한다. 원작자의 공식 플러그인이나 후원 프로젝트가 아니다.

## 확인된 계산 차이

원본은 `H=f²/(Nc)+f`를 계산하면서 근/원거리 식에는 H 자체를 사용하고, 360 inch 초과 원거리를 ∞로 간주한다. 이번 구현은 h=H−f를 근/원거리 양쪽에 사용한다. 독립적인 박막렌즈 결상식으로 두 심도 경계의 착란원 지름이 입력 CoC와 일치하는지 검사한다. s=H에서 원거리 ∞, 근거리 H/2를 검증한다. 그림의 최대 거리는 오직 좌표 클램프에 사용하며 실제 결과를 바꾸지 않는다.

## 배포 의존성 감사

빌드 메타데이터의 입력은 `src/*.ts` 10개뿐이며 외부 import는 호스트 `obsidian`뿐이다. React/Chakra/Emotion/Framer Motion/react-icons와 그 전이 의존성은 배포하지 않는다. 런타임 Node/Electron/fs/path, CDN, fetch, 원격 폰트, 분석 추적 없음. SVG의 `http://www.w3.org/2000/svg`는 네임스페이스이며 네트워크 요청이 아니다. README·정보 링크는 사용자가 누를 때만 외부 문서를 연다.

원본 직접 의존성은 모두 MIT metadata를 갖고 있으며, 원본 개발/전이 도구에는 ISC, BSD, Apache-2.0, Python-2.0, CC-BY-4.0, 0BSD 및 이중 라이선스가 있다. 이를 일괄 MIT라고 취급하지 않았다. 이번에 그 코드를 배포하지 않으므로 해당 실행 코드의 고지가 추가로 필요한 형태로 재사용되지 않는다.
