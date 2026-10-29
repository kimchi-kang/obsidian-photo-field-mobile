# macOS Obsidian 모바일 에뮬레이션 검사 시도 · 2026-10-29

**결과: 실행 환경 차단으로 화면·터치 검사는 미완료. 빌드, 자동53개, 실제 번들 코드 통합15개 통과. 제품 수정 없음.**

기준 `6fe771e`, 버전1.2.0, 시작 작업 트리 깨끗함. Codex 공통 AGENTS.md, preparation/Bauhaus/후속 검증 보고서 및 VALIDATION·COMPATIBILITY·MIGRATION을 확인했다. 바우하우스 디자인과 기존 입력·탭 저장·초안·저장 병합 수정을 보존했다. 재현한 새 제품 문제가 없으므로 계산·UI·데이터 형식을 변경하지 않았다.

최신 사용자 지시에 따라 **iOS 화면 기준의 macOS Obsidian 모바일 에뮬레이션만** 수행한다. 실기 검사는 제외하고 새 앱·도구·패키지를 설치하지 않는다. [에뮬레이션 전용 범위와 현재 제한](IOS-CHECKLIST.md)을 반영했다. 재연결도 CDP EPERM으로 실패했으며 새 에뮬레이션 통과 항목은 없다.

## 환경 구성과 차단 근거

1. MIA의 기존 환경 기록을 조사했다. `../candidate-install-qa-2026-10-27/paths.json`, `isolated-launch.log`, `native-observer.cjs`에는 별도 앱·프로필·보관함, 실행 시 전용 보관함 검사 및 설치 번들 해시 확인이 있다. 이 기록의 기능 테스트·장비·사용자 데이터를 사진 도우미로 복사하지 않았다.
2. MIA의 `MOBILE-UI-QA.md`, `MOBILE-QA.md`와 `../release-audit-2026-10-20/run-56/run-mobile.mjs`는 별도 브라우저 호스트 검사였다. 이것을 실제 Obsidian 모바일 실행 근거로 쓰지 않았다. 조사한 MIA 파일에서 native CDP 모바일 설정 스크립트는 발견하지 못했다. 사진 도우미에는 이미 정확한 실행 방식이 `tests/mobile.mjs`, `scene.mjs`, `swipe.mjs`, `preparation.mjs`, `bauhaus.mjs`에 존재한다.
3. 기존 `tests/setup-qa.mjs`로 `/private/tmp/photo-field-qa-vault`와 `/private/tmp/photo-field-qa-profile`을 준비하고 현재 main.js·manifest.json·styles.css를 테스트 플러그인 폴더에 복사했다. 두 경로의 실제 경로도 같은 전용 임시 경로임을 확인했다. 실사용 보관함으로의 링크가 아니다.
4. 별도 프로필을 지정한 일반 앱 실행은 `NSOSStatusErrorDomain -10827 / kLSNoExecutableErr`, 실행 파일 직접 시작은 종료134로 실패했다. 기존 앱은 종료하지 않았다.
5. Playwright의 포트9338 연결은 `connect EPERM 127.0.0.1:9338 - Local (0.0.0.0:0)`로 실패했다. 단순히 포트가 닫혔다고 단정하지 않는다. 현재 실행 환경에서 연결 권한 자체가 거부됐다. 권한 확대·다른 포트 탐색·대체 중계는 하지 않았다.
6. 컴퓨터 사용 도구는 이번에는 앱 목록과 창을 읽을 수 있었다. 열린 Obsidian은 **실사용 다용도 보관함**이므로 조작하지 않았다. 이번 차단 원인은 ‘Mac 잠김’이 아니다.

예정 구성은 실제 Obsidian ItemView + `app.emulateMobile(true)` + CDP `Emulation.setDeviceMetricsOverride`의 `mobile:true, deviceScaleFactor:1` + `Emulation.setTouchEmulationEnabled` 및 `Input.dispatchTouchEvent`다. **이번에는 해당 설정을 실제 적용하지 못했다.** 별도 HTML·창 너비 축소·과거 캡처로 대체하지 않았다. 구체적인 실행 결과는 [environment.json](environment.json).

## 화면 및 조작별 판정

| 단계 | 대상 | 이번 상태 |
| --- | --- | --- |
| 1 | 통합·플래시·심도 탭과 장면 | 미검증: 실제 테스트 ItemView 접근 불가 |
| 2 | 빠른 조절·상세 설정·스크롤 위치 | 미검증 |
| 3 | 장비 선택·추가·편집·삭제 되돌리기 | 화면 미검증. 코드 수준 장비·초안 복원은 통과 |
| 4 | 빈 입력·GN 누락·이론 출력·긴 문구·저장 실패 | 화면 미검증. 유효성·저장 실패 코드 검사 통과 |
| 5 | 피사체 터치 드래그·슬라이더·세로 스크롤 | 미검증 |
| 6 | 좌우/가장자리 스와이프 차단·일반 노트 원래 제스처 | 미검증 |
| 7 | GN40.5·중간 수정·전체 삭제·포커스/선택 범위 | UI 미검증. 기존 회귀 테스트는 수정하지 않음 |
| 8 | 빠른 탭 전환·닫기/재진입·설정 펼침 유지 | UI 미검증. 플러그인 수명주기 코드 검사 통과 |
| 9 | 현재 탭/전체 계산 저장·실제 Markdown | API 대역과 임시 파일시스템에서 통과. Obsidian 화면 연결은 미검증 |
| 10 | 360×800·390×844·430×932·844×390, 라이트/다크 | 모두 이번 화면 검사 미검증 |
| 11 | 큰 글씨·축소 높이·터치 영역·겹침·대비·CSS 범위 | 화면 미검증. 기존 정적 대비·CSS 범위 검사 통과 |

새 스크린샷0장. 따라서 이번 수정 전후 화면 비교도 없다. 과거 Bauhaus 캡처는 이번 증거로 재사용하지 않았다. 실제 iOS·Android, 네이티브 키보드·OS 뒤로가기·노치도 미검증이며 이번 범위에서 기기를 탐색하지 않았다.

## 실행한 독립 검사

- `npm run build`: strict 타입 검사와 실제 main.js 생성 통과. 결과 번들은 시작 커밋과 바이트 동일.
- `npm test`: **53/53 통과**, 실패·제외0. [실행 출력](unit-tests.txt).
- `node tests/post-design-integration.mjs`: **15/15 통과**. 실제 main.js를 실행하지만 Obsidian API는 경계 대역이며 DOM·실제 앱 검사가 아니다. [상세 결과](bundle-integration.json).
- GN40/ISO100/f4 최대10m·1/4출력5m·거리2배−2EV, 조리개 동시 계산·고정GN 초점거리 독립성, 오프카메라 거리, 유한 심도/무한대 구분, 미사용 빈 값/활성 오류, 유효 심도만 저장 및 전체 오류 거부 확인.
- 임시 파일시스템의 Markdown12개 동시 저장·기존 파일 보존, 실패 후 재시도,121개 저장 요청→1회 쓰기·마지막13.9 보존, 실패 시 마지막 저장 상태 유지, pagehide 처리,20회 unload/load 후 리스너/타이머 정리, v1 원본·장비·수동값 마이그레이션과 초안 복원 확인. 강제 종료 시 완전 보장이라는 뜻이 아니다.
- API1.7.4 최소 선언 유지. 기존 API/앱 코드 근거와 실제1.7.4 실행은 구분하며 이번에도1.7.4 런타임은 미검증.

## 파일·후보·보존

제품 파일·의존성·공개 버전 변경 없음. [시작/최종 파일 해시](start-and-final.json)에서 main.js·manifest.json·styles.css·package·주요 UI 소스가 기준 커밋과 동일함을 확인했다. 수정 전 상태는 그대로이므로 제품 복구 작업은 필요 없다. 기존 보고서의 통합 결과는 보존하고 이번 실행 결과만 이 폴더에 별도로 저장했다.

기존 로컬 설치 후보 `dist/photo-field-mobile-1.2.0-post-design-qa-74d3303.zip`의 플러그인6개 파일이 현재 파일과 바이트 동일한지 다시 검사했다. 원본 라이선스·고지 포함, data.json·보관함·개인 노트 없음. 후보에 적힌 ‘새 시각 QA 차단’ 조건은 여전히 유효하다. 파일명74d3303은 이전 후보 기준 이름이며 현재 검사 기준은6fe771e다. 새 제품 수정이 없어 중복 ZIP은 만들지 않았다. [ZIP 재검사](existing-package-verification.json).

실사용 파일·설정·설치 변경, 공개 배포·push·릴리스, 일괄 종료·강제 종료, 신규 도구 설치·권한 확대·실기 연결은 수행하지 않았다.

## 실행 환경에서 다시 확인할 항목

추가 승인 대기 없이 가능한 검사는 위 범위까지 완료했다. 모바일 UI 완료 판정을 내리려면 전용 프로필 앱 실행과 로컬 CDP 연결이 허용되는 실행 환경이 필요하다. 이후에는 먼저 페이지의 `app.vault.adapter.basePath`가 전용 테스트 경로인지 검사하고, 기존 mobile/scene/swipe/stabilization/preparation/bauhaus 스크립트를 사용한다. 430×932와 축소 높이도 추가 실행하고 각 주요 화면을 직접 캡처·열람해야 한다. 앱 전체 종료나 실사용 보관함 변경은 필요 없다.

실기에서만 가능한 네이티브 키보드·OS 뒤로가기·노치/안전영역은 macOS 에뮬레이션 검사 후에도 별도 미검증으로 남는다.
