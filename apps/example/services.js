const Schmervice = require('@hapipal/schmervice');
const dayjs = require('dayjs');
const duration = require('dayjs/plugin/duration');

dayjs.extend(duration);

module.exports = class MathService extends Schmervice.Service {
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
    this.server.log(['math-service'], 'Adding');

    return Number(x) + Number(y);
  }

  multiply(x, y) {
    this.server.log(['math-service'], 'Multiplying');

    return Number(x) * Number(y);
  }
};
