# ECBC 새 사이트 — 터미널 없이 복사해서 만들기

새 GitHub 저장소를 만들어 사용하는 독립 버전입니다. Node.js 설치, npm/pnpm 명령어, Codespaces 터미널, SQL 입력이 필요 없습니다. **웹사이트에서 파일을 복사하고 설정값을 입력하는 과정은 필요합니다.** Google 로그인을 포함한 모든 기능이 GitHub Pages 파일만으로 작동하는 것은 아닙니다.

## 파일 4개

| 파일 | 붙여넣는 곳 |
| --- | --- |
| `index.html` | 새 GitHub 저장소의 맨 위 |
| `style.css` | 새 GitHub 저장소의 맨 위 |
| `app.js` | 새 GitHub 저장소의 맨 위 |
| `worker.js` | 새 Cloudflare Worker의 Edit code 편집기 |

GitHub에서 각 파일을 열고 **Copy raw file** 버튼으로 전체 내용을 복사합니다. 새 저장소에서 **Add file → Create new file**을 누르고 같은 파일 이름을 입력한 다음 내용을 붙여넣고 **Commit changes**를 누릅니다. 코드를 붙일 때 Markdown의 ``` 표시나 줄 번호는 넣지 않습니다.

이 버전에서는 기존 PR #1이나 기존 저장소의 Node.js 파일들을 복사하지 않습니다. 위의 세 웹 파일과 Worker 한 파일로 구성됩니다. `worker.js`를 GitHub에도 보관할 수 있지만, GitHub에만 올리면 서버가 실행되지는 않습니다.

## 1. 새 GitHub Pages 사이트 열기

1. GitHub에서 **New repository**를 누릅니다.
2. 이름을 정합니다. 예: `ECBC-new`. 이 설명은 예시 이름입니다. 다른 이름을 써도 됩니다.
3. Public 저장소를 만듭니다.
4. `index.html`, `style.css`, `app.js`를 각각 복사해서 만듭니다.
5. 저장소의 **Settings → Pages**로 들어갑니다.
6. Source에서 **Deploy from a branch**를 선택합니다.
7. Branch **main**, 폴더 **/(root)**를 선택하고 Save를 누릅니다.
8. 배포 완료 후 Pages 설정에 표시되는 주소를 복사합니다.

예시 주소: `https://seunghyeonbang78-bot.github.io/ECBC-new/`

이 단계만 끝내면 홈, 프로그램, 코치, 연혁 화면은 열립니다. 일정 저장과 Owner 로그인은 다음의 Cloudflare 설정이 필요합니다. 주소 끝의 저장소 이름과 대소문자를 정확하게 사용하세요.

## 2. 새로운 Cloudflare Worker 만들기

1. https://dash.cloudflare.com/ 에 로그인합니다.
2. **Workers & Pages → Create application**에서 Worker를 새로 만듭니다. 기본 Hello World로 시작해도 됩니다.
3. 이름 예시: `ecbc-calendar-api`. **기존 ecbc-club Worker는 변경하지 마세요.**
4. Worker를 만든 뒤 **Edit code**를 누릅니다.
5. 기본 코드를 모두 지우고 이 폴더의 `worker.js` 전체 내용을 붙여넣습니다.
6. **Deploy**를 누릅니다.
7. 새 Worker의 `https://...workers.dev` 주소를 복사합니다.

Worker 주소를 브라우저에서 직접 열면 설정 또는 Owner 로그인 오류가 나올 수 있습니다. 사이트 화면은 GitHub Pages 주소에서 확인합니다. Worker는 화면을 제공하는 주소가 아니라 일정 데이터를 처리하는 주소입니다.

## 3. 새 데이터베이스 연결 — SQL 입력 없음

1. Cloudflare의 **Storage & databases → D1**에서 새 데이터베이스를 만듭니다.
2. 이름 예시: `ecbc-new-db`.
3. 방금 만든 Worker로 돌아가 **Bindings → Add binding → D1 database**를 선택합니다. 화면에 따라 Settings 아래에 있을 수도 있습니다.
4. Variable name을 정확히 **DB**로 입력합니다.
5. 새로 만든 `ecbc-new-db`를 선택하고 저장·배포합니다.

**기존 ecbc-db를 재사용하지 마세요.** 새 버전은 새 테이블 구조를 사용합니다. 필요한 테이블은 코드가 첫 요청 때 자동으로 만듭니다. SQL Console에 아무것도 입력하지 않습니다.

## 4. Owner 로그인 설정

Worker의 **Settings → Variables and Secrets**에서 다음을 추가합니다.

| 이름 | 종류 | 값 |
| --- | --- | --- |
| `SITE_URL` | Text | 새 GitHub Pages 사이트의 전체 주소. 예: `https://seunghyeonbang78-bot.github.io/ECBC-new/` |
| `OWNER_CODE` | Secret | 원하는 Owner 코드. 7자 가능, 최대 128자. 공개 파일에는 쓰지 않기 |

저장·배포합니다.

GitHub의 새 저장소에서 `app.js`를 열고 연필 버튼을 누릅니다. 맨 위의 한 줄만 실제 **새 Worker 주소**로 바꿉니다.

```js
const API_URL = 'https://YOUR-NEW-WORKER.workers.dev';
```

예를 들어 새 Worker 주소가 `https://ecbc-calendar-api.ecbc-seunghyeon.workers.dev`이면 그 주소를 작은따옴표 안에 입력합니다. 위 예시는 실제로 생성된 Worker 주소라고 보장하는 값이 아닙니다. 대시보드에 보이는 주소를 사용하세요. Commit changes 후 Pages 배포가 끝날 때까지 기다립니다.

이제 사이트의 Owner login에서 설정한 코드로 로그인하고 직접 일정을 추가할 수 있습니다. 다른 Owner에게도 같은 Owner 코드를 알려줄 수 있습니다. Google 계정 연결은 각자 따로 진행합니다.

## 5. Google 로그인 설정 — 최초 한 번

1. https://console.cloud.google.com/ 에서 프로젝트를 만들거나 선택합니다.
2. **API 및 서비스 → 라이브러리 → Google Calendar API → 사용**을 누릅니다.
3. **Google Auth Platform**에서 앱 이름 ECBC와 지원 이메일을 입력합니다.
4. 일반 Google 계정을 가진 다른 Owner도 사용할 수 있도록 Audience를 **External**로 설정합니다.
5. Testing 상태에서는 Test users에 본인과 다른 Owner의 Google 이메일을 추가합니다.
6. Data Access에서 다음 권한을 추가합니다.
   - `openid`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
7. Clients → Create client → **Web application**을 선택합니다.
8. Authorized redirect URIs에 **새 Worker 주소 뒤에 `/oauth/callback`을 붙인 주소**를 등록합니다.

예시: `https://ecbc-calendar-api.ecbc-seunghyeon.workers.dev/oauth/callback`

이 주소는 GitHub Pages 주소가 아닙니다. 반드시 실제 새 Worker 주소를 사용하세요.

Client ID와 Client secret을 받은 후 Cloudflare Worker의 **Variables and Secrets**에 다음을 추가합니다.

| 이름 | 종류 | 값 |
| --- | --- | --- |
| `GOOGLE_CLIENT_ID` | Secret | Google이 발급한 Client ID |
| `GOOGLE_CLIENT_SECRET` | Secret | Google이 발급한 Client secret |
| `GOOGLE_REDIRECT_URI` | Text | Google에 등록한 `/oauth/callback` 주소와 정확히 같은 값 |
| `GOOGLE_TOKEN_KEY` | Secret | 비밀번호 관리 도구 등으로 생성한 32자 이상의 임의 문자열. Owner 코드와 다른 값 사용 |

비밀값은 GitHub 파일이나 채팅에 붙이지 않습니다. GOOGLE_TOKEN_KEY는 연결 정보를 암호화하는 데 쓰므로 설정 후 유지하세요. 이 값을 바꾸면 기존 Google 계정들을 다시 연결해야 합니다. 저장·배포합니다.

Testing 상태의 External 앱에서 Calendar 권한을 사용하면 일반적으로 7일 뒤 재연결이 필요합니다. 장기 운영에는 Production 전환과 Google이 요구하는 OAuth 검증·개인정보처리방침 등의 요건을 완료해야 합니다. 코드를 복사하는 것만으로 Google의 앱 승인 절차가 생략되지는 않습니다.

## 6. 자동 갱신 켜기

Worker의 **Settings → Trigger Events → Cron Triggers → Add**에서 **Every minute**를 선택합니다. Custom 입력만 있으면 다음 일정 값을 입력합니다.

`* * * * *`

이것은 터미널 명령어가 아니라 예약 간격입니다. 저장합니다. Cloudflare에서 예약 설정이 반영되는 데 시간이 걸릴 수 있습니다.

## 7. 사이트에서 Google 캘린더 연결

1. 새 사이트 → Owner login → Owner 코드 입력.
2. **Connect Google Calendar**.
3. 자기 Google 계정을 선택하고 Calendar 읽기 권한 두 가지를 허용.
4. 돌아오면 **Choose calendar**를 누름.
5. ECBC에 공개할 캘린더를 선택.
6. 일정 제목·시간·장소·설명을 공개한다는 확인란을 체크.
7. **Connect selected calendar**를 누름.
8. Google Calendar에서 **그 캘린더**에 테스트 일정을 추가.
9. ECBC 달력에서 확인. 수정과 삭제도 확인.

다른 Owner도 자기 Google 계정으로 같은 과정을 진행합니다. 여러 Owner가 하나의 ECBC 공유 캘린더를 연결하면 화면에는 한 번만 표시됩니다. 서로 다른 캘린더를 선택하면 각 캘린더의 일정이 함께 표시됩니다.

개인 일정이 있는 캘린더보다 **ECBC 전용 캘린더**를 선택하세요. Google에서 명시적으로 Private인 일정은 제외합니다. 방문자는 Owner 로그인 없이 ECBC 일정을 볼 수 있습니다.

## 이전 일정·뉴스 복사

새 사이트의 Owner 화면 아래쪽에서 **Import its public calendar and news once**를 누릅니다. 기존 `ecbc-club.ecbc-seunghyeon.workers.dev` 사이트의 공개 일정과 뉴스를 새 데이터베이스에 한 번 복사합니다. 기존 사이트는 수정되지 않습니다. 비공개 초안과 Owner 비밀번호는 복사하지 않습니다.

이전 사이트에서 이후 변경한 수동 일정은 새 사이트로 자동 복사되지 않습니다. Google 연결 후 Google에서 변경하는 일정만 지속적으로 동기화됩니다.

## 사진과 PDF

처음부터 사진과 연혁 PDF가 보이도록 기존 ECBC 사이트의 공개 자산 주소를 사용했습니다. 기존 사이트가 없어져도 독립적으로 유지하려면 다음 파일을 새 저장소의 `assets` 폴더에 업로드하세요.

- `court.jpg`: https://ecbc-club.ecbc-seunghyeon.workers.dev/assets/court.jpg
- `coach.jpg`: https://ecbc-club.ecbc-seunghyeon.workers.dev/assets/coach.jpg
- `ecbc-history.pdf`: https://ecbc-club.ecbc-seunghyeon.workers.dev/assets/ecbc-history.pdf

그 다음 `index.html`에서 `https://ecbc-club.ecbc-seunghyeon.workers.dev/assets/`를 `./assets/`로 모두 바꿉니다. 파일 이름에 전체 주소를 입력하는 것이 아닙니다.

## 동작 범위와 검증

- 기존 홈/프로그램/코치/연혁 콘텐츠 및 달력 CSS를 재사용했습니다. 기존 화면을 Google의 달력 iframe으로 바꾸지 않습니다.
- Google → ECBC 단방향 동기화입니다. 기존 방식으로 직접 만든 일정도 계속 사용합니다.
- Google 일정은 Google에서 수정하며, Owner 화면에서 해당 일정을 클릭하면 Google Calendar 링크가 나옵니다.
- 서버는 매분 확인하고 열린 웹페이지는 30초마다 갱신합니다. 보통 1~2분 내 반영되며 즉시 푸시는 아닙니다.
- 동기화 범위는 지난 약 1년부터 앞으로 약 2년입니다. 반복/종일/여러 날 일정도 표시합니다. 시간대는 America/New_York입니다.
- 일시적인 Google 장애에서는 마지막 성공 데이터를 유지합니다. 접근 권한이 없어지면 해당 연결의 일정을 숨깁니다.
- 계정당 캘린더 하나를 선택할 수 있습니다. 일정 수가 매우 많으면 전용 클럽 캘린더로 나누어야 합니다.
- Owner 로그인을 종료해도 Google 동기화는 계속됩니다. 새 세션에서 관리하려면 같은 Google 계정을 다시 연결합니다.
- 로컬 SQLite와 대체 Google 응답으로 인증, CORS, 일정 검증/저장, OAuth 상태·재사용 차단, 여러 계정, 중복 제거, Google 추가·수정·삭제를 검증했습니다. 실제 Google 로그인과 Cloudflare 예약 실행은 계정 설정 후 최종 확인이 필요합니다. 브라우저 시각 검증은 이 작업 환경에서 완료하지 못했습니다.

공식 안내: [GitHub Pages](https://docs.github.com/en/pages/getting-started-with-github-pages/creating-a-github-pages-site), [Cloudflare 화면에서 Worker 만들기](https://developers.cloudflare.com/workers/get-started/dashboard/), [D1](https://developers.cloudflare.com/d1/get-started/), [Cron](https://developers.cloudflare.com/workers/configuration/cron-triggers/), [Google OAuth](https://developers.google.com/identity/protocols/oauth2/web-server).
