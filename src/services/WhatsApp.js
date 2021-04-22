const fs = require('fs');
const WAWebJS = require('whatsapp-web.js');
const { Client } = require('whatsapp-web.js');

const SESSION_FILE_PATH = "../../data/wa_session.json";
const TIMEOUT_MS = 125 * 1000; //125 seconds

module.exports = {
    _client: null,

    /**
     * this function is invoked when client is authenticated
     * @param {Client} client 
     */
    async _setupClient(client) {
        this._client = client;
    },
    
    /**
     * @returns {Client}
     */
    getClient() {
        return this._client;
    },

    init() {
        if (!fs.existsSync(SESSION_FILE_PATH)) {
            return;
        }
        
        return new Promise((res, rej) => {
            let storedSession = require(SESSION_FILE_PATH);
            const client = new Client({ session: storedSession });
            client.on('authenticated', session => {
                fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session));
                this._setupClient(client);
                res();
            });
            
            client.on('auth_failure', msg => {
                client.destroy();
                rej(msg);
            });
            client.initialize();
        });
    },

    authorize() {
        return new Promise((res, rej) => {
            if(this._client) return rej(new Error("Already authorized."));

            const client = new Client();
            const timeoutId = setTimeout(() => {
                client.destroy();
            }, TIMEOUT_MS)

            client.on('qr', (qr) => {
                res(qr);
            });

            client.on('authenticated', (session) => {
                clearTimeout(timeoutId);
                fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session));
                this._setupClient(client);
            });

            client.initialize();
        });
    },

    deauthorize() {
        if (fs.existsSync(SESSION_FILE_PATH)) {
            fs.unlinkSync(SESSION_FILE_PATH);
        }
        this._client.destroy();
        this._client = null;
    }
};
