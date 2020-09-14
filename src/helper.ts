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
