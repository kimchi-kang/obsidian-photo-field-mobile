# 1.3.4 설치·배포 기록

사용자는 후보 검증 후 실사용 설치와 GitHub 공개 릴리스를 모두 승인했다.

## 실사용 설치

- 기존1.3.3 플러그인 폴더 전체를 보관함의 별도 백업 폴더에 복사했다.
- Obsidian 설정 UI에서 해당 플러그인만 비활성화하고 main.js·manifest.json·styles.css 세 파일을 교체했다.
- 설정 UI에서1.3.4 표시를 확인하고 다시 활성화했다. 활성화 저장도 확인했다.
- 설치 및 활성화 전후 data.json SHA256이 동일하다. 노트 데이터를 테스트하거나 변경하지 않았다.
- 설치 파일 SHA256은 검증한 후보/모바일 QA 파일과 일치한다.
- 개인 보관함 경로와 data.json 해시는 공개 저장소에 넣지 않고 로컬 dist/installation-1.3.4.json에 보관한다.
- 설정 창을 닫은 후 컴퓨터 제어 연결이 시간 초과되어, 실사용 촬영 화면을 다시 열어보는 마지막 확인은 수행하지 못했다. 별도 QA ItemView의 실행 검증과 구별한다.

## 공개 배포 준비

- package/manifest/lockfile/versions의 버전1.3.4를 대조했다.
- 배포 직전 npm test82/82, git diff --check 통과.
- ZIP/개별 실행 파일은 검증한 후보와 동일하다. ZIP 검사와 SHA256은 release-package-verification.json에 기록했다.
- 공개 파일: main.js·manifest.json·styles.css·설치 ZIP·라이선스·1.3.3 복구 ZIP·SHA256 목록. data.json은 포함하지 않는다.
- 기존 미추적 BRAT 복구 기록은 커밋에서 제외하고 그대로 보존한다.

공개 완료 시 이 문서에 실제 릴리스 URL과 원격 첨부 파일 검증 결과를 추가한다.
