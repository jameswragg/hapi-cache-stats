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

    await server.register(Plugin);

    const res = await server.inject('/cache-insights');
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

  it('collects method stats.', async () => {
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

    const insights = server.methodCaches();

    expect(insights).to.be.an.object();
    expect(insights['schmervice.serviceX.add']).to.be.an.object();
    expect(insights['schmervice.serviceX.add'].hits).to.equal(0);
  });

  it('collects method stats 2.', async () => {
    function add(a, b) {
      return a + b;
    }

    const server = Hapi.server();

    await server.register(Plugin);
    server.cache.provision([
      { name: 'service-cache', provider: require('@hapi/catbox-memory').Engine },
      { name: 'service-cache2', provider: require('@hapi/catbox-object').Engine },
    ]);

    server.method('sum', add, { cache: { expiresIn: 2000, generateTimeout: 100 } });
    server.method('sum2', add, {
      cache: { cache: 'service-cache', expiresIn: 2000, generateTimeout: 100 },
    });
    server.method('sum3', add, {
      cache: { cache: 'service-cache2', expiresIn: 2000, generateTimeout: 100 },
    });

    let insights = server.methodCaches();

    expect(insights).to.be.an.object();
    expect(insights['sum']).to.be.an.object();
    expect(insights['sum'].hits).to.equal(0);
    expect(insights['sum2']).to.be.an.object();
    expect(insights['sum2'].hits).to.equal(0);
    expect(insights['sum3']).to.be.an.object();
    expect(insights['sum3'].hits).to.equal(0);
    expect(await server.methods.sum(1, 2)).to.equal(3);

    insights = server.methodCaches();

    expect(insights['sum'].generates).to.equal(1);
  });
});
