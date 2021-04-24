require('dotenv').config()
const Hapi = require('@hapi/hapi');
const { registerRoutes } = require('./routes');
const WhatsAppService = require('./services/WhatsApp');

// const IS_DEVELOP = process.env.NODE_ENV === "development"; 

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT,
        host: process.env.HOST,
        routes: {
            cors: true // todo: add cors
        }
    });
    
    WhatsAppService.init();
    registerRoutes(server);

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();