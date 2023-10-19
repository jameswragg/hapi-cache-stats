const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');
const Schmervice = require('@hapipal/schmervice');

dayjs.extend(duration);

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

    server.ext({
      type: 'onRequest',
      method: function (request, h) {
        const { pluginCService } = request.services();

        pluginCService.add(1, 2);
        pluginCService.multiply(1, 2);

        return h.continue;
      },
    });
  },
};
