const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');

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

    server.ext({
      type: 'onRequest',
      method: function (request, h) {
        if (randomTrue) request.server.methods[`${name}_sum`](1, 2);

        return h.continue;
      },
    });
  },
};
