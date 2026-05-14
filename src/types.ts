export interface SearchResult {
  title: string;
  url: string;
  displayUrl: string;
  description: string;
  age: string | null;
  position: number;
}

export interface FaqResult {
  question: string;
  answer: string;
}

export interface SearchResponse {
  web: SearchResult[];
  faq: FaqResult[];
}
