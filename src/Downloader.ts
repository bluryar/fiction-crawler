import { IDownloader, TASK_ERROR_TYPE, IChapters } from './index';
import { logger } from './Logger';
import got from 'got';
import { Book } from './entity';

export interface IDetailPageDownload {
  url: string;
  queue: string;
}
export interface IContentPageDownload {
  chapterMap: IChapters;
  queue: Map<Book, IChapters[]>;
}

export class Downloader implements IDownloader {
  private retry: number;
  private timeout: number;

  public constructor(retry?: number, timeout?: number) {
    this.retry = retry;
    this.timeout = timeout;
  }

  public setRetry(val: number) {
    this.retry = val;
  }
  public setTimeout(val: number) {
    this.timeout = val;
  }
  public async download(url: string): Promise<string> {
    try {
      const res = await got(url, {
        retry: this.retry,
        timeout: this.timeout,
        headers: {
          'user-agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/85.0.4183.102 Safari/537.36 Edg/85.0.564.51',
          connection: 'keep-alive',
        },
        hooks: {
          beforeRetry: [
            (options, error, retryCount) => {
              console.log(`${url} 尝试重新获取...${retryCount}/${this.retry}`);
              logger.info(`${url} 尝试重新获取...${retryCount}/${this.retry}`);
            },
          ],
        },
      });
      console.log('下载成功');
      return res.body;
    } catch (error) {
      console.log(`尝试 GET - ${url} 失败...`);
      error.__tag = TASK_ERROR_TYPE.HTTP_ERROR;
      throw error;
    }
  }

  public async dlDetailAndCollectError(url: string, queue: string[]): Promise<string | null> {
    let html;
    try {
      html = await this.download(url);
      return html;
    } catch (error) {
      // 如果遇到HTTP错误，先跳过本次循环
      queue.push(url);
      logger.error(`小说: ${url} 下载失败... 跳过该书籍...`);
      return null;
    }
  }
  public async dlContentAndCollectError(
    chapterMap: IChapters,
    book: Book,
    queue: Map<Book, IChapters[]>,
  ): Promise<string | null> {
    let html;
    try {
      html = await this.download(chapterMap.link);
      return html;
    } catch (error) {
      // 保存必要信息
      if (queue.has(book)) {
        const failChapters = queue.get(book);
        failChapters.push(chapterMap);
      } else queue.set(book, [chapterMap]);
      logger.error(`<<${book.title}>> 章节: ${chapterMap.title} 下载失败... 跳过该章节...`);
      return null;
    }
  }
}

// TODO 字符编码的检测和转换：
// 思路：
// 用jschardet检查返回get到的字符串的前10位，如果是UTF8则放行，如果是GBK等，则将其转换成流再转换成字符串
