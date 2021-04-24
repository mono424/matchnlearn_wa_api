const routes= [
    require('./api/index'),
    require('./api/auth'),
    require('./api/group'),
    require('./api/message'),
];

module.exports = {
    registerRoutes: (server) => {
        routes
            .reduce((res, r) => ([...res, ...r.routes()]), [])
            .forEach(r => server.route(r));
    }
};
