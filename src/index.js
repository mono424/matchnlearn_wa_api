require('dotenv').config()
const Hapi = require('@hapi/hapi');
const { registerRoutes } = require('./routes');
const { validateGenerator } = require('./auth');
const db = require('./db');
const DBDataPersistence = require('./services/DBDataPersistence');
const WhatsAppService = require('./services/WhatsAppService');

// const IS_DEVELOP = process.env.NODE_ENV === "development"; 
const adminUser = {
    username: "admin",
    password: process.env.ADMIN_PASSWORD
};

const init = async () => {
    const server = Hapi.server({
        port: process.env.PORT,
        host: process.env.HOST,
        routes: {
            cors: true // todo: add cors
        }
    });
    
    await db.init(process.env.MONGO_URL);
    await DBDataPersistence.pullFiles();
    WhatsAppService.init();

    await server.register(require('@hapi/basic'));
    registerRoutes(server);
    server.auth.strategy('simple', 'basic', { validate: validateGenerator([adminUser]) });
    server.auth.default('simple');

    await server.start();
    console.log('Server running on %s', server.info.uri);
};

process.on('unhandledRejection', (err) => {
    console.log(err);
    process.exit(1);
});

init();