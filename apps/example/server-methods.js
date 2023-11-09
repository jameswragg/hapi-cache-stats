const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');

dayjs.extend(duration);

module.exports = (server) => {
  const add = function (a, b) {
    return a + b;
  };

  server.method({
    name: 'sum1',
    method: add,
    options: {
      cache: {
        cache: 'service-cache',
        expiresIn: dayjs.duration(10, 'seconds').asMilliseconds(),
        staleIn: dayjs.duration(8, 'seconds').asMilliseconds(),
        staleTimeout: 100,
        generateTimeout: 10000,
        // pendingGenerateTimeout: dayjs.duration(2.5, 'seconds').asMilliseconds(), // how long to block subsequent stale refresh requets for
      },
    },
  });

  server.method({
    name: 'sum2',
    method: add,
    options: {
      cache: {
        cache: 'service-cache2',
        expiresIn: 2000,
        generateTimeout: 100,
      },
    },
  });

  server.method({
    name: 'sum3_noProvisionName',
    method: add,
    options: {
      cache: {
        expiresIn: 1000,
        generateTimeout: 100,
      },
    },
  });

  server.method({
    name: 'sum4_noProvisionName',
    method: add,
    options: {
      cache: {
        expiresIn: 1000,
        generateTimeout: 100,
      },
    },
  });
};
