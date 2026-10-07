import { cookies } from 'next/headers';
import { DEFAULT_LANG, LANG_COOKIE, isLang, makeI18n, type Lang } from './index';

// Language for server components and route handlers, from the "lang" cookie.

export async function getLang(): Promise<Lang> {
  const value = (await cookies()).get(LANG_COOKIE)?.value;
  return isLang(value) ? value : DEFAULT_LANG;
}

export async function getI18n() {
  return makeI18n(await getLang());
}
