const Hapi = require('@hapi/hapi');
const { randomInteger } = require('./utils');
const addServerMethods = require('./server-methods');
const Schmervice = require('@hapipal/schmervice');

const init = async () => {
  const server = Hapi.server({
    port: 3000,
    host: 'localhost',
    debug: {
      request: '*',
      log: '*',
    },
  });

  await server.register({
    plugin: require('@jameswragg/hapi-cache-stats'),
    options: {
      socketIo: {
        cors: {
          origin: 'http://localhost:5173',
        },
      },
    },
  });

  await server.register(require('blipp'));
  await server.register(require('./plugins/plugin_a-with-cache-provision.js'));
  await server.register(require('./plugins/plugin_b-use-server-default.js'));
  await server.register(require('./plugins/plugin_c-services.js'));
  await server.register(require('./plugins/plugin_d-services-with-own-cache.js'));
  await server.register(Schmervice);

  server.registerService(require('./services.js'));

  server.route({
    method: 'get',
    path: '/generate-stats',
    handler: async (request, h) => {
      const { mathService } = request.services();

      const count = randomInteger(1, 50);
      for (let index = 0; index < count; index++) {
        // request.app.sum1 = await server.methods.sum1(1, index);
        // request.app.sum2 = await server.methods.sum2(1, index);
        request.app.mathService_add = mathService.add(1, 2);
      }

      if (count > 40) {
        // request.app.sum3 = await server.methods.sum3_noProvisionName(1, 2);
      }

      request.app.mathService_multiply = mathService.multiply(1, 2);
      // request.app.sum4 = await server.methods.sum4_noProvisionName(1, 2);

      return h.response('generated stats');
    },
  });

  server.cache.provision([
    { name: 'service-cache', provider: require('@hapi/catbox-memory').Engine },
    { name: 'service-cache2', provider: require('@hapi/catbox-object').Engine },
  ]);

  addServerMethods(server);

  server.events.on('start', () => {
    setInterval(() => {
      server.inject('/generate-stats');
    }, 250);
  });

  await server.start();

  console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
  console.log(err);
  process.exit(1);
});

init();
