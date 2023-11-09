const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const Hoek = require('@hapi/hoek');
const { randomInteger } = require('../utils');

dayjs.extend(duration);

const name = 'plugin_a';

const randomTrue = () => Math.random() < 0.25;

module.exports = {
  name,
  async register(server) {
    /* init cache */
    await server.cache.provision({
      provider: require('@hapi/catbox-object').Engine,
      name: `${name}--cache`,
    });

    /* register cached method returning redirects router */
    server.method(
      `${name}_sum`,
      (a, b) => {
        server.log([`${name}_sum`], 'called');

        // if (randomTrue()) throw Error('25% of the time');

        return a + b;
      },
      {
        cache: {
          cache: `${name}--cache`,
          expiresIn: dayjs.duration(10, 'seconds').asMilliseconds(),
          staleIn: dayjs.duration(1, 'seconds').asMilliseconds(),
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
