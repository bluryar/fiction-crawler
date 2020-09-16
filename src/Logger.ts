import winston from 'winston';
const { combine, timestamp, json } = winston.format;

export const logger = winston.createLogger({
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `error.log`,
      dirname: 'logs',
      level: 'error',
    }),
  ],
  exceptionHandlers: [
    new winston.transports.File({
      filename: `uncaught-error.log`,
      dirname: 'logs',
      level: 'crit',
    }),
  ],
});
