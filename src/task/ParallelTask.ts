import { IChapters,ITaskOptions } from '../index';
import { Book, Chapter } from '../entity';
import { sleep } from '../helper';
import { logger } from '../Logger';
import { BaseTask } from './BaseTask';
import { RedisHandler } from '../RedisHandler';

export interface IChapterByBookId {
  bookId: number;
  chapter: IChapters;
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
      let book;
      try {
        book = await Book.saveOne(parsedRes);
      } catch (error) {
        await this.redisHandler.enqueue(RedisHandler.BOOK_SUMMARY_URLS, url);
        logger.error('小说简介信息入库遇到问题，将url送回redis队列');
        throw error;
      }
      logger.info(`${book.title}简介信息已经入库...`);

      await this.redisHandler.enqueue(
        RedisHandler.CHAPTERS_CONTENT_URLS,
        parsedRes.chapters.map((chapter) => JSON.stringify({ bookId: book.id, chapter })),
      );
      logger.info(`已经将${parsedRes.title}的${parsedRes.chapters.length}个章节加入Redis缓存`);
      url = await this.redisHandler.dequeue(RedisHandler.BOOK_SUMMARY_URLS);

      await sleep(this.options.detailPageTimeout); // 休眠
    }
    logger.info('已经完成小说简介页/[detailPage]的解析');
  }

  public async getContentPage(): Promise<void> {
    let chaptersRes = await this.redisHandler.dequeue(RedisHandler.CHAPTERS_CONTENT_URLS);
    while (chaptersRes !== null) {
      let { bookId, chapter }: IChapterByBookId = JSON.parse(chaptersRes);
      logger.info(`准备解析${chapter.title}`);
      let book = await Book.findById(bookId);

      let contentPageHtml = await this.downloader.dlContentAndCollectError(chapter, book, this.contentFailQueue);
      if (contentPageHtml === null) continue;

      const res = this.parser.parseContent(contentPageHtml);

      await Chapter.saveOne(book, chapter, res);

      logger.info(`章节 ${chapter.title} 已经入库`);

      chaptersRes = await this.redisHandler.dequeue(RedisHandler.CHAPTERS_CONTENT_URLS);
      await sleep(this.options.contentPageTimeout); // 休眠
    }
  }
}
