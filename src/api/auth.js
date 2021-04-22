const fs = require('fs');
const WhatsAppService = require('../services/WhatsApp');
const TEMPLATE = fs.readFileSync(__dirname + "/../../html/auth.html").toString();

module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/auth',
            handler: async (request, h) => {
                if (WhatsAppService.client) {
                    return "Already Authorized";
                } 
                const qr = await WhatsAppService.authorize();
                return TEMPLATE.replace("{{VALUE}}", qr);
            }
        }
    ]
}
