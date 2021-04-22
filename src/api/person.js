module.exports = {
    routes: () => [
        {
            method: 'POST',
            path: '/person',
            // todo: add joi validation of user
            handler: (request, h) => {
                // todo: add person to database
                return "ok :)"
            }
        }
    ]
}