// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');
import { Connection, getManager, MoreThanOrEqual } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { getMysqlConnectionByEnv, getRedisConnectionByEnv } from '../src/DbConnect';
import { Book, Chapter } from '../src/entity';
import { Redis } from 'ioredis';

let mysqlConnection: Connection;
let redisConnection: Redis;
describe('src/DbConnect.ts', () => {
  it('Entity CRUD should work', async () => {
    try {
      const manager = getManager();

      let book = new Book();
      book.author = '李二';
      book.summary = 'fk';
      book.coverImgLink = 'fk';
      book.title = '里寡妇';

      let chapter = new Chapter();
      chapter.content = Buffer.from('fkfkfkf');
      chapter.index = 1;
      chapter.title = '第一章';
      chapter.book = book;

      let str = fs.readFileSync(path.join(__dirname, 'assets/text')).toString();

      try {
        await book.save();
        await chapter.save();

        const res = await manager.count(Book, {});
        assert(res === 1);
        const entity = await await manager.findOne(Book, { author: '李二' });
        assert(entity.created_at instanceof Date);

        let chapter2 = new Chapter();
        chapter2.index = 2;
        chapter2.content = Buffer.from(str);
        chapter2.title = '第一章';
        let chapter3 = new Chapter();
        chapter3.index = 3;
        chapter3.content = Buffer.from(str);
        chapter3.title = '第一章';
        await Chapter.gzipChapterContent(chapter2).save();
        await chapter3.save();
        let resArr = await Chapter.find({ where: { index: MoreThanOrEqual(2) } });
        assert(resArr[1].content.length > resArr[0].content.length);
        let str2 = Chapter.unzipChapterContent(resArr[0]).content.toString();
        assert(str2 === str);
        console.log();
      } catch (error) {
        console.log(error);
      }
    } catch (error) {
      console.log(error);
    }
  });

  it('getRedisConnectionByEnv Connect well', async () => {

    const res = await redisConnection.set('test', 'test');
    assert(res === 'OK');
    const res2 = await redisConnection.get('test');
    assert(res2 === 'test');
    const res3 = await redisConnection.del('test');
    assert(res3 === 1);

    const res4 = await redisConnection.lrange('fkfk', 0, -1);
    assert(res4.length === 0);
    const res5 = await redisConnection.rpush('test2', JSON.stringify([{ test: 1 }, { test2: 2 }]));
    assert(res5 === 1);

    const res6 = await redisConnection.lpop('test2');
    console.log(res6);
  });

  before(async function () {
    mysqlConnection = await getMysqlConnectionByEnv();
    redisConnection = await getRedisConnectionByEnv('test');
  });
  beforeEach(async () => {
    let manager = getManager();
    await manager.delete(Chapter, {});
    await manager.delete(Book, {});
    await redisConnection.flushdb();
  });

  after(async () => {
    await mysqlConnection.close();
    await redisConnection.disconnect();
  });
});
