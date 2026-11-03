# 사진 촬영 계산

날짜: 2026-11-03T02:40:59.171Z (2026. 11. 3. 오전 11:40:59, 기기 현지 시각)

## 입력값

| 항목 | 값 |
| --- | --- |
저장 범위: 현재 탭 · 플래시 (심도·조사 범위 제외)
플러그인 버전: 1.4.1
GN 입력 모드: 장비 표
선택 장비: LightPix Labs FlashQ Q20III
장비 출처: LightPix Labs Q20III 제품 사양·Quick Manual: https://www.lightpixlabs.com/pages/q20iii
| GN 모드 | equipment |
| 장비 ID (수동 모드에서는 적용 안 함) | equipment-mw02z4gt |
| 조리개 f/ | 4.5 |
| ISO | 100 |
| 카메라 거리 m | 1 |
| 온카메라 연동 | true |
| 별도 플래시 거리 m | 미사용 |
| ISO100 최대 출력 GN | 20 |
| GN 단위 | m |
| GN 측정 줌 mm | 32 |
| 선택 플래시 줌 mm | 32 |
| GN 조건 | 제조사 공칭 GN20m · ISO100·최대 출력 · 고정 32mm 커버리지 (35mm판). 직광·일반 동조 계산용. 디퓨저·젤 손실 미측정, 실측값 아님. · 출처: LightPix Labs Q20III 제품 사양·Quick Manual: https://www.lightpixlabs.com/pages/q20iii |
| 출력 1/n의 n | 4 |
| 추가 손실 stop | 0 |
| 허용 오차 ±EV | 1 |
| 최소 출력 1/n의 n | 64 |
| 지원 출력 분모 | 1,2,4,8,16,32,64 |
| 발광 조건 | manual |
| 화면 | flash |

## 계산 결과

거리 결과는 1m 이하에서 cm로 자동 표시합니다. 위 입력표와 내부 저장의 거리는 재현을 위해 m를 유지합니다. 표시 숫자만 반올림합니다. 포함·출력 경계·노출 판정은 반올림 전 값이므로 같은 표시 숫자라도 판정이 다를 수 있습니다.
- 선택 출력 1/4: **장비 지원 출력**
- 적정 노출 예상 거리: 2.22 m
- 플래시–피사체 거리: 100 cm · 노출 차이: 2.3 EV (예상 과다)
- 유효 GN(m): 10
- ±1EV 거리 구간: 1.57 m ~ 3.14 m
- 필요한 조리개 f/10 · 필요 출력 5.06% · 장비 출력 범위 안
- 권장 지원 단계 1/16 · 해당 단계 예상 거리 1.11 m, 남는 노출 오차 0.3 EV

### 출력별 거리

| 출력 | 적정 노출 예상 거리 |
| --- | --- |
| 1/1 | 4.44 m |
| 1/2 | 3.14 m |
| 1/4 | 2.22 m |
| 1/8 | 1.57 m |
| 1/16 | 1.11 m |
| 1/32 | 78.57 cm |
| 1/64 | 55.56 cm |

## 조건과 한계

수동 플래시·직접광·일반 동조·중심부 노출의 추정입니다. 점광원 역제곱 근사이며 근거리 대형 광원에는 부적절합니다. 실제 배광·반사율·환경광·장비 편차를 포함하지 않습니다. TTL, HSS, 바운스, 소프트박스, 근거리 대형 광원은 이 기본 모델로 확정할 수 없습니다. 손실 보정은 추정이며 GN에 이미 포함된 손실을 중복 적용하지 마세요.
빛은 예상 거리에서 끝나지 않습니다. 가까우면 과다 노출될 수 있습니다. CoC=센서 대각/1500은 감상 크기·시력·확대율에 의존하는 경험적 추정입니다. 직선투영 박막렌즈 모델이며 근접 촬영·포커스 브리딩·동공 배율은 반영하지 않습니다.

## 공식

유효 GN = G√p√(ISO/100) × 2^(−L/2), d = 유효 GN/N, 필요 p = (Nr/G)²(100/ISO)2^L, EV = 2log₂(d/r).
H=f²/(N·CoC)+f, h=H−f, Dnear=h·s/(h+s−f), Dfar=h·s/(h−s+f); s≥H이면 원거리 ∞. 광학 길이는 mm로 통일 후 m로 표시. s는 박막렌즈 주평면에서 피사체까지의 거리이며 카메라 센서면 거리와 다릅니다. 화각·프레임은 무한대 초점의 직선투영 근사로 근접 촬영의 배율 변화는 미반영합니다.

## 출처

심도·화각 표현의 기반: [depth-of-field](https://github.com/jherr/depth-of-field), Jack Herrington, Copyright (c) 2026 Jack Herrington, MIT. 참고 SHA c75dd6d40e4a96e96fd38e57657fe4b9737bf776. 모바일용 재구현·수정 및 플래시 확장. 공식·후원 플러그인이 아닙니다.
[렌즈 결상·착란원 MIT](https://people.csail.mit.edu/fredo/comp-photo-book/02-fundamentals-03-lens-image-formation.html) · [화각 Edmund Optics](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/understanding-focal-length-and-field-of-view/) · [Airy 지름 Edmund Optics](https://www.edmundoptics.com/knowledge-center/application-notes/imaging/limitations-on-resolution-and-contrast-the-airy-disk/) · [GN 기본 관계 Nikon](https://download.nikonimglib.com/archive2/rOYAB007rd7k028ePIg11W7lyc97/SB-500_CH%28En%2904.pdf)
