# ECBC Google Calendar 연결

기존 달력 디자인과 직접 일정 추가 기능은 유지합니다. Owner 로그인 후 Google Calendar 연결 버튼이 추가됩니다. Google에서 선택한 캘린더의 일정을 추가·수정·삭제하면 ECBC 달력에 반영됩니다.

## 1. Google Cloud 설정 (최초 한 번)

1. https://console.cloud.google.com/ 에서 ECBC 프로젝트를 만들거나 선택합니다.
2. API 및 서비스 → 라이브러리에서 **Google Calendar API**를 활성화합니다.
3. Google Auth Platform에서 앱 이름, 지원 이메일을 설정합니다. 다른 Owner의 일반 Google 계정도 연결하려면 Audience를 **External**로 설정합니다.
4. Testing 상태에서는 Test users에 승현님과 연결할 모든 Owner의 Google 이메일을 추가합니다. 각 Owner가 자기 계정으로 동의해야 합니다.
5. Data Access에 다음 범위를 추가합니다.
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
6. Clients → Create client → **Web application**을 선택합니다.
7. Authorized redirect URIs에 정확히 다음 주소를 추가합니다.

   `https://ecbc-club.ecbc-seunghyeon.workers.dev/api/google/callback`

8. Client ID와 Client secret을 준비합니다. 비밀값은 GitHub 파일이나 채팅에 붙이지 않습니다.

Testing 상태의 External 앱은 Calendar 권한을 포함하면 일반적으로 refresh token이 7일 후 만료됩니다. 이때 Google을 다시 연결해야 합니다. 장기 운영을 위해 Production 전환 및 Google에서 요구하는 OAuth 검증, 홈페이지·개인정보처리방침 등의 요건을 완료하세요. Google 승인 전에는 모든 계정에서 무기한 동작한다고 보장할 수 없습니다.

## 2. 코드 적용과 Cloudflare 설정

먼저 이 변경사항을 GitHub main에 병합하고 Codespace에서 최신 코드를 받습니다. 기존 Codespace에 저장하지 않은 변경이 있으면 먼저 보존하세요. 저장소의 wrangler.json에는 기존 배포 때 사용한 D1 ID를 반영했습니다. 다른 D1을 사용한다면 Cloudflare 대시보드에서 실제 ID를 확인합니다.

```bash
pnpm install
pnpm exec wrangler d1 migrations apply DB --remote --config wrangler.json
node scripts/google-setup.mjs
pnpm typecheck
pnpm build
pnpm deploy
```

`google-setup.mjs`는 Client ID, Client secret을 숨겨서 입력받고 Cloudflare secrets에 저장합니다. 최초 설정에서는 GOOGLE_TOKEN_KEY 질문에 Enter를 누르면 암호화 키를 자동 생성합니다. **다시 실행할 때 기존 키를 바꾸면 이전 연결은 재로그인이 필요합니다.** 키를 바꾸지 않고 Client ID/secret만 변경하려면 각각 `pnpm exec wrangler secret put GOOGLE_CLIENT_ID --config wrangler.json`, `pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET --config wrangler.json`을 사용하세요.

새 migration은 Google 연결용 테이블만 추가합니다. 기존 일정·뉴스·Owner 비밀번호는 유지됩니다. 빌드 후 Worker에는 1분마다 실행되는 Cron Trigger가 포함됩니다. Cloudflare 대시보드 → Worker → Settings → Trigger Events에서 `* * * * *`가 있는지 확인하세요. Cron 설정이 전파되는 데 시간이 걸릴 수 있습니다.

## 3. Owner가 연결하는 방법

1. ECBC `/admin`에서 기존 Owner 코드로 로그인합니다.
2. **Connect Google Calendar** → 자기 Google 계정을 선택하고 두 Calendar 권한을 허용합니다.
3. **Choose calendar** → ECBC에 표시할 캘린더를 선택합니다.
4. 해당 캘린더 일정 정보가 ECBC에 공개되는 것을 확인하고 체크합니다.
5. **Connect selected calendar**를 누릅니다.
6. **Open Google Calendar**에서 같은 캘린더에 테스트 일정을 추가합니다.
7. ECBC 달력에 표시되는지 확인하고, 시간 수정과 삭제도 확인합니다.

다른 Owner도 같은 과정을 자기 계정으로 진행할 수 있습니다. 여러 계정에서 같은 공유 ECBC 캘린더를 연결해도 중복 표시하지 않습니다. 개인 일정이 섞이지 않도록 ECBC 전용 캘린더를 선택하세요. 연결한 계정당 캘린더 하나를 선택할 수 있습니다. Google 연결은 Owner 로그아웃 이후에도 서버에서 동기화됩니다. 새 Owner 세션에서 연결을 관리하려면 같은 Google 계정으로 다시 연결하세요.

## 동작 범위

- Google → ECBC **단방향**입니다. 기존 웹사이트에서 직접 만든 일정은 기존 방식으로 수정합니다.
- Google 일정은 기존 달력에 표시됩니다. Owner가 그 일정을 클릭하면 Google에서 수정하는 버튼이 표시됩니다.
- 서버는 매분 확인하고 열린 웹페이지는 30초마다 다시 읽습니다. 통상 1~2분 내 반영되지만 Google/Cloudflare 장애나 할당량에 따라 늦어질 수 있습니다. 즉시 푸시 방식은 아닙니다.
- 지난 1년부터 앞으로 약 2년 범위를 가져옵니다. 매번 반복 일정 인스턴스를 포함한 전체 범위를 읽으므로, 삭제·이동·반복 예외도 다음 성공한 동기화에서 반영됩니다.
- 날짜 경계와 시간은 America/New_York 기준입니다. 종일/여러 날 일정은 해당 날짜마다 표시됩니다.
- 제목·시간·장소·설명이 공개됩니다. 참석자 명단, 이메일, Google 로그인 토큰은 공개하지 않습니다. Google에서 명시적으로 Private으로 표시한 일정은 제외합니다.
- Google API 장애 시 마지막 성공한 일정을 보존합니다. 접근 권한이 거부되면 해당 연결의 공개 일정을 숨기고 재연결을 안내합니다.
- 작은 클럽 일정용입니다. 한 계정의 조회 범위가 10,000개 표시 행 또는 약 1.5 MB를 넘으면 기존 데이터를 보존하고 별도 클럽 캘린더 사용을 안내합니다.
- Disconnect는 ECBC에 저장한 해당 계정의 연결과 복사한 일정을 삭제합니다. Google 원본 일정은 삭제하지 않습니다. Google 계정 보안 설정에서도 앱 권한을 취소할 수 있습니다.
- 도메인을 변경하면 `wrangler.json`의 `GOOGLE_REDIRECT_URI`와 Google OAuth client의 redirect URI를 같은 새 주소로 바꾼 뒤 다시 빌드·배포합니다.

## 검증

```bash
pnpm typecheck
node --experimental-vm-modules --test tests/google-calendar.test.mjs
pnpm build
```

테스트는 Google 응답을 대체한 로컬 SQLite 검증입니다. 실제 Google 계정/Cloudflare 배포 연결 확인은 위 설정 이후 필요합니다.

참고: [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server), [Calendar events API](https://developers.google.com/workspace/calendar/api/v3/reference/events/list), [Cloudflare Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/).
