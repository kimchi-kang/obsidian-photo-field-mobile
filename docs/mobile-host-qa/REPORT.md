# macOS Obsidian 모바일 에뮬레이션 검증 · 2026-10-29

**검사 완료: 실제 플러그인 ItemView 시나리오69개 통과, 자동53개 통과. 새 제품 버그 미발견·제품 코드 수정 없음.**

사용자가 권한이 필요한 실행을 명시적으로 허용한 뒤 전용 Obsidian 실행과 로컬 CDP 연결이 승인되어 이전 제한을 해소했다. 새 앱·도구·패키지를 설치하지 않았다. 기준6fe771e, 버전1.2.0, 시작 제품 작업 트리 깨끗함. 이전 턴의 보고서 초안 변경을 보존했다. Codex AGENTS와 프로젝트 검증·디자인 문서를 확인했으며, 바우하우스 방향·GN 커서 수정·초안·탭 저장·저장 병합을 유지했다.

## 실제 사용 환경

- 기존 macOS Obsidian, 별도 사용자 프로필 `/private/tmp/photo-field-qa-profile`, 전용 보관함 `/private/tmp/photo-field-qa-vault`, CDP9338.
- 연결된 페이지의 `app.vault.adapter.basePath`가 전용 경로인지 먼저 확인. 테스트 데이터는 합성 데이터만 사용.
- 실제 설치된 main.js·manifest.json·styles.css와 Obsidian ItemView 사용. `app.emulateMobile(true)` 적용.
- CDP 모바일 메트릭 `mobile:true, deviceScaleFactor:1`; 터치 활성화 및 `Input.dispatchTouchEvent`의 touchStart/Move/End 사용. 일부 UI 조작은 Playwright 클릭/키 입력 사용.
- 360×800·390×844·430×932·844×390, 라이트·다크. 추가390×534·430×600·844×260에서20px CSS 글씨/축소 높이 검사.
- iOS 화면 크기를 기준으로 한 **macOS Obsidian 모바일 에뮬레이션**이다. iOS WKWebView·실제 키보드·노치·OS 뒤로가기는 검사하지 않았으며 실기를 요구하지 않는다. Android는 범위 밖.

권한 제한 당시 기록은 [초기 시도](blocked-attempt.md)에 보존. 현재 환경은 [environment.json](environment.json)의 resolved에 구분했다.

## 화면별 결과

| 단계 | 화면/동작 | 결과·관찰 | 대표 캡처 |
| --- | --- | --- | --- |
| 1 | 통합 | 통과. 촬영 장면 우선, 심도·화각·플래시 패턴 및 거리/EV 표시 구분 | screenshots/390-844-light-combined.png |
| 2 | 플래시 | 통과. 예상 거리·EV 우선. 직접광·일반 동조·수동/장비 조건 표시 | screenshots/390-844-dark-flash.png |
| 3 | 심도·화각 | 통과. 장면·4개 심도 수치, 플래시 미지원이어도 유효 심도 유지 | screenshots/360-800-light-dof.png |
| 4 |430px·가로 | 통과. 가로 넘침 없음. 가로 화면의 큰 장면과 아래 결과는 세로 스크롤로 접근해야 함 | screenshots/430-932-dark-combined.png,844-390-light-dof.png |
| 5 | 빠른 조절·상세 설정 | 통과. 보이는 조작부44px 이상. 상세 설정 접을 때 검사한 위치에서 스크롤 변화3px 미만 | screenshots/expanded-camera.png,expanded-gn.png |
| 6 | 장비 추가·선택·편집·삭제 되돌리기 | 통과. 긴 입력값은 단일 행 입력 내부에서 편집 가능하며 외부 레이아웃을 밀지 않음. 긴 출력 설명은 줄바꿈 | screenshots/equipment-add.png,equipment-edit.png,equipment-delete-undo.png |
| 7 | 빈 GN·GN 자료 없음 | 통과. 거리 결과는 —, 오류 문구 표시. 이전 GN으로 계산하지 않음 | screenshots/blank-gn.png,missing-gn.png |
| 8 | 미지원 출력·긴 저장 오류 | 통과. 이론값 및 장비 미지원 구분, 긴 오류 줄바꿈. 실패 후 실제 재시도도 통과 | screenshots/long-name-theoretical.png,long-save-error.png |
| 9 | 큰 글씨·축소 높이·저장 버튼 | 통과. 두 저장 버튼을 스크롤해 노출한 뒤 elementFromPoint로 실제 터치 중앙이 버튼에 닿는지 확인. 도구막대에 가려지지 않음 | screenshots/390-534-light-large-footer.png |
| 10 | 일반 노트·앱 도구막대 | 통과. 플러그인 CSS를 켜고 끌 때 측정한 일반 노트·제목·문단·앱 바의 계산 스타일 동일. 일반 노트 사이드바 제스처 유지 | screenshots/ordinary-note.png |

이번에 생성한 대표 캡처를 직접 열어 통합·플래시·심도·430px·가로·큰 글씨·설정·추가/편집/삭제·빈 입력·자료 없음·이론 출력·긴 오류·일반 노트를 확인했다. 정상 스크롤 중 Obsidian의 떠 있는 도구막대가 화면 아래 콘텐츠 위를 지나가지만, 조작부를 가림 없이 스크롤해 접근할 수 있다. 가로 화면에서 장면을 한 화면에 강제로 축소하지 않았다. 모든 행/상태를 한 번에 보여 준다는 의미는 아니다.

## 조작·계산·저장 회귀

- GN40.5 입력·40.25 중간 삽입·전체 삭제/재입력·거리/CoC 소수와 포커스/스크롤 유지 통과.
- 피사체 마우스/실제 CDP 터치 드래그→거리/심도/플래시 동기화. 슬라이더·세로 스크롤 통과. 좌우·가장자리 스와이프로 계산 화면 사이드바가 열리지 않고, 일반 노트에서는 원래 제스처 작동. 보호를 제거한 대조군에서는 실제 사이드바가 열림.
- GN40m·ISO100·f/4 최대10m·1/4출력5m, 거리2배−2EV, 조리개 동시 갱신, 고정 GN의 초점거리 독립성, 과초점/무한대·그림 밖 유한 심도 구분 통과.
- 장비 생성/선택/정확줌/없는줌/이론 출력, 오프카메라 독립 거리·별도 축·공간 중첩 한계 설명, 화면/실제 Markdown/재활성화 후 입력 일치 통과.
- 유효 심도만 탭 저장, 불완전 전체 계산 거부, 잘못된 활성 입력과 미사용 빈 입력 구분, 오프라인 계산·실제 Vault Markdown 생성 통과.
- 12개 동시 노트 저장·같은 시각 이름 충돌 회피·기존 노트 보존, 저장 실패 후 재시도, 반복 저장·탭 전환·닫기/재진입·프리셋 초안·삭제 되돌리기·마이그레이션 보존 통과.
- 실제 앱에서120회 변경은121회 결과 갱신·1회 디스크 쓰기로 합쳐졌고 마지막13.9 저장. 측정은 paint109ms·전체125ms(주입 쓰기 지연10ms). 전체 화면 재생성이 아니라 기존 결과 갱신이며 이 수치를 iPhone 성능으로 해석하지 않는다.
- pagehide/visibility 이벤트의 저장 처리와 실패 상태/명시적 재시도 검사 통과. 실제 OS 백그라운드 전환이나 강제 종료 중 저장 완전 보장을 검사한 것은 아니다.
- 관련 화면 검사에서 미처리 예외 없음. 대역 통합 검사에서는20회 플러그인 수명주기 후 리스너/타이머 누적 없음.

## 검사 수와 재현 자료

| 실행 | 통과 |
| --- | ---: |
| tests/mobile.mjs |17 |
| tests/scene.mjs |10 |
| tests/swipe.mjs |6 |
| tests/stabilization.mjs |14 |
| tests/preparation.mjs |10 |
| tests/bauhaus.mjs |6 |
| tests/mobile-host-qa.mjs (신규 화면 범위) |5 |
| tests/note-style-qa.mjs (신규 CSS 격리 검사) |1 |
| 실제 Obsidian 합계 |69 |
| npm test |53 |
| npm run build |성공 |
| 실제 번들 + Obsidian API 대역 통합 |15 |

현재 실행의 원시 결과/출력은 [runs](runs/), 새 보강 검사 [emulation-results.json](emulation-results.json), CSS 비교 [note-style-result.json](note-style-result.json), 자동 검사 [unit-tests.txt](unit-tests.txt), 대역 검사 [bundle-integration.json](bundle-integration.json). 과거 검사 결과/스크린샷은 덮어쓴 상태로 남기지 않고 이번 폴더로 분리 보존했다.

신규 장비 화면 검사의 첫 실행은 필수 측정 조건을 입력하지 않고 생성 후 장비를 선택하지도 않아 편집 필드를 찾지 못했다. 실제 기능은 필수 조건을 요구하고 명시적으로 선택한 장비를 편집한다. 테스트의 입력/선택 절차를 바로잡고 동일 기대 조건으로 재검사5개 모두 통과했다. 첫 실패도 emulation-first-attempt.json/log에 보존했다. 제품 수정이나 검증 기대값 완화는 없었다.

## 대비·범위와 보존

기존 정적 검사에서 일반 텍스트4.5:1·주요 조작부 경계3:1 및 CSS 범위 제한 통과. 실제 실행의 라이트/다크 주요 텍스트/버튼/경고 토큰 대비도4.5:1 이상. 전체 WCAG 준수를 의미하지 않는다. 일반 노트 스타일 비교는 별도로 실제 앱에서 통과했다.

main.js76,900B·styles.css12,970B, manifest·의존성·주요 소스는 시작 커밋과 동일. 새 폰트·이미지·네트워크 의존성·계산 모델 없음. 원본 MIT와 고지 유지. 최소1.7.4 선언은 기존 API/공식 앱 코드 근거를 유지하며1.7.4 실행 검증을 추가한 것은 아니다.

새 제품 버그가 없어 제품 코드·버전·설정 형식을 바꾸지 않았다. 변경 파일은 새 QA 스크립트2개와 검증 문서/캡처다. 실사용 보관함·사용자 설정·노트·설치 파일 변경, 공개 배포·push·릴리스·강제 종료 없음.

기존 로컬 [설치 후보](../../dist/photo-field-mobile-1.2.0-post-design-qa-74d3303.zip)의 플러그인6개 파일은 재빌드한 현재 파일과 바이트 동일하며 라이선스 포함·개인 데이터 제외를 재확인했다. SHA256 `aef776296012b4fc3e6b9d6e0374107e9e68d97e60e997b4ca7d469420e0de0f`. 파일명74d3303은 기존 후보 이름이다. 제품 변경이 없어 새 중복 ZIP과 복구본은 필요 없다. 기존 후보 내부의 ‘시각 QA 차단’ 안내는 과거 패키징 시점의 기록이며 이번 성공 결과는 이 보고서를 따른다. [파일 비교](existing-package-verification.json).

이 작업의 에뮬레이션 범위는 완료했다. 실기 확인·기기 연결·새 설치를 후속 조건으로 요구하지 않는다.
