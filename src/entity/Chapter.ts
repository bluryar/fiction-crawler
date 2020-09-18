import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { gzipSync, unzipSync } from 'zlib';
import { IChapters } from '../../types/IParser';

import { Book } from './Book';
import { MyBasicEntity } from './_Basic';

@Entity()
@Index(['title', 'book', 'index'], { unique: true })
export class Chapter extends MyBasicEntity {
  public static gzipChapterContent(chapter: Chapter): Chapter {
    chapter.content = gzipSync(chapter.content);
    return chapter;
  }
  public static unzipChapterContent(chapter: Chapter): Chapter {
    chapter.content = unzipSync(chapter.content);
    return chapter;
  }

  public static async saveOne(book: Book, rawChapter: IChapters, content: string): Promise<Chapter> {
    let chapter = new Chapter();
    chapter.index = rawChapter.index;
    chapter.title = rawChapter.title;
    chapter.book = book;
    chapter.content = Buffer.from(content);
    chapter = await Chapter.gzipChapterContent(chapter).save();
    return chapter;
  }

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'blob' })
  public content: Buffer;

  @Column({ type: 'smallint' })
  public index: number;

  @Column({ type: 'varchar', length: '50' })
  public title: string;

  @ManyToOne((type) => Book, (book) => book.chapters)
  public book: Book;
}
