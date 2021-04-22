const Hapi = require('@hapi/hapi');
const { registerRoutes } = require('./routes');

const init = async () => {
    // todo: add dynamic port & cors
    const server = Hapi.server({
        port: 3004,
        host: 'localhost',
        routes: {
            cors: {
                origin: ['*'] // todo: add cors        
            }
        }
    });

    registerRoutes(server);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

init();