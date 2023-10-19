const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const Schmervice = require('@hapipal/schmervice');

dayjs.extend(duration);

const name = 'plugin_d';

module.exports = {
  name,
  async register(server) {
    await server.cache.provision({
      provider: require('@hapi/catbox-memory').Engine,
      name: `${name}--cache`,
    });

    await server.register(Schmervice);

    class PluginDService extends Schmervice.Service {
      constructor(server, options) {
        super(server, options);

        this.caching({
          add: {
            cache: {
              // cache: `${name}--cache`,
              expiresIn: dayjs.duration(24, 'hours').asMilliseconds(),
              staleIn: dayjs.duration(5, 'minutes').asMilliseconds(),
              staleTimeout: 100,
              generateTimeout: dayjs.duration(5, 'seconds').asMilliseconds(),
            },
          },
          multiply: {
            cache: {
              // cache: `${name}--cache`,
              expiresIn: dayjs.duration(24, 'hours').asMilliseconds(),
              staleIn: dayjs.duration(5, 'minutes').asMilliseconds(),
              staleTimeout: 100,
              generateTimeout: dayjs.duration(5, 'seconds').asMilliseconds(),
            },
          },
        });
      }

      add(x, y) {
        this.server.log(['PluginDService'], 'Adding');

        return Number(x) + Number(y);
      }

      multiply(x, y) {
        this.server.log(['PluginDService'], 'Multiplying');

        return Number(x) * Number(y);
      }
    }

    server.registerService(PluginDService);

    server.ext({
      type: 'onRequest',
      method: function (request, h) {
        const { pluginDService } = request.services();

        pluginDService.add(1, 2);
        pluginDService.multiply(1, 2);

        return h.continue;
      },
    });
  },
};
