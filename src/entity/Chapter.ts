import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';
import { gzipSync, unzipSync } from 'zlib';

import { Book } from './Book';
import { MyBasicEntity } from './_Basic';

@Entity()
export class Chapter extends MyBasicEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'text' })
  public content: string;

  @Column({ type: 'smallint' })
  public index: number;

  @Column({ type: 'varchar', length: '50' })
  public title: string;

  @ManyToOne((type) => Book, (book) => book.chapters)
  public book: Book;
}
