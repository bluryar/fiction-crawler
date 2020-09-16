import { TASK_ERROR_TYPE } from '../types/ITask';
import { logger } from './Logger';

export function outermostErrorHandle(error: Error) {
  const TAG: TASK_ERROR_TYPE = error['__tag'];
  switch (TAG) {
    case TASK_ERROR_TYPE.HTTP_ERROR:
      logger.error('http请求错误，请检查网络后重启...');
      break;
    case TASK_ERROR_TYPE.DB_ERROR:
      logger.error('数据库连接失败, 请检查数据库配置文件和网络...');
      break;
    default:
      logger.info('未知错误，请查看日志...');
      break;
  }
  logger.error(error);
}
