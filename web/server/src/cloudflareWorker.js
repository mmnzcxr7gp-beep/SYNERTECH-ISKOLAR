/* ================= CLOUDFLARE WORKERS / PAGES API ENTRYPOINT ================= */
const { buildApp } = require('./vercelApp');

const app = buildApp();

module.exports = {
  async fetch(request, env, ctx) {
    // Cloudflare Edge Header Normalization
    const url = new URL(request.url);
    
    // Inject Cloudflare Request Metadata
    request.cfMetadata = {
      country: request.cf?.country || 'PH',
      city: request.cf?.city || 'Manila',
      colo: request.cf?.colo || 'MNL',
      clientIp: request.headers.get('cf-connecting-ip') || '127.0.0.1',
    };

    return new Promise((resolve) => {
      // Execute Express app inside Cloudflare Worker Node.js runtime
      app(request, {
        end: (data) => resolve(new Response(data)),
        json: (data) => resolve(Response.json(data)),
        send: (data) => resolve(new Response(data)),
        status: (code) => ({
          json: (data) => resolve(Response.json(data, { status: code })),
          send: (data) => resolve(new Response(data, { status: code })),
        }),
      });
    });
  },
};
