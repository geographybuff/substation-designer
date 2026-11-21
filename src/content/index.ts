import { DATA_ARTICLES } from './fromData';
import { BASE_ARTICLES, type Block, type GuideArticle } from './guide';

export type { Block, GuideArticle };

export const ARTICLES: GuideArticle[] = [...BASE_ARTICLES, ...DATA_ARTICLES];
