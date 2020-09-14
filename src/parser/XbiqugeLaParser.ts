import { IParser, IDetail } from '../../types/IParser';
import cheerio from 'cheerio';
import { logger } from '../Logger';

export class XbiqugeLaParser implements IParser {
  public baseUrl: string;
  public constructor() {
    this.baseUrl = 'http://www.xbiquge.la';
  }

  public parseHomePage(rawText: string): string[] {
    const set: Set<string> = new Set<string>();
    const $ = cheerio.load(rawText);

    const ATagNodes = $('#main > div.box h3 + ul > li:not(.ltitle):not(.more) > a').toArray();
    for (const node of ATagNodes) {
      set.add(node.attribs.href);
    }

    logger.info(`解析完成，一共获取${ATagNodes.length}条书本链接,共过滤掉${ATagNodes.length - set.size}条重复链接...`);

    return Array.from(set);
  }

  public parseDetail(rawText: string): IDetail {
    const $ = cheerio.load(rawText);

    const res: IDetail = {
      title: $('#info > h1').text(),
      author: $('#info > p:nth-child(2)')
        .text()
        .replace(/[\s\S]+：/gi, ''),
      coverImgLink: $('#fmimg > img').attr('src'),
      summary: $('#intro > p:nth-child(2)').text(),
      chapters: $('#list > dl')
        .children()
        .toArray()
        .map((ele, index) => {
          return {
            index,
            title: ele.children[0].children[0].data,
            link: this.baseUrl + ele.children[0].attribs.href,
          };
        }),
    };

    logger.info(`解析获得 ${res.chapters.length} 章节`);

    return res;
  }

  public parseContent(rawText: string): string {
    const $ = cheerio.load(rawText);

    $('#content > p').remove();

    logger.info('成功解析文本内容，并且尝试删除了网站广告内容...');

    return $('#content').text();
  }
}
