import { sleep } from '../helper';
import { logger } from '../Logger';
import { Book, Chapter } from '../entity';

import { IChapters, ITaskOptions, TASK_ERROR_TYPE } from '../index';
import { BaseTask } from './BaseTask';

/**
 * 串行获取，一本小说下载完才会下载另外一本
 * 如果希望更加保守的使用爬虫，并且不希望定时执行，那么使用这个类会比较好。
 */
export class SerialTask extends BaseTask {
  public constructor(options?: ITaskOptions) {
    super(options);
    this.options.parallel = false;
  }

  /** 通过Promise.all达到并行执行的效果 */
  public async setupRunOrder(): Promise<void> {
    await this.detectDbEmpty();
    let res1 = await this.getHomePage();
    await this.getDetailPage(res1);
  }

  public async getHomePage(): Promise<string[]> {
    const homePageHtml = await this.downloader.download(this.options.homePageUrl);
    return this.parser.parseHomePage(homePageHtml);
  }

  public async getDetailPage(detailPagesUrl: string[], nest = true): Promise<void> {
    for (const url of detailPagesUrl) {
      let detailPageHtml = await this.downloader.dlDetailAndCollectError(url, this.detailFailQueue);
      if (detailPageHtml === null) continue;

      const res = this.parser.parseDetail(detailPageHtml);

      let book = await Book.saveOne(res);

      logger.info(`${res.title}简介信息已经入库...`);
      // 如果不希望函数进行深层次的解析，应该将nest置为false，中止函数进一步解析
      if (nest) await this.getContentPage(res.chapters, book);
      await sleep(this.options.detailPageTimeout); // 休眠
    }
  }

  public async getContentPage(contentPagesUrl: IChapters[], book?: Book): Promise<void> {
    for (const chapterMap of contentPagesUrl) {
      await sleep(this.options.contentPageTimeout); // 休眠

      let contentPageHtml = await this.downloader.dlContentAndCollectError(chapterMap, book, this.contentFailQueue);
      if (contentPageHtml === null) continue;

      const res = this.parser.parseContent(contentPageHtml);

      await Chapter.saveOne(book, chapterMap, res);

      logger.info(`章节 ${chapterMap.title} 已经入库`);
    }
  }

  private async detectDbEmpty(): Promise<void> {
    const res1 = await Book.count({});
    const res2 = await Chapter.count({});
    if (res1 !== 0 || res2 !== 0) {
      let err = new Error('数据库非空，请备份已有数据后删除...');
      err['__tag'] = TASK_ERROR_TYPE.DB_ERROR;
      throw err;
    }
  }
}
