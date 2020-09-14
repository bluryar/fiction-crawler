import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, SelectQueryBuilder } from 'typeorm';

import { Book } from './Book';
import { MyBasicEntity } from './_Basic';

@Entity()
export class Chapter extends MyBasicEntity {
  public static saveChapter(chapter: Chapter) {
    return Chapter.createQueryBuilder()
      .insert()
      .into(Chapter)
      .values({
        title: chapter.title,
        index: chapter.index,
        content: () => `COMPRESS("${chapter.content}")`,
        book: chapter.book,
      })
      .execute();
  }

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'blob' })
  public content: Buffer | string;

  @Column({ type: 'smallint' })
  public index: number;

  @Column({ type: 'varchar', length: '50' })
  public title: string;

  @ManyToOne((type) => Book, (book) => book.chapters)
  public book: Book;
}
