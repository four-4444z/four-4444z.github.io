const fs = require('node:fs');
const path = require('node:path');

function startRammerhead(options = {}) {
  const config = require('./rammerhead/src/config');
  const serviceMode = process.env.RAMMERHEAD_SERVICE === '1';
  const protocolFor = (request) => {
    const forwardedProtocol = request.headers['x-forwarded-proto'];
    const protocol = typeof forwardedProtocol === 'string'
      ? forwardedProtocol.split(',')[0].trim()
      : request.socket.encrypted ? 'https' : 'http';
    return `${protocol}:`;
  };

  Object.assign(config, {
    bindingAddress: options.host || (serviceMode ? '0.0.0.0' : process.env.HOST || '127.0.0.1'),
    port: options.port ?? Number(serviceMode ? process.env.PORT : process.env.RAMMERHEAD_PORT || 8082),
    crossDomainPort: null,
    enableWorkers: false,
    workers: 1,
    password: null,
    getIP(request) {
      const forwardedFor = request.headers['x-forwarded-for'];
      if (typeof forwardedFor === 'string') {
        const clientIp = forwardedFor.split(',').pop().trim();
        if (clientIp) return clientIp;
      }
      return request.socket.remoteAddress;
    },
    getServerInfo(request) {
      const protocol = protocolFor(request);
      const forwardedHost = request.headers['x-forwarded-host'];
      const target = new URL(`${protocol}//${forwardedHost || request.headers.host}`);
      return {
        hostname: target.hostname,
        port: target.port ? Number(target.port) : protocol === 'https:' ? 443 : 80,
        protocol
      };
    }
  });

  const proxy = require('./rammerhead/src/server/index.js');
  const launchPage = fs.readFileSync(path.join(__dirname, 'rammerhead-launch.html'));
  proxy.GET('/core-search-launch', (_request, response) => {
    response.writeHead(200, {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-content-type-options': 'nosniff'
    });
    response.end(launchPage);
  });
  return proxy;
}

if (require.main === module) {
  startRammerhead();
}

module.exports = { startRammerhead };
