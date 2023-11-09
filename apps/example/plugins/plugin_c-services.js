const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const Schmervice = require('@hapipal/schmervice');
const Hoek = require('@hapi/hoek');
const { randomInteger } = require('../utils');

dayjs.extend(duration);

const randomTrue = () => Math.random() < 0.25;

const name = 'plugin_c';

module.exports = {
  name,
  async register(server) {
    await server.register(Schmervice);

    class PluginCService extends Schmervice.Service {
      constructor(server, options) {
        super(server, options);

        this.caching({
          add: {
            cache: {
              expiresIn: dayjs.duration(24, 'hours').asMilliseconds(),
              staleIn: dayjs.duration(5, 'minutes').asMilliseconds(),
              staleTimeout: 100,
              generateTimeout: dayjs.duration(5, 'seconds').asMilliseconds(),
            },
          },
          multiply: {
            cache: {
              expiresIn: dayjs.duration(24, 'hours').asMilliseconds(),
              staleIn: dayjs.duration(5, 'minutes').asMilliseconds(),
              staleTimeout: 100,
              generateTimeout: dayjs.duration(5, 'seconds').asMilliseconds(),
            },
          },
        });
      }

      add(x, y) {
        this.server.log(['PluginCService'], 'Adding');

        return Number(x) + Number(y);
      }

      multiply(x, y) {
        this.server.log(['PluginCService'], 'Multiplying');

        return Number(x) * Number(y);
      }
    }

    server.registerService(PluginCService);

    server.events.on('generate_stats', async () => {
      await Hoek.wait(randomInteger(10, 5000)); // Simulate some slow I/O

      if (randomTrue()) {
        const { pluginCService } = server.services();

        pluginCService.add(1, 2);
        pluginCService.multiply(1, 2);
      }
    });
  },
};
