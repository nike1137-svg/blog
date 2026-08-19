# Marcus의 학습 일지

> 곁에서 돌본 경험을 코드로 — 하루치 학습 기록

어르신을 돌보며 느낀 것들을 AI로 풀어보려는 비전공자의 매일 학습 기록입니다.
**🔗 https://nike1137-svg.github.io/blog/**

---

## 무엇을 적나

"만들었다"보다 **"왜 이렇게 만들었나"**, 그리고 **"어디서 틀렸나"**를 남기는 것을 목표로 합니다.
성공한 결과보다 판단이 뒤집힌 지점, 검증에서 걸러진 것, 걸러지지 않은 것을 기록합니다.

| 분류 | 내용 |
| --- | --- |
| `프로젝트` | 해커톤 · 개인 프로젝트 · 메인퀘스트 진행 기록 |
| `일지` | 실습, 용어 정리, 회고 |

주요 주제: 로컬 LLM(Ollama)·임베딩·검색 평가, Docker와 배포, Git 협업, 보안·위협 모델, Python 실습.

---

## 저장소 구조

```
.
├── _posts/            # 글 (YYYY-MM-DD-slug.md)
├── _tabs/             # 정보·아카이브 등 상단 탭
├── _data/             # 다국어·설정 데이터
├── _plugins/          # Jekyll 플러그인
├── assets/            # 이미지·아바타 등 정적 파일
├── tools/             # 로컬 실행·테스트 스크립트
├── .github/workflows/ # GitHub Actions 자동 배포
├── _config.yml        # 사이트 설정 (제목·언어·baseurl 등)
└── index.html
```

주요 설정: `lang: ko-KR` / `timezone: Asia/Seoul` / `baseurl: /blog` / 페이지당 10글 / PWA 활성화 / 카테고리·태그 아카이브 자동 생성.

---

## 글 쓰는 법

`_posts/` 아래에 `YYYY-MM-DD-슬러그.md` 형식으로 파일을 만듭니다.

```yaml
---
title: 제목 — 부제
date: 2026-08-19 21:00:00 +0900
categories: [프로젝트, 해커톤]
tags: [검증, python]
description: 목록과 SEO에 노출되는 한 줄 요약
---
```

- 파일명의 슬러그가 그대로 주소가 됩니다 → `/blog/posts/슬러그/`
- 한글 슬러그는 주소가 깨지기 쉬우므로 **영문 슬러그**를 사용합니다.
- `categories`는 `[대분류, 소분류]` 순서입니다.

## 배포

`main` 브랜치에 푸시하면 GitHub Actions가 빌드해 GitHub Pages로 자동 배포합니다. 별도 명령은 필요 없습니다.

---

## 라이선스

- 테마 및 코드: [MIT License](LICENSE) (Chirpy, © cotes2020)
- 글과 이미지: © 2026 Marcus. 무단 전재 및 재배포를 금합니다.
