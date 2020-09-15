import { Connection } from 'typeorm';
import path from 'path';

import { sleep, divideArray, bundleHttpError, dumpFailQueue } from '../helper';
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
  public constructor(options?: ITaskOptions) {
    this.detailFailQueue = [];
    this.contentFailQueue = new Map<Book, IChapters[]>();

    this.parser = options.parser;
    this.downloader = options.downloader;
    this.connection = options.connection;

    this.options = {
      ...{
        parallel: 1,
        detailPageTimeout: 2 * 60 * 1000,
        contentPageTimeout: 100,
        failQueueRetry: 2,
        downloadRetry: 10,
        downloadTimeout: 10000,
        closeDBConnection: true,
        failTaskToWriteInDir: path.join(__dirname, '../../', 'out', '/'),
        greedyMode: false, // 这一项会无视数据库中的唯一主键约束
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
      logger.error('无法部分失败任务，请手动处理或重试');
      if (this.detailFailQueue.length > 0 || this.contentFailQueue.size > 0) {
        dumpFailQueue(this.options.failTaskToWriteInDir, this.detailFailQueue, this.contentFailQueue);
      }
      // 将任务Dump到一个文件夹中
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
      let book = new Book();
      book.author = res.author;
      book.summary = res.summary;
      book.title = res.title;
      book.coverImgLink = res.coverImgLink;

      try {
        book = await book.save();
        logger.info(`${res.title}简介信息已经入库...`);
      } catch (error) {
        error.__tag = TASK_ERROR_TYPE.DB_ERROR;
        if (this.options.greedyMode && error.code === 'ER_DUP_ENTRY') {
          logger.info(
            `<<${res.title}>> 已经存在，由于开启贪心模式，因此会尝试获取这本书的缺失部分，尽管已经这本书已经下载完全了`,
          );
          book = await Book.findOne({ where: { author: book.author, title: book.title } });
        } else throw error; // 如果遇到数据库错误，就立即退出程序
      }

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
      chapter.content = Buffer.from(res);
      chapter.title = titleUrlMap.title;

      try {
        await Chapter.gzipChapterContent(chapter).save();
      } catch (error) {
        error.__tag = TASK_ERROR_TYPE.DB_ERROR;
        if (this.options.greedyMode && error.code === 'ER_DUP_ENTRY') {
          logger.info(`${chapter.title} 已经在数据库中...`);
          continue;
        } else throw error; // 如果遇到数据库错误，就立即退出程序
      }

      logger.info(`章节 ${titleUrlMap.title} 已经入库`);
    }

    if (httpErrorArr.length > 0) throw bundleHttpError(httpErrorArr); // 集中处理HTTP请求错误
  }
}
