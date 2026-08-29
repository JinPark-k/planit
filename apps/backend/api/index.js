// Vercel 서버리스 함수 진입점.
//
// 왜 .ts가 아니라 .js이고, 왜 dist/를 참조하나:
// Vercel의 Node 런타임은 TypeScript를 esbuild로 컴파일하는데, esbuild는
// `emitDecoratorMetadata`를 지원하지 않고 @nestjs/swagger CLI 플러그인도 돌지 않는다.
// 그러면 Nest DI가 에러 없이 undefined를 주입하고(부팅은 성공한다),
// 엔드포인트를 호출할 때서야 "Cannot read properties of undefined"로 터진다. 실측으로 확인했다.
//
// 그래서 빌드는 tsc(`nest build`)에게 맡기고, 이 파일은 그 산출물만 넘긴다.
// 이미 __metadata() 호출이 박힌 JS라 esbuild가 번들해도 메타데이터가 보존된다.
module.exports = require('../dist/adapters/vercel/index.js').default;
