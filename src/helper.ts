import fs from 'fs';
import path from 'path';
import { IChapters } from '../types/IParser';
import { failContentObject } from '../types/ITask';
import { Book } from './entity';

export const sleep = (timeout: number, callback?: Function) => {
  return new Promise((res) => {
    setTimeout(() => {
      res();
      if (callback) callback();
    }, timeout);
  });
};

export const divideArray = (source: any[], num = 2): any[][] => {
  let res = [];
  let newLength = Math.round(source.length / num);
  for (let i = 0; i < source.length; i += newLength) {
    res.push(source.slice(i, i + newLength));
  }
  return res;
};

export function bundleHttpError(arr: Error[]) {
  let message = '';
  let stack = '';
  let name = 'HTTP_ERROR';
  for (let i = 0; i < arr.length; i++) {
    const err = arr[i];
    message += err.message;
    stack += `NO:${i}: \n${err.stack}\n`;
  }
  const res = new Error(message);
  res.stack = stack;
  res.name = name;
  return res;
}

export function dumpFailQueue(dirPath: string, detailFailQueue: string[], contentFailQueue: Map<Book, IChapters[]>) {
  const isFileExit = fs.existsSync(dirPath);
  if (!isFileExit) fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(path.resolve(dirPath, 'failDetailPageTask.json'), JSON.stringify({ detailFailQueue: detailFailQueue }));
  fs.writeFileSync(path.resolve(dirPath, 'failContentPageTask.json'), stringifyBookMap(contentFailQueue));
}

export function stringifyBookMap(map: Map<Book, IChapters[]>) {
  let res = [];
  for (const [key, value] of map) {
    let obj: failContentObject = null;
    obj.key = key;
    obj.value = value;
    res.push(obj);
  }
  return JSON.stringify(res);
}
