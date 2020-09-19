// eslint-disable-next-line @typescript-eslint/no-require-imports
import assert = require('assert');
import fs from 'fs';
import { XbiqugeLaFinishBookParser, XbiqugeLaParser } from '../../src/parser';

describe('src/Parser/* Parser#parseHomePage', () => {
  it('should return a string array with lots of anchor', () => {
    const homeHtml = fs.readFileSync('test/assets/HomePage.html').toString();
    const res = new XbiqugeLaParser().parseHomePage(homeHtml);
    assert(res.length > 0);
    assert(/http/gi.test(res[0]));
  });

  it('should return a chapter summary array', () => {
    const detailHtml = fs.readFileSync('test/assets/DetailPage.html').toString();
    const res = new XbiqugeLaParser().parseDetail(detailHtml);
    assert(/http/gi.test(res.coverImgLink));
    assert(res.finish === true);
    assert(res.type === '玄幻');
    assert(res.chapters.length > 10);
    assert(/html/gi.test(res.chapters[0].link));
    assert(res.author.length > 0);
    assert(res.chapters.length === res.chapters[res.chapters.length - 1].index + 1);
  });

  it('should return a chapter text', () => {
    const contentHtml = fs.readFileSync('test/assets/ContentPage.html').toString();
    const res = new XbiqugeLaParser().parseContent(contentHtml);
    assert(res.length > 0);
    assert(/\n\n/gi.test(res));
  });

  it('XbiquegeFinishBookParser', async function () {
    const homeHtml = fs.readFileSync('test/assets/HomePage.html').toString();
    const res = new XbiqugeLaFinishBookParser().parseHomePage(homeHtml);
    assert(res.length > 0);
    assert(res[0] === 'http://www.xbiquge.la/0/656/');
    assert(res[res.length - 1] === 'http://www.xbiquge.la/24/24173/');
    assert(/http/gi.test(res[0]));
  });
});
