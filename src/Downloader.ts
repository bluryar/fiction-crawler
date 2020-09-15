import { IDownloader } from '../types/IDownloader';
import { logger } from './Logger';
import got from 'got';

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
      throw error;
    }
  }
}

// TODO 字符编码的检测和转换：
// 思路：
// 用jschardet检查返回get到的字符串的前10位，如果是UTF8则放行，如果是GBK等，则将其转换成流再转换成字符串
