import { Book } from '../src/entity';
import { IChapters } from './IParser';

export interface IDownloader {
  download: (url: string) => Promise<string>;
  setTimeout: (val: number) => void;
  setRetry: (val: number) => void;
  dlDetailAndCollectError: (url: string, queue: string[]) => Promise<string | null>;
  dlContentAndCollectError: (
    chapterMap: IChapters,
    book: Book,
    queue: Map<Book, IChapters[]>,
  ) => Promise<string | null>;
}
