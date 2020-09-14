import { Book } from '../src/entity';
import { IChapters } from './IParser';

export enum TASK_ERROR_TYPE {
  HTTP_ERROR,
  DB_ERROR,
}

export interface ITaskOptions {
  /** 并行任务数，default=2 */
  parallel?: number;

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
}

export interface ITask {
  /** 收集小说简介页的失败任务队列 */
  detailFailQueue: string[];

  /** 收集小说章节内容页的失败任务队列 */
  contentFailQueue: Map<Book, IChapters[]>;

  /**
   * 核心实现方法，启动一系列任务--数据库连接，爬虫下载
   */
  run: (rankPageUrl: string) => Promise<void>;

  /**
   * 处理两个失败任务队列的方法
   */
  handlingFailQueue: (retry: number) => Promise<void>;

  /**
   * 获取想要下载的书本的链接数组，此方法不进行数据库操作
   */
  getHomePage: (homePageUrl: string) => Promise<string[]>;

  /**
   * 根据getHomePage获取的目标书本数组，进行下载简介信息和章节链接（以供下一阶段使用），然后进行数据库操作
   */
  getDetailPage: (detailPagesUrl: string[], nest: boolean) => Promise<void>;

  /**
   * 根据getDetailPage获取的章节链接数组，进行下载（章节内容），然后进行数据库操作
   */
  getContentPage: (contentPagesUrl: IChapters[], book?: Book) => Promise<void>;
}
