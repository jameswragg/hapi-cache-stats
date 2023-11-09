const { randomInteger } = require('../utils');
const name = 'plugin_e';

module.exports = {
  name,
  async register(server) {
    server.route({
      method: 'get',
      path: '/custom-segment-get',
      handler: async (request, h) => {
        // Get a Value from 'testvar' key for the test-segment
        const val = await request.server.app.cacheSegment.get('testvar');
        return h.response(val);
      },
    });

    server.route({
      method: 'get',
      path: '/custom-segment-set',
      handler: async (request, h) => {
        // Get a Value from 'testvar' key for the test-segment
        const val = randomInteger(1, 50);
        await request.server.app.cacheSegment.set('testvar', val);
        return h.response(val);
      },
    });

    server.events.on('start', async () => {
      // Create Segment
      const cacheSegment = server.cache({
        cache: 'service-cache2',
        segment: 'test-segment', // name of the segment where were are storing values
        expiresIn: 10 * 1000, // 10s
      });

      // Set a Key-Value pair for the test-segment
      await cacheSegment.set('testvar', randomInteger(1, 50));

      // Expose segment to make it accessible on routes
      server.app.cacheSegment = cacheSegment;

      // Set separate intervals to inject the get and set routes
      setInterval(() => {
        server.inject('/custom-segment-get');
      }, 300);

      setInterval(() => {
        server.inject('/custom-segment-set');
      }, 150);
    });
  },
};
