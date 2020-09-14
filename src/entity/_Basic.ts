import { BaseEntity, CreateDateColumn, Entity } from 'typeorm';

export abstract class MyBasicEntity extends BaseEntity {
  @CreateDateColumn()
  public created_at: Date;

  @CreateDateColumn()
  public updated_at: Date;
}
