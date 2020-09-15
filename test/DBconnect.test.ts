// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');
import { getManager, MoreThanOrEqual } from 'typeorm';
import fs from 'fs';
import path from 'path';
import { getConnectionByEnv } from '../src/DbConnect';
import { Book, Chapter } from '../src/entity';

describe('src/DbConnect.ts', () => {
  it('Entity CRUD should work', async () => {
    try {
      const connect = await getConnectionByEnv();

      const manager = getManager();

      const res = await manager.count(Book);
      console.log(res);

      await manager.delete(Chapter, {});
      await manager.delete(Book, {});

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

      await connect.close();
    } catch (error) {
      console.log(error);
    }
  });
});
