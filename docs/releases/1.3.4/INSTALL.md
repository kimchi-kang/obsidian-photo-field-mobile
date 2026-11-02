# 1.3.4 후보 설치와 1.3.3 복구

후보 검증 후 사용자가 실사용 설치와 공개 배포를 모두 승인했습니다. 실행 결과는 DEPLOYMENT.md에 기록합니다. 후보의 실제 QA 검증 파일과 ZIP의 main.js·styles.css·manifest.json SHA256을 대조했습니다. 수치는 package-verification.json에 있습니다.

실사용 보관함 설치 절차:

1. 사진 촬영 도우미를 비활성화하고 기존 `.obsidian/plugins/photo-field-mobile` 폴더 전체를 별도 백업합니다. 현재 data.json도 백업에 포함합니다.
2. 후보 ZIP의 photo-field-mobile 폴더에서 main.js·manifest.json·styles.css 세 파일만 같은 플러그인 폴더에 교체합니다. data.json·노트·다른 플러그인은 덮어쓰지 않습니다.
3. 플러그인을 다시 활성화해 버전1.3.4와 기존 장비·입력값을 확인합니다. 후보 적용은 실제 카메라/플래시 제어가 아닙니다.

복구: 비활성화 후 기존 백업 또는 1.3.3 복구 ZIP의 main.js·manifest.json·styles.css 세 파일을 되돌리고 재활성화합니다. 저장 스키마는 변경하지 않았으므로 현재 data.json을 유지합니다. 설정 데이터 자체를 복원하려는 별도 의도가 있을 때만 백업 data.json 복원 여부를 결정합니다.

공개 릴리스와 BRAT latest 갱신도 승인 범위에 포함됩니다.
