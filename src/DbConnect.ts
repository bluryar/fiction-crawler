import 'reflect-metadata';

import { createConnection } from 'typeorm';
import configs from '../dbconfig';
import { Book, Chapter } from './entity';

export const getConnectionByEnv = () => {
  const envStr = process.env.NODE_ENV || 'dev';

  const { host, port, username, password, database } = configs[envStr];
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
