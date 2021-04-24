const fs = require('fs');
const path = require('path');
const { Client } = require('whatsapp-web.js');

const SESSION_FILE_PATH = path.resolve(__dirname + "/../../data/wa_session.json");
const AUTH_TIMEOUT_MS = 125 * 1000; // 125 seconds
const GROUP_WAIT_TIMEOUT_MS = 120 * 1000; // 120 seconds
const GROUP_CHECK_INTERVAL = 5 * 1000; // 5 seconds

module.exports = {
    _authClient: null,
    _client: null,

    /**
     * this function is invoked when client is authenticated
     * @param {Client} client 
     */
    async _setupClient(client) {
        this._client = client;
        client.on('group_join', () => console.log("join group"));
        console.log("** Whatsapp Authorized **")
    },
    
    /**
     * @returns {Client}
     */
    getClient() {
        return this._client;
    },

    /**
     * Initializes the client with stored session, if available.
     * @returns {Promise}
     */
    init() {
        if (!fs.existsSync(SESSION_FILE_PATH)) {
            return;
        }
        
        return new Promise((res, rej) => {
            let storedSession = require(SESSION_FILE_PATH);
            const client = new Client({ puppeteer: { headless: false }, session: storedSession });
            client.on('authenticated', session => {
                fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => console.error(err));
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

    /**
     * Creates a new client instance if not authenticated already
     * Caches a ClientInstance for AUTH_TIMEOUT_MS.
     * Returns QRCode data for Authentication.
     * @returns {String}
     */
    authorize() {
        return new Promise((res, rej) => {
            if(this._client) return rej(new Error("Already authorized."));

            this._authClient = this._authClient ? this._authClient : new Client();
            const timeoutId = setTimeout(() => {
                this._authClient.destroy();
                this._authClient = null;
            }, AUTH_TIMEOUT_MS)

            this._authClient.on('qr', (qr) => {
                res(qr);
            });

            this._authClient.on('authenticated', (session) => {
                clearTimeout(timeoutId);
                fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), (err) => console.error(err));
                this._setupClient(this._authClient);
                this._authClient = null;
            });

            this._authClient.initialize();
        });
    },

    /**
     * Deauthorizes the current Client and deletes all Sessions.
     */
    deauthorize() {
        if (fs.existsSync(SESSION_FILE_PATH)) {
            fs.unlinkSync(SESSION_FILE_PATH);
        }
        this._client.destroy();
        this._client = null;
    },

    async waitForGroupChat(groupId) {
        // If its already available
        try {
            return await WhatsAppService.getClient().getChatById(groupId);
        } catch (_) {}

        // If we have to wait to join the group
        console.log(`waiting for group(${groupId})...`);
        return new Promise((res, rej) => {
            const start = new Date().getTime();
            let intervalId;
            intervalId = setInterval(async () => {
                const duration = new Date().getTime() - start;

                if(duration > GROUP_WAIT_TIMEOUT_MS) {
                    clearInterval(intervalId);
                    return rej(`Failed after waiting ${duration / 1000}s`);
                }

                try {
                    res(await WhatsAppService.getClient().getChatById(groupId));
                } catch (_) {}
            }, GROUP_CHECK_INTERVAL);
        });
    }
};
