import path from 'path';
import { Connection } from 'typeorm';
import { IDownloader, IChapters, IParser, ITaskOptions } from '../index';
import { Book } from '../entity';
import { outermostErrorHandle } from '../ErrorHandler';
import { dumpFailQueue } from '../helper';
import { logger } from '../Logger';

/**
 * 该类的子类应该实现 ITask和ITaskRun接口，如果不实现run方法，程序会根据选项决定是否关闭数据库连接，然后退出或挂起
 */
export class BaseTask {
  /** 收集小说简介页的失败任务队列 */
  public detailFailQueue: string[];

  /** 收集小说章节内容页的失败任务队列 */
  public contentFailQueue: Map<Book, IChapters[]>;

  public options: ITaskOptions = {
    downloader: null,
    parser: null,
    mysqlConnection: null,
    redisConnection: null,

    homePageUrl: '',
    parallel: null,
    detailPageTimeout: 2 * 60 * 1000,
    contentPageTimeout: 333,
    failQueueRetry: 2,
    downloadRetry: 10,
    downloadTimeout: 10000,
    closeDBConnection: true,
    failTaskToWriteInDir: path.join(__dirname, '../../', 'out', '/'),
  };

  protected downloader: IDownloader;
  protected parser: IParser;
  protected mysqlConnection: Connection;

  public constructor(options?: ITaskOptions) {
    this.options = { ...this.options, ...options };
    this.detailFailQueue = [];
    this.contentFailQueue = new Map<Book, IChapters[]>();
    this.parser = this.options.parser;
    this.downloader = this.options.downloader;
    this.downloader.setRetry(this.options.downloadRetry);
    this.downloader.setTimeout(this.options.downloadTimeout);
    this.mysqlConnection = this.options.mysqlConnection;
  }

  public async run(): Promise<void> {
    try {
      await this.setupRunOrder();
      // . 尝试处理失败任务 //////////
      logger.info(`准备尝试开始处理任务：< ${this.options.homePageUrl} > 遇到的多次失效URL`);
      await this.handlingFailQueue();
    } catch (error) {
      outermostErrorHandle(error);
    }
    if (this.options.closeDBConnection) {
      // 某些情况下，并不希望关闭数据库的连接
      await this.mysqlConnection.close();
      logger.info('关闭数据库连接');
    }
    if (this.options.redisConnection !== null) {
      await this.options.redisConnection.disconnect();
      logger.info('关闭Redis连接接');
    }
  }

  public async handlingFailQueue(retry = this.options.failQueueRetry): Promise<void> {
    if (retry === 0) {
      // 将无法处理的任务Dump到一个文件夹中
      logger.error('无法部分失败任务，请手动处理或重试');
      if (this.detailFailQueue.length > 0 || this.contentFailQueue.size > 0) {
        dumpFailQueue(this.options.failTaskToWriteInDir, this.detailFailQueue, this.contentFailQueue);
      }
      return;
    }

    if (this.detailFailQueue.length > 0) {
      // eslint-disable-next-line @typescript-eslint/prefer-for-of
      for (let i = 0; i < this.detailFailQueue.length; i++) {
        // 遍历一遍失败任务队列，如果还有任务不成功，会被放回队列尾部，但是此次遍历的次数不会超过源队列的长度
        let url = this.detailFailQueue.shift();
        await this.getDetailPage([url]);
      }
    }

    if (this.contentFailQueue.size > 0) {
      for (const [book, chapters] of this.contentFailQueue) {
        this.contentFailQueue.delete(book);
        await this.getContentPage(chapters, book);
      }
    }

    if (this.detailFailQueue.length > 0 || this.contentFailQueue.size > 0) await this.handlingFailQueue(retry - 1);
  }

  public setupRunOrder(): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public getHomePage(): Promise<void> | Promise<Buffer> | Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  public getDetailPage(
    detailPagesUrl?: string[],
    nest = !this.options.parallel,
  ): Promise<void> | Promise<Buffer> | Promise<Map<Book, IChapters[]>> {
    throw new Error('Method not implemented.');
  }
  public getContentPage(contentPagesUrl?: IChapters[], book?: Book): Promise<void> | Promise<Buffer> | Promise<string> {
    throw new Error('Method not implemented.');
  }
}
