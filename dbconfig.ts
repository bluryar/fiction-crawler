export const mysql = {
  dev: {
    host: '127.0.0.1',
    port: 3306,
    username: 'root',
    password: 'love830',
    database: 'fiction-dev',
  },
  test: {
    host: '127.0.0.1',
    port: 3306,
    username: 'root',
    password: 'love830',
    database: 'fiction-test',
  },
};

export const redis = {
  dev: {
    host: '192.168.10.3',
    port: 6379,
    database: 1,
    keyPrefix: 'fiction-dev#',
    password: 'love830',
  },
  test: {
    host: '192.168.10.3',
    port: 6379,
    database: 2,
    keyPrefix: 'fiction-test#',
    password: 'love830',
  },
};
