# Design QA · 존 포커싱 확장 · 2026-10-29

final result: pass (별도 macOS Obsidian 모바일 에뮬레이션 범위)

현재 바우하우스 방향·촬영 장면·기존 안정화 수정을 보존했다. 좁은 화면의 4개 탭은 2×2로 배치하며 존 목표는 빗금/파선/라벨, 실제 심도는 실선/음영으로 구별한다. 실제 f값과 환산 심도 f값은 별도 라벨로 표시한다. 사용자 CoC 주의는 환산값 바로 아래 노출한다.

실제 ItemView에서 app.emulateMobile(true), CDP 모바일 크기와 터치 이벤트로 360×800·390×844·430×932·844×390, 라이트/다크, 큰 글씨, 축소 높이를 검사했다. 실제 캡처를 열어 장면·라벨·변환 설명·목표/결과·가로/다크/큰 글씨를 확인했다. 저장 버튼의 도달성과 중앙 클릭 가능 여부도 확인했다. iOS 실기 통과를 뜻하지 않는다.

- 변경 전: docs/zone-focus/before/390-844-light-dof.png
- 변경 후: docs/zone-focus/after/example-2m-5m-scene.png
- 환산: docs/zone-focus/after/equivalent-35mm-f2-15x.png
- 역산 결과: docs/zone-focus/after/example-2m-5m-result.png
- 상세 결과·제한·복구: docs/zone-focus/REPORT.md
- 이전 차단 보고 원문: docs/zone-focus/before/design-qa.md
