import { Downloader } from './Downloader';
import { XbiqugeLaFinishBookParser, XbiqugeLaParser } from './parser';
import { getMysqlConnectionByEnv, getRedisConnectionByEnv } from './DbConnect';
import { ParallelTask, SerialTask } from './task/';

async function runSerial() {
  const downloader = new Downloader();
  const parser = new XbiqugeLaParser();
  const mysqlConnection = await getMysqlConnectionByEnv();

  const task = new SerialTask({
    parser,
    downloader,
    mysqlConnection,
    redisConnection: null,
    homePageUrl: 'http://www.xbiquge.la/paihangbang/',
  });

  await task.run();
}

// runSerial();

async function runParallel() {
  const downloader = new Downloader();
  const parser = new XbiqugeLaFinishBookParser();
  const mysqlConnection = await getMysqlConnectionByEnv();
  const redisConnection = await getRedisConnectionByEnv('http://www.xbiquge.la');

  const task = new ParallelTask({
    parser,
    downloader,
    mysqlConnection,
    redisConnection,
    homePageUrl: 'http://www.xbiquge.la/paihangbang/',
    detailPageTimeout: 300,
    contentPageTimeout: 100,
  });

  await task.run();
}

runParallel();
