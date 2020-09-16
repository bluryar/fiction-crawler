import { sleep, bundleHttpError } from '../helper';
import { logger } from '../Logger';
import { Book, Chapter } from '../entity';

import { IChapters } from '../../types/IParser';
import { ITaskOptions } from '../../types/ITask';
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
  public async setupRunOrder(rankPageUrl: string): Promise<void> {
    let res1 = await this.getHomePage(rankPageUrl);
    await this.getDetailPage(res1);
  }

  public async getHomePage(homePageUrl: string): Promise<string[]> {
    const homePageHtml = await this.downloader.download(homePageUrl);
    return this.parser.parseHomePage(homePageHtml);
  }

  public async getDetailPage(detailPagesUrl: string[], nest = true): Promise<void> {
    let httpErrorArr: Error[] = [];
    for (const url of detailPagesUrl) {
      let detailPageHtml;
      try {
        detailPageHtml = await this.downloader.download(url);
      } catch (error) {
        // 如果遇到HTTP错误，先跳过本次循环
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

      book = await book.save();
      logger.info(`${res.title}简介信息已经入库...`);
      // 如果不希望函数进行深层次的解析，应该将nest置为false，中止函数进一步解析
      if (nest) await this.getContentPage(res.chapters, book);
      await sleep(this.options.detailPageTimeout); // 休眠
    }

    if (httpErrorArr.length > 0) throw bundleHttpError(httpErrorArr); // 集中处理HTTP请求错误
  }

  public async getContentPage(contentPagesUrl: IChapters[], book?: Book): Promise<void> {
    let httpErrorArr: Error[] = [];

    for (const chapterMap of contentPagesUrl) {
      await sleep(this.options.contentPageTimeout); // 休眠

      let contentPageHtml;
      try {
        contentPageHtml = await this.downloader.download(chapterMap.link);
      } catch (error) {
        httpErrorArr.push(error);
        // 保存必要信息
        if (this.contentFailQueue.has(book)) {
          const failChapters = this.contentFailQueue.get(book);
          failChapters.push(chapterMap);
        } else this.contentFailQueue.set(book, [chapterMap]);
        logger.error(`<<${book.title}>> 章节: ${chapterMap.title} 下载失败... 跳过该章节...`);
        continue; // 终止本次请求及其后续数据库操作
      }

      const res = this.parser.parseContent(contentPageHtml);

      const chapter = new Chapter();
      chapter.index = chapterMap.index;
      chapter.book = book;
      chapter.content = Buffer.from(res);
      chapter.title = chapterMap.title;
      await Chapter.gzipChapterContent(chapter).save();
      logger.info(`章节 ${chapterMap.title} 已经入库`);
    }

    if (httpErrorArr.length > 0) throw bundleHttpError(httpErrorArr); // 集中处理HTTP请求错误
  }
}
