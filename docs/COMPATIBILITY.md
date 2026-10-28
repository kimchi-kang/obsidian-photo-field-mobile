# 최소 Obsidian 버전 근거

1.2.0의 `minAppVersion`은 **1.7.4**다. 기존1.5.0은 현재 사용하는 API 계약/스와이프 검증 근거를 기록하지 않았으므로 그대로 유지하지 않았다.

- [공식 Obsidian API](https://github.com/obsidianmd/obsidian-api)의 배포 타입에서 `registerView`/기본 Plugin/Vault API는 오래된 API이고, 현재 기다리는 `Workspace.revealLeaf(): Promise<void>`는 `@since 1.7.2`. npm의 공식 `obsidian@1.7.2` 타입을 임시 디렉터리에 풀어 **현재 src 전체 타입 검사 통과**. 개발 의존성/lockfile을 다운그레이드하거나 새 런타임 패키지를 추가하지 않았다.
- 1.7.2는 공개 앱 GitHub 릴리스로 제공되지 않았다(공식 릴리스 API404). 공개적으로 검사할 수 있는 그 이후 버전인 [공식1.7.4 배포](https://github.com/obsidianmd/obsidian-releases/releases/tag/v1.7.4)의 `obsidian-1.7.4.asar.gz`를 내려받아 검사했다. 모바일 터치 시작 처리에서 조상 요소를 순회하며 `dataset.ignoreSwipe`가 있으면 반환하는 코드가 실제 존재한다. `getLeaf`, `revealLeaf`도 확인. 해당 앱은 배포물에 재포함하지 않는다.
- 번들 타깃ES2020이며 Node/Electron/fs/path API를 런타임에서 사용하지 않는다. Pointer Events/capture, AbortController, DOM 이벤트 signal, range/number 입력 등 WebView 기능을 사용한다. `minAppVersion`만으로 오래된 OS/WebView의 모든 기능을 보장하지 않으며 실제 OS 호환성은 별도 기기 검증 대상이다.
- 실제 실행/행동 검사: **macOS Obsidian1.14.5의 모바일 에뮬레이션/Chromium**. **1.7.4에서 실행한 것은 아니다.** 1.7.4는 API/공식 앱 코드 검사에 근거한 최소 선언이며, 그 버전의 실기·런타임 검증 완료를 뜻하지 않는다. 최신 버전이라는 이유로 최솟값을1.14.5로 올리지 않았다.

정확한 검사 파일 해시는 `stabilization/compatibility-evidence.json`. iOS/Android 잔여 항목은 `stabilization/REPORT.md`를 참고한다.
