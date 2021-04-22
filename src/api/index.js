module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/',
            handler: (request, h) => {
                return '<a href="https://matchnlearn.com">MatchNLearn</a> Form API';
            }
        }
    ]
}
