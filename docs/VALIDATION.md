# 로컬 Obsidian 모바일 에뮬레이션 재검증 · 2026-10-29 (KST)

기준6fe771e의 [최종 보고서](mobile-host-qa/REPORT.md). 사용자의 실행 권한 승인 후 전용 앱/CDP 연결 성공. 실제 Obsidian 모바일 시나리오69개·자동53개·대역 통합15개 및 빌드 통과.360/390/430px·가로·양 테마·큰 글씨·축소 높이·CDP 터치 및 실제 화면 캡처 확인. 새 제품 버그 없어 제품 코드 수정 없음. 실기·새 설치·실사용 보관함 변경·배포·push 없음.

# 디자인 후속 종합 검증 · 2026-10-29 (KST)

최신 결과는 [후속 보고서](post-design-validation/REPORT.md). 기준74d3303에서 CSS 중요 경계 대비만 수정. 자동53개/실제번들 코드 통합15개 통과. 실제 앱·시각·제스처·실기는 접근 제한으로 이번 미검증. 후보는 코드 검증용이며 새 시각 QA는 보류다. 아래의 이전 실행 기록은 그대로 보존한다.

# 바우하우스 로컬 빌드 · 2026-10-29 (KST)

현재 검증은 [바우하우스 보고서](bauhaus/REPORT.md)와 [디자인 QA](../design-qa.md). 기존 계산·모바일·저장·제스처 회귀 및 새 화면6개 통과. 실사용 보관함의 설치/정상 Mac 로드 확인, 사용자 설정 보존. 실제 휴대전화는 미검증. 아래 준비 후보 기록을 보존한다.

# 후속 검증 · 2026-10-29 (KST)

1.2.0 촬영 준비 후보의 현재 결과는 [후속 보고서](preparation/REPORT.md). 자동50개, 추가 흐름10개, 정상 테스트 앱 재실행1개 및 기존 회귀 검사를 통과했다. 실제 iOS·Android·시뮬레이터 검증은 없음. 아래는 기준1.2.0의 이전 기록이다.

# 검증 결과 · 2026-10-28 (KST)

## 결과

1.2.0의 수정 전/후14개 안정화 검사와 저장 부하·장비·마이그레이션·노트 동시 실행 결과는 [안정화 보고서](stabilization/REPORT.md). 원문 자동 검사46개는 `stabilization/unit-results.txt`. 최소 버전 근거는 [COMPATIBILITY.md](COMPATIBILITY.md), 데이터 복구는 [MIGRATION.md](MIGRATION.md).

현재 빌드: **1.2.0**. 버그 재현·회귀 검증 **8/8 통과**, 이전 1.0.0에서 같은 8개 시나리오 실패를 기록했다. 자세한 비교: `bugfix-1.0.1/before.json`, `bugfix-1.0.1/after.json`.

- TypeScript strict 타입 검사 + esbuild browser-target 빌드: **통과**.
- 자동 수치·오류·배포 검사: **46/46 통과**, 실패 0. 원문 `unit-test-results.txt`.
- 실제 macOS Obsidian의 모바일 에뮬레이션 + Chromium DevTools 자동 시나리오: **17/17 통과**, 미처리 런타임 예외 0. 원문 `mobile-test-results.txt`, 기계 판독 `mobile-results.json`.
- 테스트 보관함: `/private/tmp/photo-field-qa-vault`. 사용자의 기존 노트에서 파괴적 검증을 하지 않았다.
- 오프라인 모드에서 실제 ItemView 재진입, 수치 변경, Vault API로 새 노트 두 개 생성, 중복 경로 없음, 일반 Markdown 내용 읽기를 검증했다. `example-note.md`는 그 실제 저장물이다.
- 계산 번들 및 CSS 크기는 릴리스 파일과 `build-meta.json`에서 확인 가능. 외부 import는 `obsidian`뿐. 번들에 Node/Electron/fs/path/네트워크 호출·원격 자산 없음. 개발용 패키지와 Obsidian 호스트 API는 런타임 번들에 들어 있지 않다.

## 1.1.0 원본 장면 복원 검사

원본 공개 화면과 같은 390×844, 풀프레임·실제50mm·f/1.8·피사체1.8288m·사용자 CoC0.029mm·미터·라이트 조건으로 비교했다. 촬영 장면→심도 카드4개→거리/초점거리/조리개 순서를 복원했다. 새 단순 SVG 기호와 한국어·Obsidian 테마, 플래시 확장은 의도한 차이다. 픽셀 단위 복제는 아니다. 상세 디자인 비교는 `../design-qa.md` 참고.

`tests/scene.mjs`에서 **10/10 통과** (`scene-results.json`): 360px/가로 화면 넘침, 피사체 마우스·CDP 터치 드래그, 화살표 키, 직접 거리 입력, 조리개의 심도/플래시 동시 갱신, 오프카메라 분리, 빈 입력의 NaN 도형 방지, 화면 밖 유한 심도 화살표. `tests/scene.test.ts`에서 좌표/거리와 물리적 거리 경계 자동 검사 추가. 이 결과는 macOS Obsidian 모바일 에뮬레이션이며 실제 iOS·Android 검증이 아니다.

## 수치 검사 범위

GN40/ISO100/f4에서 최대=10m, 1/4=5m, 1/16=2.5m. ISO400·1/16=5m. 1stop 추가 손실은 1/√2 거리. 두 배 거리=−2EV. ISO·손실·조리개를 달리한 출력 역산/정산 왕복. 36×24/50mm 수평39.6°, 수직27.0°. m/ft GN 왕복. 고정 GN에서 센서·렌즈 변경해도 플래시 거리 동일. 필요 출력 범위 초과, 단계 반올림의 실제 잔여 EV 일치. 0·음수·빈칸·NaN·무한값·s≤f 거부. 과초점 전/경계/후와 H/2, 독립적인 박막렌즈 결상식의 경계 착란원 검증. 360inch를 넘는 유한 원거리 보존. 극단적인 산술 오버플로를 ∞ 심도로 오인하지 않음. 장비 표·데이터 복원·일반 Markdown·미지원 조건 검사.

## 1.0.3 모바일 사이드바 스와이프 회귀 검사

Obsidian 1.14.5의 모바일 에뮬레이션에서 CDP touchStart/move/end를 사용했다. `tests/swipe.mjs`, 결과 `swipe-results.json`.

- 대조군: 같은 화면의 제외 속성을 제거하면 가로 스와이프로 왼쪽 사이드바가 열리는 것을 재현.
- 수정 적용: 좌→우, 우→좌, 양쪽 가장자리에서 시작한 스와이프로 사이드바가 열리지 않음.
- 세로 터치 스크롤은 정상 동작하며 슬라이더 드래그로 조리개 값이 변경됨.
- 화면 닫기 시 속성 제거, 다시 열면 속성 재적용.
- 일반 Markdown 노트로 전환하면 기존 사이드바 스와이프가 정상 동작.

**6/6 통과**. 실제 iOS/Android에서 이 수정의 터치 동작은 아직 미검증이다. 사용 방식은 [Obsidian 개발자 포럼](https://forum.obsidian.md/t/blocking-swipe-actions-on-mobile/105661) 및 [Obsidian 개발자의 권고](https://github.com/churnish/dynamic-views/issues/254)에 따라 `data-ignore-swipe`를 해당 ItemView에만 적용한다. 전역 이벤트 차단이나 앱 설정 변경은 하지 않는다.

## 1.0.2 모바일 메뉴 진입 검사

모바일 리본 메뉴를 실제로 열어 **사진 촬영 도우미 열기** 항목이 한 개 표시되고, 누르면 ItemView가 열리는 것을 추가 검증했다. `mobile-entry-results.json`에 결과를 기록했다. 이는 macOS Obsidian 모바일 에뮬레이션이며 실제 iOS/Android 검증이 아니다.

## 모바일 에뮬레이션에서 실제 수행한 것

[Obsidian 공식 모바일 개발 문서](https://docs.obsidian.md/Plugins/Getting%20started/Mobile%20development)의 `app.emulateMobile(true)`를 사용하고 DevTools에서 모바일 크기/터치 입력을 설정했다. WebKit이나 Android WebView 실기가 아닌 **macOS Electron/Chromium 호스트**다.

- 360×800, 390×844 세로 / 844×390 가로: 가로 넘침 없음.
- 360×800 첫 화면: 가장 큰 예상 거리, 조건, EV, 심도 근거리·원거리가 하단 기본 도구막대 위에 보임.
- 44px 이상의 보이는 버튼·선택·숫자·슬라이더·summary·체크박스 라벨 터치 영역.
- 숫자 직접 입력과 입력 중 포커스 보존, 합성 touchStart/touchEnd로 실제 슬라이더 값 변경. 드래그 없이도 모든 값 조작 가능.
- 조리개 변경 시 심도와 플래시 갱신. 온카메라 연동과 오프카메라 별도 거리. 줌별 GN 누락, HSS 선택 시 계산 차단.
- 사용자 장비 표 저장 → 플러그인 비활성/재활성 → 표와 입력 복원.
- 네트워크 offline 상태에서 계산·화면 재진입·실제 Markdown 저장.
- 라이트/다크 테마 CSS 클래스 전환 시 화면 캡처 및 넘침 확인. 화면 키보드는 **360×420 축소 뷰포트 대리 검사만** 수행.
- 화면 닫기와 플러그인 비활성 시 등록한 AbortController의 모든 이벤트 신호가 abort되고 ItemView가 제거되는 것 확인.
- 그림 최대3m에서 유한한 심도6.85~18.49m를 →숫자로 유지하는 도식 확인. 원뿔은 커버리지 기하 도식이며 밝기 지도가 아님.

로컬 검증 실행 시 생성되는 캡처 (공개 저장소에는 미포함): `screenshots/360-dark.png`, `360x800-light.png`, `390x844-dark.png`, `844x390-dark.png`, `360x420-light.png`, `invalid-input.png`, `finite-outside-diagram.png`, `coverage-cones.png`. Obsidian의 기본 도구막대는 캡처에 그대로 포함된다. 회전/작은 화면에서는 세로 스크롤을 사용한다.

## 발견 후 수정·재검사

모바일에서 마지막 탭을 닫고 즉시 다시 열면 Obsidian이 탭 교체를 마치기 전에 getLeaf를 호출하여 화면을 잃을 수 있었다. 진입을 다음 이벤트 루프까지 기다리고 중복 진입을 합쳐 해결했다. 첫 화면의 심도 값이 기본 하단 도구막대에 가려지는 문제도 상세값을 접고 위로 배치하여 수정했다. 전체 17개 시나리오를 최종 빌드로 다시 통과했다.

## 실제 기기에서 남은 확인 항목

**실제 iOS 기기: 미검증. 실제 Android 기기: 미검증. iOS Simulator/Android Emulator에 설치한 Obsidian: 미검증.** 모바일 에뮬레이션 결과를 실기 통과로 표현하지 않는다.

- iPhone/iPad WebKit에서 플러그인 활성화, 메모리·성능, 네이티브 숫자 키보드/한글 IME와 선택 상태.
- Android WebView에서 입력·슬라이더와 세로 스크롤 간 제스처 충돌, 브라우저/시스템 뒤로가기.
- 실제 노치·홈 인디케이터·안전영역, 가로 회전 중 키보드, 접근성 글자 크기 확대.
- 모바일 앱 강제 종료/재실행 후 입력·프리셋 복원과 플러그인 토글.
- 각 기기의 실제 보관함 위치·권한·iCloud/Obsidian Sync 등 동기화 방식으로 `.obsidian/plugins` 전달. 오프라인 노트 생성 후 동기화 충돌 여부.
- 실제 장비의 줌별 GN과 최소/지원 출력 단계 및 조사각 입력, 조도계/시험 촬영으로 모델 오차 확인.

확인되지 않은 제조사 장비 수치는 내장하지 않았다. 기본 GN40과 출력 단계는 계산 연습 예시이며 실제 장비 입력이 필요하다.

## 재현

```
npm ci --ignore-scripts
npm run build
npm test
node tests/setup-qa.mjs
/Applications/Obsidian.app/Contents/MacOS/Obsidian --user-data-dir=/private/tmp/photo-field-qa-profile --remote-debugging-port=9338
# 최초 열기 시 테스트 보관함의 자체 플러그인 신뢰를 선택한 후:
npm run qa
```

QA 스크립트는 정확히 지정된 전용 보관함인지 검사한 뒤 실행한다. macOS 테스트 경로를 전제로 하므로 다른 OS에서는 테스트 보관함/실행 경로를 조정해야 한다. 실기 검증은 해당 기기의 원격 검사기를 사용해야 한다.

## 설치 산출물

저장소 루트의 `main.js`, `manifest.json`, `styles.css`와 GitHub Releases의 동일 파일이 BRAT 설치 대상이다. 전체 라이선스·고지 포함 ZIP과 소스 ZIP도 Releases에서 제공한다.

GitHub: https://github.com/kimchi-kang/obsidian-photo-field-mobile
