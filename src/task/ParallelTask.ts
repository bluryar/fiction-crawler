import { IChapters } from '../../types/IParser';
import { ITaskOptions } from '../../types/ITask';
import { Book } from '../entity';

import { BaseTask } from './BaseTask';

/**
 * *********
 * 需要用到Redis完成去重、消息队列等功能，帮助进行模块解耦合
 * *********
 */
export class ParallelTask extends BaseTask {
  public constructor(options?: ITaskOptions) {
    super(options);
    this.options.parallel = true;
  }
  public setupRunOrder(rankPageUrl: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public getHomePage(homePageUrl: string): Promise<string[]> {
    throw new Error('Method not implemented.');
  }
  public getDetailPage(detailPagesUrl: string[], nest: boolean): Promise<void> {
    throw new Error('Method not implemented.');
  }
  public getContentPage(contentPagesUrl: IChapters[], book?: Book): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
