/**
 * alias-loader.mjs(resolve 훅)를 현재 프로세스에 등록한다.
 * `node --import ./scripts/register.mjs --test ...` 형태로 사용한다.
 */
import { register } from 'node:module'

register('./alias-loader.mjs', import.meta.url)
