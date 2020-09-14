export interface IDownloader {
  download: (url: string) => Promise<string>;
  setTimeout: (val: number) => void;
  setRetry: (val: number) => void;
}
