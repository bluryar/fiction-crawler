import { Downloader } from './Downloader';
import { XbiqugeLaParser } from './parser';
import { getMysqlConnectionByEnv } from './DbConnect';
import { SerialTask } from './task/';
import Redis from 'ioredis';
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
}

runParallel();
