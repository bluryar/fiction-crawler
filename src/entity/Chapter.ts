import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, Index } from 'typeorm';
import { gzipSync, unzipSync } from 'zlib';

import { Book } from './Book';
import { MyBasicEntity } from './_Basic';

@Entity()
@Index(['title', 'book'], { unique: true })
export class Chapter extends MyBasicEntity {
  public static gzipChapterContent(chapter: Chapter): Chapter {
    chapter.content = gzipSync(chapter.content);
    return chapter;
  }
  public static unzipChapterContent(chapter: Chapter): Chapter {
    chapter.content = unzipSync(chapter.content);
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
