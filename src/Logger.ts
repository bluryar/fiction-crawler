import winston from 'winston';
const { combine, timestamp, json } = winston.format;

export const logger = winston.createLogger({
  format: combine(timestamp(), json()),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `error-${new Date().getFullYear()}/${new Date().getMonth()}/${new Date().getDate()}.log`,
      dirname: 'logs',
      level: 'error',
    }),
  ],
});
