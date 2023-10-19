const Hoek = require('@hapi/hoek');
const path = require('node:path');
const fs = require('fs-extra');
const Package = require('./package.json');
const { Server } = require('socket.io');

const internals = {};

internals.defaults = {
  base: '/cache-stats',
  snapshot: {
    interval: 5,
    retention: 60,
  },
  socketIo: {
    cors: {
      origin: '*',
    },
  },
};

internals.socketInit = (server, config = {}) => {
  const io = new Server(server.listener, config);

  io.on('connection', (socket) => {
    socket.emit('start', { policies: server.cachePolicies(), methods: server.methodCaches() });

    socket.on('change', () => {
      socket.emit('start', { policies: server.cachePolicies(), methods: server.methodCaches() });
    });
  });

  return io;
};

module.exports = {
  name: Package.name,
  async register(server, optionsParam) {
    const options = Hoek.applyToDefaults(internals.defaults, optionsParam);

    const cacheMap = new Map();
    let interval;

    // init socket.io on startup & start sampling
    server.events.on('start', () => {
      server.app.socketIo = internals.socketInit(server, options.socketIo);

      const { socketIo } = server.app;

      interval = setInterval(() => {
        const policies = server.cachePolicies({ incPolicy: true });

        for (const key in policies) {
          const policy = policies[key];
          const { snapshots = [], cachePolicy } = policy;
          const last = snapshots[snapshots.length - 1];

          if (
            last === undefined ||
            (Date.now() - last.timestamp) / 1000 >= options.snapshot.interval
          ) {
            snapshots.push({ ...cachePolicy.stats, timestamp: Date.now() });
          }

          if (snapshots[0] && snapshots.length > options.snapshot.retention) {
            snapshots.shift();
          }
        }

        if (socketIo.engine.clientsCount) {
          server.app.socketIo.emit('live-stats', {
            policies: server.cachePolicies(),
            methods: server.methodCaches(),
          });
        }
      }, options.snapshot.interval * 1000);
    });

    server.events.on('stop', () => {
      clearTimeout(interval);
      interval = null;
    });

    // listen for newly created caches
    server.events.on('cachePolicy', (cachePolicy, cacheProvisionName = 'default', segment) => {
      if (!cacheMap.has(cacheProvisionName)) {
        // store reference to that cachePolicy
        cacheMap.set(cacheProvisionName, {
          type: cachePolicy?.client?.connection?.constructor?.name || 'Unknown',
          cachePolicy,
          segments: [segment],
          snapshots: [],
        });
      } else {
        // add new segments
        const item = cacheMap.get(cacheProvisionName);

        if (!item.segments.includes(segment)) {
          item.segments.push(segment);
        }

        cacheMap.set(cacheProvisionName, item);
      }
    });

    // add server route to view stats
    server.route({
      method: 'get',
      path: options.base,
      handler: async (request, h) => {
        const html = fs.readFileSync(path.join(__dirname, '/public/index.html')).toString(); // prettier-ignore
        const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '/public/manifest.json'))); // prettier-ignore
        const style = fs.readFileSync(path.join(__dirname, 'public', manifest['src/main.css'].file)).toString(); // prettier-ignore
        const script = fs.readFileSync(path.join(__dirname, 'public', manifest['src/main.js'].file)).toString(); // prettier-ignore

        if (Object.keys(request.query).includes('dev')) {
          const renderedHtml = html
            .replace(/{{base}}/g, `${options.base}`)
            .replace(/{{style}}/g, '')
            .replace(/{{script}}/g, '')
            .replace(
              /<\/body>/g,
              `
              <script type="module" src="http://localhost:5173/@vite/client"></script>
              <script type="module" src="http://localhost:5173/src/main.js"></script>
              </body>
              `
            );

          return h.response(renderedHtml);
        }

        const renderedHtml = html
          .replace(/{{base}}/g, `${options.base}`)
          .replace(/{{style}}/g, style)
          .replace(/{{script}}/g, script);

        return renderedHtml;
      },
    });

    // add api to access cacheMap as Array
    server.decorate('server', 'cachePolicies', ({ incPolicy = false } = {}) => {
      const result = {};

      for (const [key, policy] of cacheMap.entries()) {
        const item = { ...policy };

        if (!incPolicy) {
          delete item.cachePolicy;
        }

        result[key] = item;
      }

      return Object.fromEntries(
        Object.entries(result).sort((a) => {
          if (a[0] === 'default') return -1; // ensure 'default' policy is first
        })
      );
    });

    server.decorate('server', 'methodCaches', () => {
      function walkMethods(obj) {
        let result = {};

        function traverse(obj, path) {
          for (let key in obj) {
            const method = obj[key];
            if (typeof method === 'object') {
              traverse(method, path + key + '.');
            } else if (method?.cache?.stats) {
              const { stats } = method.cache;

              const ratios = {
                hitRatio: stats.hits / stats.gets,
                staleRatio: stats.stales / stats.gets,
              };

              result[path + key] = { ...ratios, ...stats };
            }
          }
        }

        traverse(obj, '');

        return result;
      }

      return walkMethods(server.methods);
    });
  },
};
