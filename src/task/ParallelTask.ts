import { Redis } from 'ioredis';
import { IChapters } from '../../types/IParser';
import { ITaskOptions } from '../../types/ITask';
import { Book, Chapter } from '../entity';
import { sleep } from '../helper';
import { logger } from '../Logger';
import { BaseTask } from './BaseTask';
import { RedisHandler } from './RedisHandler';

interface IChapterByBookId {
  bookId: number;
  chapterMap: IChapters;
}

/**
 * *********
 * 需要用到Redis完成去重、消息队列等功能，帮助进行模块解耦合
 * *********
 */
export class ParallelTask extends BaseTask {
  private redisHandler: RedisHandler;

  public constructor(options?: ITaskOptions) {
    super(options);
    this.options.parallel = true;
    this.redisHandler = new RedisHandler(this.options.redisConnection);
  }
  public async setupRunOrder(): Promise<void> {
    await this.getHomePage();
    await this.getDetailPage();
    await this.getContentPage();
  }
  public async getHomePage(): Promise<void> {
    let length = await this.redisHandler.getListLen(RedisHandler.BOOK_SUMMARY_URLS);
    if (length === 0) {
      const homePageHtml = await this.downloader.download(this.options.homePageUrl);
      await this.redisHandler.enqueue(RedisHandler.BOOK_SUMMARY_URLS, this.parser.parseHomePage(homePageHtml));
    }
  }

  public async getDetailPage(): Promise<void> {
    let url = await this.redisHandler.dequeue(RedisHandler.BOOK_SUMMARY_URLS);
    while (url !== null) {
      let detailPageHtml = await this.downloader.dlDetailAndCollectError(url, this.detailFailQueue);
      if (detailPageHtml === null) continue;

      let parsedRes = this.parser.parseDetail(detailPageHtml);

      let book = await Book.saveOne(parsedRes);
      logger.info(`${book.title}简介信息已经入库...`);

      await this.redisHandler.enqueue(
        RedisHandler.CHAPTERS_CONTENT_URLS,
        parsedRes.chapters.map((chapter) => JSON.stringify({ bookId: book.id, chapter })),
      );

      url = await this.redisHandler.dequeue(RedisHandler.BOOK_SUMMARY_URLS);

      await sleep(this.options.detailPageTimeout); // 休眠
    }
  }

  public async getContentPage(): Promise<void> {
    let chaptersRes = await this.redisHandler.dequeue(RedisHandler.CHAPTERS_CONTENT_URLS);
    while (chaptersRes !== null) {
      let { bookId, chapterMap }: IChapterByBookId = JSON.parse(chaptersRes);
      let book = await Book.findById(bookId);

      let contentPageHtml = await this.downloader.dlContentAndCollectError(chapterMap, book, this.contentFailQueue);
      if (contentPageHtml === null) continue;

      const res = this.parser.parseContent(contentPageHtml);

      await Chapter.saveOne(book, chapterMap, res);

      logger.info(`章节 ${chapterMap.title} 已经入库`);

      chaptersRes = await this.redisHandler.dequeue(RedisHandler.CHAPTERS_CONTENT_URLS);
      await sleep(this.options.contentPageTimeout); // 休眠
    }
  }
}
