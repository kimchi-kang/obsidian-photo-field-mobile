# 1.4.0 현장 편의 기능 검증 보고서

2026-11-02 · 공개 배포 전 설치 후보.

## 기준과 보존

- 시작 HEAD: `612b2369fb1bc8b87e774d64f39351d5ab9375bd`, 1.3.4. 원격 HEAD도 동일하고 GitHub 최신 공개 릴리스도 1.3.4임을 읽기 전용으로 확인했습니다.
- `/Users/choikang/Documents/Codex/AGENTS.md`를 적용했습니다. 시작 시 존재한 tests/distance-mobile.mjs, tests/field-usability.mjs 변경 및 1.3.4 배포 후 기록·BRAT 복구 기록은 보존했습니다.
- 계산 엔진·존 역산·단위 변환·장면 SVG·노트 생성·최신 저장 병합 코드를 재작성하지 않았습니다. 새 화면도 기존 상태와 계산 결과를 사용합니다. 기존 장비 데이터나 사용자 보관함을 테스트용으로 변경하지 않았습니다.

자동 회귀 **92개**, 신규 모바일 **15묶음**, 기존 모바일 **26묶음**이 통과했습니다. 빌드·strict 타입 검사 및 ZIP 무결성·테스트된 파일 일치 검사를 완료했습니다. 최종 산출물 정보는 [package-verification.json](package-verification.json)에 기록합니다.

## 구현

촬영 조건·내 거리·간편 화면·출력 조절·존 목표가 하나의 ItemView에서 이어집니다. 관리 영역은 접어 두고 같은 화면에서 접근합니다. 상세 기능도 계속 사용할 수 있습니다. 플래시에서는 장비/조건·거리·EV·권장 출력을, 존에서는 목표와 다시 계산한 제안·명시적 적용을 우선 보여줍니다. 간편 화면의 실제 촬영 장면도 계속 드래그 가능합니다.

촬영 조건의 거리 포함 범위·장비 사양 서명 검증·적용 후 수정 상태·필드 단위 취소·별도 삭제 복구와 additive 마이그레이션은 [RELEASE.md](RELEASE.md), [MIGRATION.md](MIGRATION.md)에 설명했습니다.

## 재현

```
npm run build
npm test
node tests/setup-qa.mjs
# 전용 프로필 Obsidian을 9338 포트로 실행한 뒤 순서대로:
node tests/field-mobile.mjs
node tests/field-extended.mjs
node tests/field-legacy.mjs
python3 tests/package-field.py
```

- 자동 검사: [tests.txt](tests.txt), 빌드·strict 타입 검사: [build.txt](build.txt).
- 신규 모바일 흐름 8묶음: [ui/results.json](ui/results.json).
- 추가 편집·장비 참조·저장 실패·마이그레이션 7묶음: [extended/results.json](extended/results.json).
- 기존 회귀: [legacy.log](legacy.log). 거리·cm/m 경계·존 적용·노트 저장 4묶음, 촬영 준비·장비·초안·오프라인 저장·실패 재시도 10묶음, 장면/터치 드래그 등 10묶음, 슬라이더 2묶음입니다. 슬라이더는 4크기×2테마×4항목×3위치의 실제 터치를 검사합니다.
- 이전 검사 원본을 변경하지 않고 임시 사본에서 현재 저장 버튼의 선택자, 추가된 체크박스의 범위, cm 표시의 m 환산, 시작 창 제외, 한글 파일 경로만 보정했습니다. 과거 검증 자료를 덮어쓰지 않았습니다.

## 모바일 환경과 화면

MIA Study 방식: macOS Obsidian 1.14.5의 **별도 보관함·사용자 프로필**, app.emulateMobile(true), Playwright/CDP 모바일 뷰포트·터치 이벤트. iPhone 미러링은 사용하지 않았습니다. 실제 iOS/Android 통과를 주장하지 않습니다.

360×800·390×844 세로와 844×390 가로, 라이트/다크, 기본/22px rem 큰 글씨의 12조합에서 플래시·존 화면 총 24캡처를 생성했습니다. 가로 넘침과 보이는 버튼/summary 44px 터치 영역을 검사했습니다. 긴 이름의 줄바꿈, 스크롤, 관리 영역이 결과를 밀어내는 문제를 캡처로 확인해 관리 영역을 아래로 옮기고 장면 앞에 조절부를 배치했습니다.

- [플래시 간편 화면](ui/flash-simple.png)
- [오프카메라 거리 분리](ui/off-camera.png)
- [존 역산 제안](ui/zone-proposal.png), [명시적 적용 후](ui/zone-applied.png)
- [360px 다크 큰 글씨](ui/matrix-360-800-dark-large-존%20포커싱.png)
- [장비 사양 변경](extended/equipment-changed.png), [장비 삭제](extended/equipment-deleted.png), [저장 실패](extended/save-failure.png)

대표 흐름의 탭 수·설정 이동·키보드 호출·컨트롤 접근을 위한 스크롤 보정은 ui/results.json의 flows에 기록합니다. 스크롤 보정은 자동 검사에서 필요했던 위치 이동 수이며 사용자의 물리적인 스와이프 횟수와 같다고 간주하지 않습니다. 초기 즐겨찾기 생성·관리와 화면 전환은 사전 준비입니다.

390×844 대표 흐름: 촬영 **3탭**, 설정 이동·키보드·스크롤 보정 **0회**. 존 **2탭**, 설정 이동·키보드 **0회**, 준비 직후 목표 버튼으로 접근하는 스크롤 보정 **1회**였습니다. 큰 글씨나 가로 화면에서는 추가 세로 스크롤이 필요할 수 있습니다.

## 남은 실기 확인

iOS/Android 실제 Obsidian에서 네이티브 숫자 키보드·한글 IME 커서, 접근성 글씨 확대와 안전영역, 가로 회전·스크롤·드래그, 강제 종료 후 복원·동기화 충돌은 미검증입니다. 실제 장비의 GN·배광·광량과 노출은 시험 촬영과 실측으로 확인해야 합니다. 계산 검사는 기존 모델의 회귀를 확인하며 실제 광원의 정확성을 보증하지 않습니다.

설치 후보에는 라이선스·고지를 포함하고 사용자 data.json을 제외합니다. 실사용 보관함 설치·공개 배포·푸시는 수행하지 않았습니다. 이번 변경에 대한 별도 승인이 필요합니다.
