import { apiFetch } from './client';

interface KeywordsResponse {
  keywords: string[];
}

/** 선택 가능한 키워드 목록. 화면이 키워드를 하드코딩하지 않도록 서버에서 받는다. */
export async function fetchKeywords(): Promise<string[]> {
  const { keywords } = await apiFetch<KeywordsResponse>('/keywords');
  return keywords;
}
