// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');

import { ParallelTask } from '../../src/task/';
import { Downloader } from '../../src/Downloader';
import { XbiqugeLaParser } from '../../src/parser';
import { getMysqlConnectionByEnv, getRedisConnectionByEnv } from '../../src/DbConnect';
import { Connection, getManager } from 'typeorm';
import { Book, Chapter } from '../../src/entity';
import { Redis } from 'ioredis';
import { RedisHandler } from '../../src/task/RedisHandler';
import { IChapters } from '../../types/IParser';
// import { before, beforeEach, it } from 'mocha';

let mysqlConnection: Connection;
let downloader = new Downloader();
let parser = new XbiqugeLaParser();
let redisConnection: Redis;
describe('src/task/ParallelTask.ts', async function () {
  before(async function () {
    mysqlConnection = await getMysqlConnectionByEnv();
    redisConnection = await getRedisConnectionByEnv('test');
  });
  beforeEach(async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(150000);
    let manager = getManager();
    await manager.delete(Chapter, {});
    await manager.delete(Book, {});
    await redisConnection.flushdb();
  });

  it('getHomePage', async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(15000);
    let task = new ParallelTask({
      parser,
      downloader,
      mysqlConnection,
      redisConnection,
      detailPageTimeout: 0,
      homePageUrl: 'http://www.xbiquge.la/paihangbang/',
    });
    await task.getHomePage();
    let len = await redisConnection.llen(RedisHandler.BOOK_SUMMARY_URLS);
    assert(len > 0);
  });

  it('getDetailPage and getContentPage', async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(15000);
    let task = new ParallelTask({
      parser,
      downloader,
      mysqlConnection,
      redisConnection,
      detailPageTimeout: 0,
      homePageUrl: 'http://www.xbiquge.la/paihangbang/',
    });
    let len = await redisConnection.lpush(RedisHandler.BOOK_SUMMARY_URLS, 'http://www.xbiquge.la/10/10489/');
    assert(len === 1);
    await task.getDetailPage();
    let len2 = await redisConnection.llen(RedisHandler.BOOK_SUMMARY_URLS);
    assert(len2 === 0);

    let res = await redisConnection.lpop(RedisHandler.CHAPTERS_CONTENT_URLS);
    let res2 = JSON.parse(res);
    assert(res2['bookId']);
    assert(typeof res2['chapter'].index === 'number');
    let temp: IChapters = res2['chapter'];
    await redisConnection.flushdb();
    let len3 = await redisConnection.lpush(
      RedisHandler.CHAPTERS_CONTENT_URLS,
      JSON.stringify({ bookId: res2['bookId'], chapterMap: temp }),
    );
    assert(len3 === 1);
    await task.getContentPage();
    let len4 = await redisConnection.llen(RedisHandler.CHAPTERS_CONTENT_URLS);
    assert(len4 === 0);

    let res3 = await Chapter.find({});
    assert(res3.length === 1);
    assert(res3[0].content.length > 0);
  });

  after(async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(150000);
    await mysqlConnection.close();
    await redisConnection.disconnect();
  });
});
