import { Downloader } from './Downloader';
import { XbiqugeLaParser } from './parser';
import { getMysqlConnectionByEnv } from './DbConnect';
import { SerialTask } from './task/';

async function run() {
  const downloader = new Downloader();
  const parser = new XbiqugeLaParser();
  const mysqlConnection = await getMysqlConnectionByEnv();
  
  const task = new SerialTask({
    parser,
    downloader,
    mysqlConnection,
    homePageUrl: 'http://www.xbiquge.la/paihangbang/',
  });

  await task.run();
}

run();
