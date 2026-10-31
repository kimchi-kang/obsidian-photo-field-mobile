# 사진 촬영 계산

날짜: 2026-10-31T01:17:11.463Z (2026. 10. 31. 오전 10:17:11, 기기 현지 시각)

## 입력값

| 항목 | 값 |
| --- | --- |
저장 범위: 현재 탭 · 존 포커싱 (플래시 제외)
플러그인 버전: 1.3.1
GN 입력 모드: 수동 GN
선택 장비: 없음 · 수동 GN
장비 출처: GN 조건 참조
| 센서 프리셋 | ff |
| 센서 가로 mm | 36 |
| 센서 세로 mm | 24 |
| 실제 초점거리 mm | 35 |
| 조리개 f/ | 7.1 |
| 카메라 거리 m | 2.857142857142857 |
| CoC 방식 | estimate |
| 사용자 CoC mm | 미사용 |
| 화면 | zone |
| 환산 기준 | nominal |
| 존 흐름 | target |
| 목표 근거리 m | 2 |
| 목표 유한 원거리 m (무한대 선택 시 미사용) | 5 |
| 목표 원거리 무한대 | false |
| 렌즈 최대 개방 f값 | 1.4 |
| 렌즈 최소 개방 f값 | 16 |
| 사용 가능한 실제 조리개 단계 | 1,1.2,1.4,1.6,1.8,2,2.2,2.5,2.8,3.2,3.5,4,4.5,5,5.6,6.3,7.1,8,9,10,11,13,14,16,18,20,22,25,29,32 |

## 계산 결과

표시 숫자만 반올림합니다. 포함·출력 경계·노출 판정은 반올림 전 값이므로 같은 표시 숫자라도 판정이 다를 수 있습니다.

- 심도 근거리 1.94 m / 원거리 5.41 m / 전체 3.47 m
- 과초점거리 6.02 m · CoC 0.02884 mm
- 수평/수직/대각 화각 54.43° / 37.85° / 63.44°
- 실치수 대각 기준 풀프레임 환산 초점거리 35 mm
- 회절 Airy 지름 (파장 550nm) 0.00953 mm, CoC 대비 0.33배 (근사)

## 풀프레임 환산
- 명목 계수 1× · 실치수 대각 계수 1×
- 실제 35mm f/7.1 → 화각 환산 35mm · 심도 대응 약 f/7.1
- 실제 노출 조리개는 그대로입니다. 같은 위치·구도·비교 감상 조건의 근사이며 근접 촬영·브리딩·화면비 차이는 미반영.
- CoC는 센서 대각/1500. 풀프레임 CoC도 대응시켜 비교해야 합니다. 명목/실치수 차이 존재.

## 존 포커싱 역산
- 목표 2 m ~ 5 m
- 제안 가능: 초점 맞출 거리 2.86 m, 실제 f/7.1
- 제안 검산 1.94 m ~ 5.41 m · 이론 필요 f/6.4494
- 역산 가정: 유한 구간 a,b에서 s=2ab/(a+b), h=(2ab−f(a+b))/(b−a), N=f²/(c·h). 무한대는 H≤2a, 적용 초점=H. 실제 사용 단계 중 가장 개방된 조리개부터 기존 심도 엔진으로 재검산. CoC 허용 범위이며 절대 선명도 경계 아님.

## 조건과 한계

수동 플래시·직접광·일반 동조·중심부 노출의 추정입니다. 점광원 역제곱 근사이며 근거리 대형 광원에는 부적절합니다. 실제 배광·반사율·환경광·장비 편차를 포함하지 않습니다. TTL, HSS, 바운스, 소프트박스, 근거리 대형 광원은 이 기본 모델로 확정할 수 없습니다. 손실 보정은 추정이며 GN에 이미 포함된 손실을 중복 적용하지 마세요.
빛은 예상 거리에서 끝나지 않습니다. 가까우면 과다 노출될 수 있습니다. CoC=센서 대각/1500은 감상 크기·시력·확대율에 의존하는 경험적 추정입니다. 직선투영 박막렌즈 모델이며 근접 촬영·포커스 브리딩·동공 배율은 반영하지 않습니다.

## 공식

유효 GN = G√p√(ISO/100) × 2^(−L/2), d = 유효 GN/N, 필요 p = (Nr/G)²(100/ISO)2^L, EV = 2log₂(d/r).
H=f²/(N·CoC)+f, h=H−f, Dnear=h·s/(h+s−f), Dfar=h·s/(h−s+f); s≥H이면 원거리 ∞. 광학 길이는 mm로 통일 후 m로 표시. s는 박막렌즈 주평면에서 피사체까지의 거리이며 카메라 센서면 거리와 다릅니다. 화각·프레임은 무한대 초점의 직선투영 근사로 근접 촬영의 배율 변화는 미반영합니다.

## 출처

심도·화각 표현의 기반: [depth-of-field](https://github.com/jherr/depth-of-field), Jack Herrington, Copyright (c) 2026 Jack Herrington, MIT. 참고 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. 모바일용 재구현·수정 및 플래시 확장. 공식·후원 플러그인이 아닙니다.
[렌즈 결상·착란원 MIT](https://people.csail.mit.edu/fredo/comp-photo-book/02-fundamentals-03-lens-image-formation.html) · [화각 Edmund Optics](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/understanding-focal-length-and-field-of-view/) · [Airy 지름 Edmund Optics](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/limitations-on-resolution-and-contrast-the-airy-disk/) · [GN 기본 관계 Nikon](https://download.nikonimglib.com/archive2/rOYAB007rd7k028ePIg11W7lyc97/SB-500_CH%28En%2904.pdf)
