# narata

영화·드라마·애니·웹툰·웹소설 리뷰 커뮤니티 + AI 검색. 운영: https://narata.net

- Next.js 16 (App Router) / React 19 / TypeScript
- Supabase (Postgres + Auth + pgvector), 데이터 소스: TMDB · Wikidata · Wikipedia, 임베딩·답변: OpenAI

## 로컬 실행

```bash
npm ci
cp .env.example .env.local   # 값 채우기 (설명은 .env.example 주석 참고)
npm run dev
```

| 명령 | 용도 |
|---|---|
| `npm run dev` / `build` / `start` | 개발 서버 / 빌드 / 실행 |
| `npm test` | 단위 테스트 (`tests/`, Node 내장 test runner) |
| `npm run ingest:tmdb` | TMDB 인기작 수집 (로컬 스크립트) |

## 배포

- GitHub `main`에 머지하면 Vercel(`narata-7f`)이 운영 배포한다. PR마다 Preview 배포가 생긴다.
- **Supabase GitHub 통합이 `main` 머지 시 `supabase/migrations/*.sql`을 운영 DB에 자동 적용한다.**
  - 스키마 변경은 이 폴더에 마이그레이션 파일로 커밋한다. 대시보드나 MCP로 직접 적용하지 않는다(이력이 어긋난다).
  - 코드 배포보다 먼저 적용되면 깨지는 마이그레이션(권한 회수 등)은 코드 PR이 배포된 뒤 별도 PR로 머지한다. 마이그레이션과 Vercel 배포는 머지 직후 거의 동시에 일어난다.
- Preview 배포는 운영 DB에 연결된다(익명 키만, 서비스 롤 키 없음). Preview에서 쓴 글·평점은 운영 데이터에 남는다.

## 관리자 API

`/api/admin/*`(TMDB 수집·백필, 작품 관계 탐색, 커뮤니티 의견 요약)는 헤더로 인증한다.

```bash
curl -H "Authorization: Bearer $INGEST_ADMIN_SECRET" "https://narata.net/api/admin/ingest-tmdb?page=1&limit=5"
```

`?secret=` 쿼리 파라미터 방식은 더 이상 받지 않는다(로그에 비밀값이 남기 때문).
