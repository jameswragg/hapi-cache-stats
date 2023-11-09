const Code = require('@hapi/code');
const Lab = require('@hapi/lab');
const Hapi = require('@hapi/hapi');
const Package = require('../package.json');
const Plugin = require('../index.js');
const Schmervice = require('@hapipal/schmervice');

const { describe, it } = (exports.lab = Lab.script());
const { expect } = Code;

describe('Deployment', () => {
  it('registers the plugin.', async () => {
    const server = Hapi.server();

    await server.register(Plugin);

    expect(server.registrations[Package.name]).to.exist();
  });

  it('creates a route.', async () => {
    const server = Hapi.server();

    await server.register({
      plugin: Plugin,
      options: {
        base: '/cache-stats',
      },
    });

    const res = await server.inject('/cache-stats');
    expect(res.statusCode).to.equal(200);
  });

  it('creates a specified route.', async () => {
    const server = Hapi.server();

    await server.register({
      plugin: Plugin,
      options: {
        base: '/my-route',
      },
    });

    const res = await server.inject('/my-route');
    expect(res.statusCode).to.equal(200);
  });

  it('catbox stats are exposed.', async () => {
    const ServiceX = class ServiceX extends Schmervice.Service {
      async add(a, b) {
        return a + b;
      }
    };

    ServiceX.caching = {
      add: {
        cache: {
          expiresIn: 100,
          generateTimeout: 2,
        },
      },
    };

    const server = Hapi.server();

    await server.register(Plugin);
    await server.register(Schmervice);
    server.registerService(ServiceX);

    const { default: defaultPolicy } = server.cachePolicies();

    expect(defaultPolicy).to.be.an.object();
    expect(defaultPolicy.segments[0]).to.be.an.object();
    expect(defaultPolicy.segments[0].stats.hits).to.equal(0);
  });

  it('catbox stats are exprosed across different caches.', async () => {
    function add(a, b) {
      return a + b;
    }

    const server = Hapi.server();

    await server.register(Plugin);

    server.cache.provision([
      { name: 'service-cache', provider: require('@hapi/catbox-memory').Engine },
      { name: 'service-cache2', provider: require('@hapi/catbox-object').Engine },
    ]);

    const cacheOptions = { expiresIn: 2000, generateTimeout: 100 };

    server.method('sum', add, { cache: { ...cacheOptions } });
    server.method('sum2', add, { cache: { cache: 'service-cache', ...cacheOptions } });
    server.method('sum3', add, { cache: { cache: 'service-cache2', ...cacheOptions } });

    let policies = server.cachePolicies();

    expect(policies).to.be.an.object();
    expect(policies['default']).to.be.an.object();
    expect(policies['service-cache']).to.be.an.object();
    expect(policies['service-cache2']).to.be.an.object();

    expect(policies['default'].segments[0]).to.be.an.object();
    expect(policies['default'].segments[0].name).to.equal('#sum');
    expect(policies['default'].segments[0].stats.hits).to.equal(0);

    expect(policies['service-cache'].segments[0]).to.be.an.object();
    expect(policies['service-cache'].segments[0].name).to.equal('#sum2');
    expect(policies['service-cache'].segments[0].stats.hits).to.equal(0);

    expect(policies['service-cache2'].segments[0]).to.be.an.object();
    expect(policies['service-cache2'].segments[0].name).to.equal('#sum3');
    expect(policies['service-cache2'].segments[0].stats.hits).to.equal(0);

    expect(await server.methods.sum(1, 2)).to.equal(3);
    expect(await server.methods.sum2(1, 2)).to.equal(3);
    expect(await server.methods.sum3(1, 2)).to.equal(3);

    policies = server.cachePolicies();

    expect(policies['default'].segments[0].stats.generates).to.equal(1);
    expect(policies['service-cache'].segments[0].stats.generates).to.equal(1);
    expect(policies['service-cache2'].segments[0].stats.generates).to.equal(1);
  });
});
