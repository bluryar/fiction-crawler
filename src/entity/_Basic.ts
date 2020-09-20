import { BaseEntity, CreateDateColumn } from 'typeorm';
import { TASK_ERROR_TYPE } from '../index';

export abstract class MyBasicEntity extends BaseEntity {
  @CreateDateColumn()
  public created_at: Date;

  @CreateDateColumn()
  public updated_at: Date;

  public async save() {
    try {
      const res = await super.save();
      return res;
    } catch (error) {
      error.__tag = TASK_ERROR_TYPE.DB_ERROR;
      throw error; // 如果遇到数据库错误，就立即退出程序
    }
  }
}
