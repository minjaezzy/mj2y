# mj2y-web

[mj2y.com](https://mj2y.com) (강민재 포트폴리오) + [ms.mj2y.com](https://ms.mj2y.com) (군 생활 메이트) 소스.
순수 정적 사이트 — 빌드 과정 없음, 프레임워크 없음. HTML + CSS + 바닐라 JS.

---

## 📁 폴더 구조

```
mj2y-web/
├── shared/
│   └── scrapbook.css      ← 두 사이트가 공유하는 디자인 시스템(색·폰트·공통 컴포넌트)
├── ms/                    ← ms.mj2y.com (군 생활 메이트)
│   ├── index.html
│   └── assets/
│       ├── ms.css         ← ms 전용 스타일
│       └── app.js         ← 휴가 계산·달력·급식 로직 (데이터는 브라우저 localStorage)
├── www/                   ← mj2y.com (포트폴리오)
│   ├── index.html
│   ├── resume.html        ← 흰 배경 이력서(인쇄/PDF)
│   └── assets/
│       ├── mj2y.css
│       └── mj2y.js        ← 스크롤 등장 · 네비 · 한/영 토글
├── deploy.sh              ← /var/www 로 복사해 실제 반영
└── README.md
```

> `scrapbook.css`는 **shared/ 한 곳에서만** 관리합니다. `deploy.sh`가 배포 시 두 사이트로 복사해요. (각 사이트는 `/assets/scrapbook.css` 경로로 불러옵니다.)

---

## 🚀 수정하고 반영하기

1. 이 폴더에서 파일을 고친다.
2. 배포: 
   ```bash
   ./deploy.sh
   ```
   → `/var/www/ms`, `/var/www/mj2y` 로 복사되고 **바로** 사이트에 반영됩니다(nginx 재시작 불필요).
3. 깃 커밋/푸시:
   ```bash
   git add -A && git commit -m "수정 내용" && git push
   ```

> **CSS/JS를 바꿨다면** `index.html`(과 `resume.html`)의 `?v=3` → `?v=4` 처럼 숫자를 올려주세요. 방문자 브라우저 캐시를 무효화해 새 버전이 바로 보입니다.

---

## ✏️ 자주 하는 수정

### 색·폰트 바꾸기 → `shared/scrapbook.css` 맨 위 `:root`
```css
--bg:    #efebe1;   /* 배경 */
--ink:   #1b1a17;   /* 글자 */
--hi:    #e9ff3a;   /* 형광 노랑 포인트 */
--seal:  #df3f27;   /* 인장 빨강 포인트 */
--sans:  'Pretendard', ...;   /* 한글·본문 (깔끔한 산세리프) */
--serif: 'Fraunces', ...;     /* 라틴 숫자/제목용 세리프 */
```
> 한글은 전부 **Pretendard**로 나오게 되어 있어요(궁서·바탕 느낌 안 남). 라틴 숫자/영문 제목만 우아한 세리프(Fraunces)예요.

### 포트폴리오 내용 → `www/index.html`
- 소개·경력·학력 글: 해당 `<section>` 안의 텍스트를 직접 수정.
- **프로젝트 추가**: `Selected Work` 섹션의 `.feat-card`(대표) 또는 `.work-list`의 `.wrow`(목록) 한 줄을 복사해 붙여넣기.

### 한국어 번역 (한/영 토글) → `data-ko` 속성
영어가 기본이고, 글로브 버튼(🌐)으로 한국어로 바뀝니다. 번역은 각 요소의 속성으로 넣어요:
```html
<h2 data-ko="소개">About</h2>
<!-- 태그가 들어간 문장은 data-ko-h 사용 -->
<p data-ko-h="복잡한 것을 <em>쉽게</em>...">Making complex things <em>simple</em>...</p>
```
`data-ko`가 없는 요소는 두 언어에서 그대로(영문 유지)예요. 토글 로직은 `www/assets/mj2y.js` 의 i18n 부분.

### 이력서 → `www/resume.html`
한 파일 안에 스타일까지 들어있는 자기완결형 문서. 흰 배경, 우상단 **Print / Save as PDF** 버튼(브라우저 인쇄 → PDF 저장). 인쇄 시 툴바는 자동으로 숨겨집니다. 전화번호 등 추가하려면 `.cv-contact` 부분에 넣으세요.

### 군 생활 메이트 휴가 기본값 → `ms/assets/app.js`
파일 맨 위 `DEFAULTS()` 의 `entitlements` 배열에서 기본 휴가 종류·일수를 바꿀 수 있어요. (사용자가 화면에서도 직접 추가·수정 가능. 데이터는 각자 브라우저에 저장되고 서버엔 안 보냅니다.)

---

## 🌐 호스팅 구조 (참고)

- **nginx** 가 `/var/www/ms`(→ ms.mj2y.com), `/var/www/mj2y`(→ mj2y.com)를 정적 서빙.
- **Cloudflare Tunnel**(cloudflared, 토큰 방식)이 도메인을 이 서버로 연결. 공개 호스트네임/DNS는 Cloudflare 대시보드에서 관리.
- `quant.mj2y.com` 은 별도 Flask 앱(포트 5001)이라 이 레포와 무관.
- 이 레포는 **소스 + 가이드**일 뿐, GitHub Pages 배포가 아닙니다. 실제 반영은 서버에서 `./deploy.sh`.

---

made by hand · Minjae Kang
