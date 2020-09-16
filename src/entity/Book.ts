import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';

import { Chapter } from './Chapter';
import { MyBasicEntity } from './_Basic';

export enum TYPE {
  未分类,
  玄幻,
  奇幻,
  修真,
  仙侠,
  都市,
  青春,
  历史,
  穿越,
  网游,
  竞技,
  科幻,
  灵异,
}

@Entity()
@Index(['title', 'author'], { unique: true })
export class Book extends MyBasicEntity {
  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'varchar', length: '50' })
  public title: string;

  @Column({ type: 'varchar', length: '50' })
  public author: string;

  @Column()
  public coverImgLink: string;

  @Column()
  public summary: string;

  @Column({ default: true })
  public finish: boolean;

  @Column({ type: 'enum', enum: TYPE, default: TYPE.未分类 })
  public type: TYPE;

  @Column({ default: 0 })
  public rank: number;

  @OneToMany((type) => Chapter, (chapters) => chapters.book, { cascade: true })
  public chapters: Chapter[];
}
