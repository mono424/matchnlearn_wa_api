module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/',
            options: {
                auth: false
            },
            handler: (request, h) => {
                return '<a href="https://matchnlearn.com">MatchNLearn</a> WA API';
            }
        }
    ]
}
