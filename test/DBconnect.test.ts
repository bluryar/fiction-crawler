// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');
import { getManager } from 'typeorm';

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
      chapter.content = 'fkfkfkf';
      chapter.title = '第一章';
      chapter.book = book;

      try {
        await book.save();
        await chapter.save();

        const res = await manager.count(Book, {});
        assert(res === 1);
        const entity = await await manager.findOne(Book, { author: '李二' });
        assert(entity.created_at instanceof Date);
      } catch (error) {
        console.log(error);
      }

      await connect.close();
    } catch (error) {
      console.log(error);
    }
  });
});
