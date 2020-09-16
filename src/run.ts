import { Downloader } from './Downloader';
import { XbiqugeLaParser } from './parser';
import { getConnectionByEnv } from './DbConnect';
import { SerialTask } from './task/';

async function run() {
  const downloader = new Downloader();
  const parser = new XbiqugeLaParser();
  const connection = await getConnectionByEnv();
  const task = new SerialTask({ parser, downloader, connection });

  await task.run('http://www.xbiquge.la/paihangbang/');
}

run();
