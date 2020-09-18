import { Redis } from 'ioredis';

export class RedisHandler {
  public static BOOK_SUMMARY_URLS = 'BOOK_SUMMARY_URLS';
  public static CHAPTERS_CONTENT_URLS = 'CHAPTERS_CONTENT_URLS';

  private connection: Redis;

  public constructor(connection: Redis) {
    this.connection = connection;
    if (this.connection === null) throw new Error('Redis缺少RedisConnection参数');
  }

  public async getListLen(key: string) {
    const res = await this.connection.llen(key);
    return res;
  }

  // public async getHomePageUrlList(key: string) {
  //   const len = await this.getListLen(key);
  //   const list = await this.connection.lrange(key, 0, len);
  //   return list;
  // }

  public async enqueue(key: string, value: string | string[]) {
    const res = await this.connection.rpush(key, value);
    return res;
  }
  public async dequeue(key: string) {
    const res = await this.connection.lpop(key);
    return res;
  }
}
