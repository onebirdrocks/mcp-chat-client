# MCP Chat UI

Model Context Protocol (MCP) 서버와 상호작용하기 위한 React 기반 사용자 인터페이스입니다.

## 기술 스택

- **프레임워크**: React 19 with TypeScript
- **빌드 도구**: Vite
- **스타일링**: Tailwind CSS
- **상태 관리**: Zustand
- **라우팅**: React Router
- **국제화**: react-i18next
- **코드 품질**: ESLint + Prettier

## 프로젝트 구조

```
src/
├── components/     # 재사용 가능한 UI 컴포넌트
├── pages/         # 페이지 컴포넌트
├── hooks/         # 커스텀 React hooks
├── store/         # Zustand 상태 관리
├── utils/         # 유틸리티 함수
├── types/         # TypeScript 타입 정의
├── i18n/          # 국제화 설정
└── main.tsx       # 애플리케이션 진입점
```

## 사용 가능한 스크립트

- `npm run dev` - 개발 서버 시작
- `npm run build` - 프로덕션용 빌드
- `npm run preview` - 프로덕션 빌드 미리보기
- `npm run lint` - ESLint 실행
- `npm run lint:fix` - ESLint 문제 수정
- `npm run format` - Prettier로 코드 포맷팅
- `npm run format:check` - 코드 포맷팅 확인

## 경로 별칭

프로젝트는 더 깔끔한 import를 위해 경로 별칭을 사용합니다:

- `@/*` - src/*
- `@/components/*` - src/components/*
- `@/pages/*` - src/pages/*
- `@/hooks/*` - src/hooks/*
- `@/store/*` - src/store/*
- `@/utils/*` - src/utils/*
- `@/types/*` - src/types/*
- `@/i18n/*` - src/i18n/*

## 시작하기

1. 의존성 설치:
   ```bash
   npm install
   ```

2. 개발 서버 시작:
   ```bash
   npm run dev
   ```

3. 브라우저에서 http://localhost:5173 열기

## 개발

프로젝트는 다음과 같이 설정되어 있습니다:
- TypeScript (타입 안전성을 위해)
- ESLint (코드 린팅을 위해)
- Prettier (코드 포맷팅을 위해)
- Tailwind CSS (스타일링을 위해)
- 경로 별칭 (깔끔한 import를 위해)
- 플레이스홀더 컴포넌트가 포함된 기본 프로젝트 구조