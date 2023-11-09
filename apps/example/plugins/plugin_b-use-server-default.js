const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const Hoek = require('@hapi/hoek');
const { randomInteger } = require('../utils');

dayjs.extend(duration);

const randomTrue = () => Math.random() < 0.25;

const name = 'plugin_b';

module.exports = {
  name,
  async register(server) {
    /* register cached method returning redirects router */
    server.method(
      `${name}_sum`,
      (a, b) => {
        server.log([`${name}_sum`], 'called');

        return a + b;
      },
      {
        cache: {
          expiresIn: dayjs.duration(10, 'seconds').asMilliseconds(),
          staleIn: dayjs.duration(8, 'seconds').asMilliseconds(),
          staleTimeout: 100,
          generateTimeout: 10000,
        },
      }
    );

    server.events.on('generate_stats', async () => {
      await Hoek.wait(randomInteger(10, 5000)); // Simulate some slow I/O

      if (randomTrue()) {
        server.methods[`${name}_sum`](1, 2);
      }
    });
  },
};
