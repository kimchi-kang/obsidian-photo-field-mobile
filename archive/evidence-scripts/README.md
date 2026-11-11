# 보관된 증거 스크립트

각 릴리스(1.0.1~1.5.1)를 검증할 때 한 번 쓰고 그 버전의 화면·기본값·문구에 고정된 스크립트입니다.
현재 코드에서는 실행되지 않거나 실패합니다(접힌 설정으로 옮겨진 입력란, 바뀐 표기, 버전 고정값, 렌즈 주평면 기준 계산 등).
당시 결과물은 `docs/` 아래 증거 폴더에 남아 있고, 스크립트는 그 결과가 어떻게 만들어졌는지 보여 주는 기록으로만 둡니다.

- `*.mjs`: 격리된 QA Obsidian(`tests/setup-qa.mjs`)에 Playwright로 붙어 화면을 검사하던 스크립트. `tests/`에 있을 때의 상대 경로를 그대로 씁니다.
- `package-*.py`: 릴리스별 패키징 스크립트. 지금은 `npm run release`(scripts/release.mjs) 하나로 대체되었습니다.
- `calculation-audit-evidence.ts`: 1.3.1 계산 감사의 대표 수치 표 생성기(렌즈 주평면 기준).

현재 쓰는 검사는 `npm test`(단위 테스트)와 `npm run qa`(tests/mobile.mjs)입니다.
