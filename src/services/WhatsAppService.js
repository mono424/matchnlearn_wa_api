const EventEmitter = require('events');
const venom = require('venom-bot');
const RetryService = require('./RetryService');
const DBDataPersistence = require('./DBDataPersistence');

const TOKEN_FILENAME = "bot.data.json";
const GROUP_WAIT_TIMEOUT = 10000; // 10 seconds

const CHROMIUM_ARGS = [
    '--disable-web-security', '--no-sandbox', '--disable-web-security',
    '--aggressive-cache-discard', '--disable-cache', '--disable-application-cache',
    '--disable-offline-load-stale-cache', '--disk-cache-size=0',
    '--disable-background-networking', '--disable-default-apps', '--disable-extensions',
    '--disable-sync', '--disable-translate', '--hide-scrollbars', '--metrics-recording-only',
    '--mute-audio', '--no-first-run', '--safebrowsing-disable-auto-update',
    '--ignore-certificate-errors', '--ignore-ssl-errors', '--ignore-certificate-errors-spki-list'
];

module.exports = {
    isStartingUp: true,
    events: new EventEmitter(),
    _currentQr: null,
    _client: null,
    _status: null,
    /*  isLogged
        notLogged
        browserClose
        qrReadSuccess
        qrReadFail
        autocloseCalled
        desconnectedMobile
        deleteToken
        chatsAvailable
        deviceNotConnected
        serverWssNotConnected
        noOpenBrowser */
    
    /**
     * @returns {String}
     */
    getStatus() {
        return this._status;
    },

    /**
     * @returns {venom.Whatsapp}
     */
    getClient() {
        return this._client;
    },

    /**
     * @returns {Promise<Boolean>}
     */
    async isAuthorized() {
        return this.getClient() && (await this.getClient().isLoggedIn());
    },

    /**
     * Initializes the client with stored session, if available.
     * @returns {Promise}
     */
    async init() {
        const startTime = new Date();
        this._client = await venom.create(
            'bot',
            this.onQrCode.bind(this),
            this.onStatusChange.bind(this),
            {
                folderNameToken: 'data', //folder name when saving tokens
                headless: true, // Headless chrome
                devtools: false, // Open devtools by default
                useChrome: false, // If false will use Chromium instance
                disableWelcome: true,
                debug: false, // Opens a debug session
                logQR: false, // Logs QR automatically in terminal
                browserArgs: CHROMIUM_ARGS,
                autoClose: false // do not die :)
            },
        );
        this.getClient().onAddedToGroup((...events) => this.events.emit("onAddedToGroup", ...events));
        DBDataPersistence.updateFile(TOKEN_FILENAME);

        // Retry failed during startup
        setTimeout(async () => {
            const initTime = new Date();
            await RetryService.retryFailedBetween(startTime, initTime);
            this.isStartingUp = false;
        }, 5000);

        // Second retry during startup
        setTimeout(async () => {
            const initTime = new Date();
            await RetryService.retryFailedBetween(startTime, initTime);
            this.isStartingUp = false;
        }, 15000);
    },

    onStatusChange(statusSession) {
        console.log('Status Session: ', statusSession);
        this._status = statusSession;


        if (!this.isStartingUp) {
            if (statusSession == "chatsAvailable") {
                const from = new Date();
                from.setMinutes(from.getMinutes() - 5);
                const to = new Date();
                RetryService.retryFailedBetween(from, to);
            }
        }
    },

    onQrCode(base64Qrimg, asciiQR, attempts, urlCode) {
        this._currentQr = urlCode;
    },

    /**
     * Returns QRCode data for Authentication.
     * @returns {Promise<String>}
     */
    async getAuthQr() {
        if (await this.isAuthorized()) throw(new Error("Already authorized."));
        return this._currentQr;
    },

    /**
     * Deauthorizes the current client
     */
    async deauthorize() {
        await DBDataPersistence.removeFile(TOKEN_FILENAME);
        if (!(await this.isAuthorized())) throw(new Error("Not authorized."));
        this._currentQr = null;
        return this.getClient().logout();
    },

    /**
     * Wait for Group
     */
    async waitForGroup(groupId) {
        return new Promise((res, rej) => {
            let timeoutId;
            const onJoin = chatEvent => {
                clearTimeout(timeoutId);
                if (groupId == chatEvent.id)
                res(chatEvent);
            };

            timeoutId = setTimeout(() => {
                this.events.off("onAddedToGroup", onJoin);
                rej(new Error("timeout!"));
            }, GROUP_WAIT_TIMEOUT);
            this.events.once("onAddedToGroup", onJoin);
        })
    }
};
