# 사진 촬영 도우미 1.3.1 · 계산 정확성 수정

극소 필요 출력의 지원 단계 선택과 잔여 EV, 파생 결과의 오버플로, 화각 연산, 과초점 직전의 수치 소거를 수정했습니다. 존 포함 판정의 고정 거리 여유를 상대 반올림 오차로 줄였고, 렌즈 한계에서 달성 불가한 경우의 상태 표시와 음수 0 표시를 수정했습니다. 계산의 주평면 거리·역제곱 근사·표시 반올림 한계도 안내합니다.

독립 광량·박막렌즈 결상·연속 존 최적화로 교차 검증했습니다. 자동79개, 고정 시드 유효 입력2,000개와 잘못된 입력250개, 별도 macOS Obsidian 모바일 화면·Markdown·복원8묶음 통과. 정상 앱 종료·새 프로세스 실행 복원도 확인했습니다. 1.3.1 파일의 별도 화면 검증은 `ui/results.json`과 일치하는 파일 해시를 기록합니다.

실제 iOS/Android와 렌즈·플래시 실측 보정은 미검증입니다. 근접 촬영·브리딩·동공 배율·주평면 보정은 포함하지 않습니다. 과초점 극점의 먼 거리 수치는 수치적으로 민감합니다. 검증한 모델과 입력 범위 안에서의 결과입니다.

- [계산 검증 보고서](https://github.com/kimchi-kang/obsidian-photo-field-mobile/blob/main/docs/calculation-audit/REPORT.md)
- [대표 기대값 대조표](https://github.com/kimchi-kang/obsidian-photo-field-mobile/blob/main/docs/calculation-audit/representative-table.md)
- [1.3.1 릴리스](https://github.com/kimchi-kang/obsidian-photo-field-mobile/releases/tag/1.3.1)

BRAT은 새 버전을 확인해 업데이트할 수 있습니다. 수동 설치는 기존 플러그인 폴더, 특히 data.json을 백업하고 플러그인을 비활성화한 뒤 main.js·manifest.json·styles.css만 교체하고 다시 활성화하세요. data.json은 교체하지 않습니다. 저장 형식 version:2와 장비 데이터를 유지합니다. 과거 Markdown은 자동 수정하지 않으므로 필요한 결과는 다시 계산해 저장하세요.

복구용 `photo-field-mobile-1.3.0-pre-calculation-audit-recovery.zip`은 계산 검증 시작 전 세 런타임 파일입니다. 이번 작업에서 실사용 보관함에 설치하지 않았습니다.
