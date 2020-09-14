import { Entity, Column, PrimaryGeneratedColumn, ManyToOne } from 'typeorm';

import { Book } from './Book';
import { MyBasicEntity } from './_Basic';

@Entity()
export class Chapter extends MyBasicEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column('text')
  public content: string;

  @Column()
  public title: string;

  @ManyToOne((type) => Book, (book) => book.chapters)
  public book: Book;
}
