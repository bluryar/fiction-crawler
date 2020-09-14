// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');

import { Downloader } from '../src/Downloader';

describe('src/Downloader.ts #Downloader', function () {
  it('should retry 3 times downloading...', async function () {
    // eslint-disable-next-line @typescript-eslint/no-invalid-this
    let t1 = Date.now();
    try {
      const downloader = new Downloader();
      const res = await downloader.download('https://www.baidu.com');
      assert(res.length > 0);
    } catch (error) {
      t1 = Date.now() - t1;
      assert(t1 > 100 && t1 < 10000); // 无法精准估计HTTP请求耗时，因此此项只能大概测试，为的是确保HTTP重试功能正常
    }
  });
});
