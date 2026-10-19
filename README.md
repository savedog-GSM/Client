# 지켜멍

로보독의 센서 상태와 위험 구간을 확인하고, 안전 경로와 위험 신고를 관리하는 웹 관제 서비스입니다.

[서비스 바로가기](https://savedog.vercel.app) · [기능명세서](https://app.notion.com/p/5816c08297988393808b81fbe59d546e) · [API 명세](https://app.notion.com/p/5d06c08297988251bcb60160b41ad174)

## 주요 기능

| 화면      | 기능                                 |
| --------- | ------------------------------------ |
| 대시보드  | 실시간 센서·위험도 확인, 로보독 제어 |
| 안전 지도 | 위험 구간 표시, 안전·최단 경로 탐색  |
| 이동 기록 | 기간별 센서·위치 기록 조회           |
| 위험 신고 | 신고 검토, 접수번호 등록, 기각       |
| 위험 알림 | 위험 배너, 알림음, 수신 내역 확인    |
| 위치 전송 | 스마트폰 GPS 전송, 화면 꺼짐 방지    |

## 실행

Node.js **22.12 이상**이 필요합니다. CI에서는 Node.js 24를 사용합니다.

```bash
npm ci
cp .env.example .env
npm run dev
```

PowerShell에서는 `cp` 대신 `Copy-Item .env.example .env`를 사용합니다.

## 환경 설정

`.env.example`을 복사한 `.env`에 서버 주소와 카카오 지도 JavaScript 키를 입력합니다.

```dotenv
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_URL=
VITE_KAKAO_MAP_APP_KEY=
```

- `VITE_WS_URL`을 비우면 API 서버 주소의 `/ws`로 연결합니다.
- 관제·장치 토큰은 화면의 **연결 설정**에서 입력합니다. 새로고침하면 지워집니다.
- 서버의 CORS 허용 목록과 카카오 개발자 콘솔에 프론트 주소를 등록해야 합니다.
- 스마트폰 위치 전송은 **HTTPS** 또는 `localhost`에서 사용할 수 있습니다.

상세 설정과 화면별 동작은 [사용 가이드](docs/guide.md)를 참고해주세요.

## 개발 명령

| 명령                   | 용도                        |
| ---------------------- | --------------------------- |
| `npm run dev`          | 개발 서버 실행              |
| `npm run build`        | 타입 검사 및 배포 파일 생성 |
| `npm run preview`      | 빌드 결과 확인              |
| `npm run lint`         | 코드 검사                   |
| `npm run format:check` | 코드 포맷 검사              |
| `npm test`             | 테스트 실행                 |

## 기술 구성

React · TypeScript · Vite · Tailwind CSS · React Router · STOMP · Kakao Maps

| 폴더             | 역할                             |
| ---------------- | -------------------------------- |
| `src/api`        | API 요청, 서버 타입, 실시간 구독 |
| `src/app`        | 공유 상태, 서버 연결 설정        |
| `src/features`   | 화면별 기능                      |
| `src/components` | 공통 표시 요소                   |
| `src/test`       | 테스트 설정과 데이터             |

## 작업 규칙

**이슈 → `dev`에서 작업 브랜치 생성 → 커밋 → `dev` 대상 PR** 순서로 진행합니다.

| 구분   | 형식                                                    |
| ------ | ------------------------------------------------------- |
| 이슈   | `[type] 작업 내용`                                      |
| 브랜치 | `feature/작업내용`, `refactor/작업내용`, `fix/작업내용` |
| 커밋   | `type :: 작업내용 #이슈번호`                            |
| PR     | `[type/#이슈번호] 작업 내용`                            |

기능별로 이슈와 PR을 나누고 커밋도 작업 단위로 분리합니다. [협업 규칙 자세히 보기](docs/guide.md#협업-규칙)
