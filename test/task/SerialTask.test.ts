// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');

import { SerialTask } from '../../src/task/SerialTask';
import { Downloader } from '../../src/Downloader';
import { XbiqugeLaParser } from '../../src/parser';
import { getMysqlConnectionByEnv } from '../../src/DbConnect';
import { Connection, getManager } from 'typeorm';
import { Book, Chapter } from '../../src/entity';
// import { before, beforeEach, it } from 'mocha';

let mysqlConnection: Connection;
let downloader = new Downloader();
let parser = new XbiqugeLaParser();
describe('src/task/SerialTask.ts', async function () {
  before(async function () {
    mysqlConnection = await getMysqlConnectionByEnv();
  });
  beforeEach(async () => {
    let manager = getManager();
    await manager.delete(Chapter, {});
    await manager.delete(Book, {});
  });

  it('SerialTask#handlingFailQueue', async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(15000);

    let task = new SerialTask({
      parser,
      downloader,
      mysqlConnection,
      detailPageTimeout: 0,
      redisConnection: null,
      homePageUrl: 'http://www.xbiquge.la/paihangbang/',
    });
    let book = new Book();
    book.title = '1';
    book.author = '1';
    book.summary = '1';
    book.coverImgLink = '1';
    const book2 = await book.save();
    task.contentFailQueue.set(book2, [
      { index: 1, title: '第一章 天黑别出门', link: 'http://www.xbiquge.la/15/15409/8163818.html' },
    ]);
    await task.handlingFailQueue(1);
    let chapters = await Chapter.findOne({});
    assert(chapters.title === '第一章 天黑别出门');
  });

  it('SerialTask#getDetailPage', async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(15000);
    let task = new SerialTask({
      parser,
      downloader,
      mysqlConnection,
      detailPageTimeout: 0,
      redisConnection: null,
      homePageUrl: 'http://www.xbiquge.la/paihangbang/',
    });
    await task.getDetailPage(['http://www.xbiquge.la/15/15409/'], false);

    try {
      await task.getDetailPage(['http://www.xbiquge.la/15/15409/'], false);
    } catch (error) {
      assert(!!error);
    }

    let books: Book[] = await Book.find({});
    assert(books.length === 1);
    assert(books[0].title === '牧神记');
  });

  it('SerialTask#getContentPage', async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    this.timeout(15000);
    let task = new SerialTask({
      parser,
      downloader,
      mysqlConnection,
      detailPageTimeout: 0,
      redisConnection: null,
      homePageUrl: 'http://www.xbiquge.la/paihangbang/',
    });
    await task.getContentPage([
      { index: 1, title: '第一章 天黑别出门', link: 'http://www.xbiquge.la/15/15409/8163818.html' },
    ]);
    let chapters: Chapter[] = await Chapter.find({});
    assert(chapters.length === 1);
    assert(chapters[0].title === '第一章 天黑别出门');
    assert(chapters[0].index === 1);
  });

  after(async () => {
    await mysqlConnection.close();
  });
});
