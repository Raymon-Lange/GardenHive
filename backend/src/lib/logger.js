const pino = require('pino');

const isTest = process.env.NODE_ENV === 'test';
const isProd = process.env.NODE_ENV === 'production';

function buildTransport() {
  if (isTest) return undefined;
  if (isProd && process.env.LOGTAIL_TOKEN) {
    return {
      targets: [
        { target: 'pino/file', options: { destination: 1 } }, // stdout (Docker captures)
        { target: '@logtail/pino', options: { sourceToken: process.env.LOGTAIL_TOKEN } },
      ],
    };
  }
  if (!isProd) {
    return { target: 'pino-pretty', options: { colorize: true } };
  }
  return undefined; // production without token: plain JSON to stdout
}

const transport = buildTransport();

const logger = pino(
  { level: isTest ? 'silent' : 'info' },
  transport ? pino.transport(transport) : undefined
);

module.exports = logger;
