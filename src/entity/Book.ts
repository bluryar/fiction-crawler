import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';

import { Chapter } from './Chapter';
import { MyBasicEntity } from './_Basic';

@Entity()
@Index(['title', 'author'], { unique: true })
export class Book extends MyBasicEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column()
  public title: string;

  @Column()
  public author: string;

  @Column()
  public coverImgLink: string;

  @Column()
  public summary: string;

  @OneToMany((type) => Chapter, (chapters) => chapters.book, { cascade: true })
  public chapters: Chapter[];
}
