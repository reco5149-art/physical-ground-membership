/**
 * node --test 실행 시 `@/...` 경로 별칭을 해석하는 resolve 훅.
 *
 * 왜 필요한가: 소스 파일은 앱 코드와 동일하게 `@/lib/...` 별칭으로 import 한다
 * (Next 빌드는 tsconfig의 paths로 이 별칭을 해석한다). 하지만 Node 내장 테스트
 * 러너는 tsconfig의 paths를 모르기 때문에, 테스트가 소스 파일을 로드할 때
 * 별칭을 만나면 해석하지 못한다. 이 훅이 `@/x` → `<프로젝트 루트>/x`로 바꿔주고,
 * 확장자가 없으면 `.ts`/`.tsx`/`index.ts`를 붙여 실제 파일로 이어준다.
 *
 * 타입 스트리핑 특성상 런타임 해석에만 관여하며, 타입 검증은 tsconfig.test.json이
 * 별도로 수행한다. (register.mjs에서 module.register로 등록)
 */
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import path from 'node:path'

const root = process.cwd()

export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith('@/')) {
    let abs = path.join(root, specifier.slice(2))
    if (!path.extname(abs)) {
      if (existsSync(`${abs}.ts`)) abs = `${abs}.ts`
      else if (existsSync(`${abs}.tsx`)) abs = `${abs}.tsx`
      else if (existsSync(path.join(abs, 'index.ts'))) abs = path.join(abs, 'index.ts')
    }
    return nextResolve(pathToFileURL(abs).href, context)
  }
  return nextResolve(specifier, context)
}
