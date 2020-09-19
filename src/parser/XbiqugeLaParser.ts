import { IParser, IDetail } from '../../types/IParser';
import cheerio from 'cheerio';
import { logger } from '../Logger';
import { TYPE } from '../entity';

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
      type: this.detectType($('#bdshare').next().next().text()),
      finish: this.detectFinish(
        $('#info > p:nth-child(4)')
          .text()
          .replace(/最后更新(：){0,1}/g, ''),
      ),
      chapters: $('#list > dl')
        .children()
        .toArray()
        .map((ele, index) => {
          if (!ele.children[0] || !ele.children[0].children[0] || !ele.children[0].children[0]['data']) return null; // 如果没办法解析到这些章节对应的数据，就先返回null
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

  private detectType(input: string): TYPE {
    for (let _type in TYPE) {
      if (input.indexOf(_type) !== -1) {
        return _type as TYPE;
      }
    }
    return TYPE.未分类;
  }

  private detectFinish(input: string): boolean {
    return Date.now() - new Date(input).valueOf() > 30 * 24 * 3600 * 1000; // 只要成功一个月未更新就认为是完本小说
  }
}

export class XbiqugeLaFinishBookParser extends XbiqugeLaParser {
  public parseHomePage(rawText: string): string[] {
    const set: Set<string> = new Set<string>();
    const $ = cheerio.load(rawText);
    
    const ATagNodes = $('#main > div:nth-child(8) > ul:nth-child(2) > li:not(.ltitle):not(.more) > a').toArray();
    for (const node of ATagNodes) {
      set.add(node.attribs.href);
    }

    logger.info(`解析完成，一共获取${ATagNodes.length}条书本链接,共过滤掉${ATagNodes.length - set.size}条重复链接...`);

    return Array.from(set);
  }
}
