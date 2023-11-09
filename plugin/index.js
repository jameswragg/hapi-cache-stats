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
    socket.emit('start', { policies: server.cachePolicies() });

    socket.on('change', () => {
      socket.emit('start', { policies: server.cachePolicies() });
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

    // listen for newly created caches
    server.events.on('cachePolicy', (cachePolicy, cacheProvisionName = 'default', segment) => {
      if (!cacheMap.has(cacheProvisionName)) {
        // store reference to that cachePolicy
        cacheMap.set(cacheProvisionName, {
          type: cachePolicy?.client?.connection?.constructor?.name || 'Unknown',
          segments: [{ name: segment, stats: cachePolicy.stats }],
          snapshots: [],
        });
      } else {
        // add new segments
        const item = cacheMap.get(cacheProvisionName);

        if (!item.segments.includes(segment)) {
          item.segments.push({ name: segment, stats: cachePolicy.stats });
        }

        cacheMap.set(cacheProvisionName, item);
      }
    });

    // add api to access cacheMap as Array
    server.decorate('server', 'cachePolicies', () => {
      const result = {};

      for (const [key, policy] of cacheMap.entries()) {
        const item = { ...policy };

        result[key] = item;
      }

      return Object.fromEntries(
        Object.entries(result).sort((a) => {
          if (a[0] === 'default') return -1; // ensure 'default' policy is first
        })
      );
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
        const isDev = Object.keys(request.query).includes('dev');

        if (isDev) {
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

    // init socket.io on startup & start sampling
    server.events.on('start', () => {
      server.app.socketIo = internals.socketInit(server, options.socketIo);

      const { socketIo } = server.app;

      interval = setInterval(() => {
        const policies = server.cachePolicies();

        for (const key in policies) {
          const policy = policies[key];
          const { snapshots = [] } = policy;
          const last = snapshots[snapshots.length - 1];

          if (
            last === undefined ||
            (Date.now() - last.timestamp) / 1000 >= options.snapshot.interval
          ) {
            const aggregatedPolicyStats = policy.segments.reduce(
              (aggregatedStats, segmentStats) => {
                for (const [key, value] of Object.entries(segmentStats.stats)) {
                  if (!aggregatedStats[key]) {
                    aggregatedStats[key] = value;
                  } else {
                    aggregatedStats[key] += value;
                  }
                }

                return aggregatedStats;
              },
              {}
            );

            snapshots.push({ ...aggregatedPolicyStats, timestamp: Date.now() });
          }

          if (snapshots[0] && snapshots.length > options.snapshot.retention) {
            snapshots.shift();
          }
        }

        if (socketIo.engine.clientsCount) {
          server.app.socketIo.emit('live-stats', {
            policies: server.cachePolicies(),
          });
        }
      }, options.snapshot.interval * 1000);
    });

    server.events.on('stop', () => {
      clearTimeout(interval);
      interval = null;
    });
  },
};
