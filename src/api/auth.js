const fs = require('fs');
const path = require('path');
const Joi = require('@hapi/joi');
const WhatsAppService = require('../services/WhatsApp');
const TEMPLATE = fs.readFileSync(path.resolve(__dirname + "/../../html/auth.html")).toString();

module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/auth',
            options: {
                validate: {
                    query: Joi.object({ deauth: Joi.bool() })
                }
            },
            handler: async (request, h) => {
                const { deauth = false } = request.query;
                if (deauth) {
                    WhatsAppService.deauthorize();
                }

                if (WhatsAppService.getClient()) {
                    return "Already Authorized";
                }
                
                const qr = await WhatsAppService.authorize();
                return TEMPLATE.replace("{{VALUE}}", qr);
            }
        }
    ]
}
