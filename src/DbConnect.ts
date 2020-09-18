import 'reflect-metadata';

import Redis from 'ioredis';

import { createConnection } from 'typeorm';
import { mysql, redis } from '../dbconfig';
import { Book, Chapter } from './entity';

export const getMysqlConnectionByEnv = () => {
  const envStr = process.env.NODE_ENV || 'dev';

  const { host, port, username, password, database } = mysql[envStr];
  return createConnection({
    type: 'mariadb',
    entities: [Book, Chapter],
    synchronize: true,
    host,
    port,
    username,
    password,
    database,
  });
};

export const getRedisConnectionByEnv = (baseUrl: String) => {
  const envStr = process.env.NODE_ENV || 'dev';
  const { host, port, password, database, keyPrefix } = redis[envStr];

  const redisConnection = new Redis({
    host,
    port,
    password,
    db: database,
    keyPrefix: keyPrefix + baseUrl + '#',
  });

  return redisConnection;
};
