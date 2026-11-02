# 사진 촬영 도우미 1.3.3 · 설정 입력을 더 간편하게

- 주요 숫자 입력에 큰 − / + 버튼을 붙였습니다. 가까운 거리는 1cm씩, 조리개·ISO 등은 자주 쓰는 값 순서로 조절합니다. 숫자 직접 입력도 유지합니다.
- 거리·조리개·ISO·초점거리·존 목표 등에 ‘자주 쓰는 값 선택’을 추가했습니다. 해당 값은 빠른 입력 예시이며 특정 렌즈/장비의 지원값을 보장하는 사양표는 아닙니다.
- 카메라·플래시·내 장비 설정으로 바로 이동하는 버튼을 추가했습니다.
- 플래시 설정을 발광 조건 / GN 기준 / 조사 범위로 구분하고, 사용자 출력 분모·지원 단계는 ‘출력 단계 직접 설정’으로 정리했습니다.
- 자동 CoC와 근사 조사각을 쓰는 동안에는 미사용 직접 입력칸을 숨깁니다. 사용자 값을 지우지 않아 다시 직접 입력으로 전환하면 복원됩니다.
- 온카메라 연동·원거리 무한대 등으로 비활성화된 필드는 버튼과 빠른 선택도 함께 비활성화합니다. 단계 끝이나 조사각 한계에서 잘못된 값으로 넘어가지 않도록 했습니다.

기존 cm/m 자동 표시, 내부 m 계산, 장비 데이터와 저장 형식은 유지했습니다. 저장된 설정·장비 데이터는 초기화하지 않습니다.

검증: strict 빌드·자동82개 통과. 별도 실제 macOS Obsidian의 모바일 에뮬레이션에서 새 설정5묶음 및 기존 cm/m4묶음 통과. 360/390px·가로·20px 글씨·모든 탭을 확인했고 숫자 버튼의 44px 이상 터치 영역, 입력 레이블 연결, 저장·재진입 복원·Markdown을 대조했습니다. 실제 iOS 키보드·VoiceOver 검증은 아닙니다.

[변경 전 화면](https://github.com/kimchi-kang/obsidian-photo-field-mobile/tree/main/docs/releases/1.3.3/before/) · [변경 후 화면과 결과](https://github.com/kimchi-kang/obsidian-photo-field-mobile/tree/main/docs/releases/1.3.3/ui/) · [cm/m 회귀](https://github.com/kimchi-kang/obsidian-photo-field-mobile/tree/main/docs/releases/1.3.3/cm-regression/). 첫 검사에서 중첩 details의 상위 summary까지 함께 선택한 테스트 선택자 오류는 summary 자체를 대상으로 고쳤으며 기록은 `ui-first-attempt.txt`에 남겼습니다.

BRAT latest 추적으로 새 릴리스를 받을 수 있습니다. 수동 설치 시 기존 플러그인 폴더를 백업하고 main.js·manifest.json·styles.css만 교체하세요. data.json은 덮어쓰지 않습니다.

[1.3.3 릴리스](https://github.com/kimchi-kang/obsidian-photo-field-mobile/releases/tag/1.3.3)
