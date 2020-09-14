import { Connection } from 'typeorm';

import { sleep, divideArray, bundleHttpError } from '../helper';
import { logger } from '../Logger';
import { Book, Chapter } from '../entity';

import { IChapters, IParser } from '../../types/IParser';
import { TASK_ERROR_TYPE, ITaskOptions, ITask } from '../../types/ITask';
import { IDownloader } from '../../types/IDownloader';

/** 基类，继承此类进行扩展, 该类只进行本机任务，需要分布式的可继承此类重写ITask接口规定的方法 */
export class LocalTask implements ITask {
  public detailFailQueue: string[];
  public contentFailQueue: Map<Book, IChapters[]>;
  public options: ITaskOptions;

  private downloader: IDownloader;
  private parser: IParser;
  private connection: Connection;

  // eslint-disable-next-line max-params
  public constructor(parser: IParser, downloader: IDownloader, connection: Connection, options?: ITaskOptions) {
    this.detailFailQueue = [];
    this.contentFailQueue = new Map<Book, IChapters[]>();

    this.parser = parser;
    this.downloader = downloader;
    this.connection = connection;

    this.options = {
      ...{
        parallel: 2,
        detailPageTimeout: 10 * 60 * 1000,
        contentPageTimeout: 333,
        failQueueRetry: 2,
        downloadRetry: 5,
        downloadTimeout: 10000,
        closeDBConnection: true,
      },
      ...options,
    };

    this.downloader.setRetry(this.options.downloadRetry);
    this.downloader.setTimeout(this.options.downloadTimeout);
  }

  /** 通过Promise.all达到并行执行的效果 */
  public async run(rankPageUrl: string): Promise<void> {
    try {
      // 1. 解析首页 //////////
      let bookLinkArry: string[] = await this.getHomePage(rankPageUrl);

      // 2. 开始下载书本 //////////
      // 并行处理
      await Promise.all(divideArray(bookLinkArry, this.options.parallel).map((arr) => this.getDetailPage(arr)));

      // 3. 尝试处理失败任务 //////////
      await this.handlingFailQueue();
    } catch (error) {
      if (error.__tag === TASK_ERROR_TYPE.HTTP_ERROR) {
        logger.error('http请求错误，请检查网络后重启...');
      } else if (error.__tag === TASK_ERROR_TYPE.DB_ERROR)
        logger.error('数据库连接失败, 请检查数据库配置文件和网络...');
      else logger.info('未知错误，请查看日志...');

      logger.error(error);
      console.log(error);
    }
    if (this.options.closeDBConnection) {
      await this.connection.close();
      logger.info('数据库关闭');
    }
  }

  public async handlingFailQueue(retry = this.options.failQueueRetry): Promise<void> {
    if (retry === 0) {
      logger.error('无法处理以下任务，请手动处理或重试：');
      if (this.detailFailQueue.length > 0) logger.error(`this.detailFailQueue: ${this.detailFailQueue.toString()}`);
      if (this.contentFailQueue.size > 0) {
        for (const [book, chapters] of this.contentFailQueue) {
          logger.error(`this.contentFailQueue: ${[book, chapters]}`);
        }
      }
      return;
    }

    if (this.detailFailQueue.length > 0) await this.getDetailPage(this.detailFailQueue);
    if (this.contentFailQueue.size > 0) {
      for (const [book, chapters] of this.contentFailQueue) {
        await this.getContentPage(chapters, book);
      }
    }

    if (this.detailFailQueue.length > 0 || this.contentFailQueue.size > 0) await this.handlingFailQueue(retry - 1);
  }

  public async getHomePage(homePageUrl: string): Promise<string[]> {
    try {
      const homePageHtml = await this.downloader.download(homePageUrl);
      return this.parser.parseHomePage(homePageHtml);
    } catch (error) {
      error.__tag = TASK_ERROR_TYPE.HTTP_ERROR;
      throw error; // 如果下载失败，立即终结任务
    }
  }

  public async getDetailPage(detailPagesUrl: string[], nest = true): Promise<void> {
    let httpErrorArr: Error[] = [];
    for (const url of detailPagesUrl) {
      let detailPageHtml;
      try {
        detailPageHtml = await this.downloader.download(url);
      } catch (error) {
        // 如果遇到HTTP错误，先跳过本次循环
        error.__tag = TASK_ERROR_TYPE.HTTP_ERROR;
        httpErrorArr.push(error);
        this.detailFailQueue.push(url);
        logger.error(`小说: ${url} 下载失败... 跳过该书籍...`);
        continue;
      }

      const res = this.parser.parseDetail(detailPageHtml);
      const book = new Book();
      book.author = res.author;
      book.summary = res.summary;
      book.title = res.title;
      book.coverImgLink = res.coverImgLink;

      try {
        await book.save();
      } catch (error) {
        error.__tag = TASK_ERROR_TYPE.DB_ERROR;
        throw error; // 如果遇到数据库错误，就立即退出程序
      }

      logger.info(`${res.title}简介信息已经入库...`);

      // 如果不希望函数进行深层次的解析，应该将nest置为false，中止函数进一步解析
      if (nest) await this.getContentPage(res.chapters, book);

      await sleep(this.options.detailPageTimeout); // 休眠
    }

    if (httpErrorArr.length > 0) throw bundleHttpError(httpErrorArr); // 集中处理HTTP请求错误
  }

  public async getContentPage(contentPagesUrl: IChapters[], book?: Book): Promise<void> {
    let httpErrorArr: Error[] = [];

    for (const titleUrlMap of contentPagesUrl) {
      await sleep(this.options.contentPageTimeout); // 休眠

      let contentPageHtml;
      try {
        contentPageHtml = await this.downloader.download(titleUrlMap.link);
      } catch (error) {
        error.__tag = TASK_ERROR_TYPE.HTTP_ERROR;
        httpErrorArr.push(error);
        // 保存必要信息
        if (this.contentFailQueue.has(book)) {
          const failChapters = this.contentFailQueue.get(book);
          failChapters.push(titleUrlMap);
        } else this.contentFailQueue.set(book, [titleUrlMap]);
        logger.error(`<<${book.title}>> 章节: ${titleUrlMap.title} 下载失败... 跳过该章节...`);
        continue; // 终止本次请求及其后续数据库操作
      }

      const res = this.parser.parseContent(contentPageHtml);
      const chapter = new Chapter();
      chapter.index = titleUrlMap.index;
      chapter.book = book;
      chapter.content = res;
      chapter.title = titleUrlMap.title;

      try {
        await chapter.save();
      } catch (error) {
        error.__tag = TASK_ERROR_TYPE.DB_ERROR;
        throw error;
      }

      logger.info(`章节 ${titleUrlMap.title} 已经入库`);
    }

    if (httpErrorArr.length > 0) throw bundleHttpError(httpErrorArr); // 集中处理HTTP请求错误
  }
}

// TODO 修正《:"ER_DUP_ENTRY: Duplicate entry 》 引起的数据库连接错误，需要在Chapter实体上增加一个唯一键，然后在次增加逻辑，当遇到DUP_ENTRY时，不再退出程序。
// 对于getDetailPage，需要校验在DetailPage获得的连接数与数据库中的Chapters数是否一致，否则应该放行，如果一直，则需要跳过这本书
// 对于getContentPage，则无视DUP约束，当遇到DUP错误时跳过。

// 以上功能与失败处理方法有冲突：失败处理会尽可能保证书籍的章节完整性，因此该功能需要谨慎实现以减少不必要的HTTP请求数

// TODO 压缩存储
