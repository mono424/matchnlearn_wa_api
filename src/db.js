const { MongoClient } = require("mongodb");

module.exports = {
    _client: null,
    _db: null,

    /**
     * Returns the mongodb client
     * @returns {MongoClient}
     */
    getClient() {
        return this._client;
    },

    async init(url) {
        const client = new MongoClient(url);
        await client.connect();
        this._client = client;
    }

}