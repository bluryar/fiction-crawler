import { Book } from './entity';
import { TYPE } from '../src/entity';
import { Redis } from 'ioredis';
import { Connection } from 'typeorm';

export * from './entity';
export * from './parser';
export * from './Downloader';
export * from './task';
export * from './DbConnect';
export * from './RedisHandler';

export enum TASK_ERROR_TYPE {
  HTTP_ERROR,
  DB_ERROR,
  REDIS_ERROR,
}

export enum PARSER_TYPE {
  HOME_PAGE,
  DETAIL_PAGE,
  CONTENT_PAGE,
}

export interface IDownloader {
  download: (url: string) => Promise<string>;
  setTimeout: (val: number) => void;
  setRetry: (val: number) => void;
  dlDetailAndCollectError: (url: string, queue: string[]) => Promise<string | null>;
  dlContentAndCollectError: (
    chapterMap: IChapters,
    book: Book,
    queue: Map<Book, IChapters[]>,
  ) => Promise<string | null>;
}

export interface IParser {
  baseUrl: string;
  parseHomePage: (rawText: string) => string[];
  parseDetail: (rawText: string) => IDetail;
  parseContent: (rawText: string) => string;
}

export interface IDetail {
  title: string;
  author: string;
  coverImgLink: string;
  summary: string;
  type: TYPE;
  finish: boolean;
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

export interface failContentObject {
  key: Book;
  value: IChapters[];
}

export interface ITaskOptions {
  parser: IParser;
  downloader: IDownloader;
  mysqlConnection: Connection;
  redisConnection: Redis;

  homePageUrl: string;

  /**
   * 是否将DetailPage和HomePage看作独立（并行）的任务，
   * 如果选择让任务串行（Serial），那么应该让函数getDetailPage会嵌套进行getContentPage，
   * 为什么这一项不是让请求并发的执行呢？私以为没这个必要，只需要合理的设置请求间隔（xxxPageTimeout），
   * 爬虫会用一个大致的速度执行，而且经过测试，这些DAO版小说网站请求经常丢失，而且私以为不应该用太过分
   * 的频率加重对方的服务器载荷
   *
   * 如果要让爬虫真正的并行，应该怎么做？ 运行多个ParallelTask就可以
   * ParallelTask会使用redis作为存储每次getXXXPage的内容
   *  */
  parallel?: boolean;

  /** 每本小说完成后的间隔时间（单位：ms）, 默认为10分钟 */
  detailPageTimeout?: number;

  /** 每个章节之间的间隔时间 （单位：ms），默认为333ms */
  contentPageTimeout?: number;

  /**
   * 对于失败任务的重新尝试次数
   *   - 指的是对两个fail队列的总体尝试次数
   *   - 默认重试2次
   */
  failQueueRetry?: number;

  /** 每个GET请求的重试次数，默认重试5次 */
  downloadRetry?: number;

  /** 美国GET请求的最大可接受的延时，默认为10秒 */
  downloadTimeout?: number;

  /** 完成任务或者异常退出时,是否关闭数据库连接 (默认关闭) */
  closeDBConnection?: boolean;

  /** 将尝试重试仍然失败的任务写进文件中，需要指定一个目录路径 */
  failTaskToWriteInDir?: string;
}
