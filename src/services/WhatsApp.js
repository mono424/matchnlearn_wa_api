const venom = require('venom-bot');

module.exports = {
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
            },
        );
    },

    onStatusChange(statusSession) {
        this._status = statusSession;
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
        if (!(await this.isAuthorized())) throw(new Error("Not authorized."));
        this._currentQr = null;
        return this.getClient().logout();
    },
};
