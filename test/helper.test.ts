// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');

import { sleep, divideArray } from '../src/helper';

describe('src/helper.ts #sleep', () => {
  it('should sleep 1 second', async () => {
    let a = {
      b: 1,
    };
    await sleep(1000, () => {
      assert(a.b === 1);
    });
    a.b = 2;
  });

  it('should divide equally input array', () => {
    let arr1 = [1, 2, 3, 4, 5];
    let arr2 = [1, 2, 3, 4, 5, 6];
    let res1 = divideArray(arr1, 2);
    let res2 = divideArray(arr2, 3);
    assert(res1.length === 2);
    assert(res2.length === 3);
    assert(res1[0].length === 3);
    assert(res1[res1.length - 1].length === 2);
    assert(res2[res2.length - 1].length === 2);
  });
});
