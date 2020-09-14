export interface IParser {
  baseUrl: string;
  parseHomePage: (rawText: string) => string[];
  parseDetail: (rawText: string) => IDetail;
  parseContent: (rawText: string) => string;
}

export enum PARSER_TYPE {
  HOME_PAGE,
  DETAIL_PAGE,
  CONTENT_PAGE,
}

export interface IDetail {
  title: string;
  author: string;
  coverImgLink: string;
  summary: string;
  chapters: IChapters[];
}

export interface IChapters {
  index: number;
  title: string;
  link: string;
}

export interface IContent {
  title: string;
  content: string;
}
