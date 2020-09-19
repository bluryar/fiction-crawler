import { Entity, Column, PrimaryGeneratedColumn, OneToMany, Index } from 'typeorm';
import { IDetail } from '../../types/IParser';
import { TASK_ERROR_TYPE } from '../../types/ITask';

import { Chapter } from './Chapter';
import { MyBasicEntity } from './_Basic';

export enum TYPE {
  未分类 = '未分类',
  玄幻 = '玄幻',
  奇幻 = '奇幻',
  修真 = '修真',
  仙侠 = '仙侠',
  都市 = '都市',
  青春 = '青春',
  历史 = '历史',
  穿越 = '穿越',
  网游 = '网游',
  竞技 = '竞技',
  科幻 = '科幻',
  灵异 = '灵异',
}

@Entity()
@Index(['title', 'author'], { unique: true })
export class Book extends MyBasicEntity {
  public static async findById(id: number | string) {
    try {
      const res = await Book.findOne({ where: { id } });
      return res;
    } catch (error) {
      error.__tag = TASK_ERROR_TYPE.DB_ERROR;
      throw error; // 如果遇到数据库错误，就立即退出程序
    }
  }

  public static async saveOne(rawBook: IDetail): Promise<Book> {
    let book = new Book();
    book.author = rawBook.author;
    book.coverImgLink = rawBook.coverImgLink;
    book.title = rawBook.title;
    book.summary = rawBook.summary;
    // TODO 其他字段
    book = await book.save();
    return book;
  }

  @PrimaryGeneratedColumn()
  public id: number;

  @Column({ type: 'varchar', length: '50' })
  public title: string;

  @Column({ type: 'varchar', length: '50' })
  public author: string;

  @Column()
  public coverImgLink: string;

  @Column({ type: 'varchar', length: '1000' })
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
