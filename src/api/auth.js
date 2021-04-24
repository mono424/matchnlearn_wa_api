const fs = require('fs');
const path = require('path');
const Joi = require('@hapi/joi');
const WhatsAppService = require('../services/WhatsApp');
const TEMPLATE = fs.readFileSync(path.resolve(__dirname + "/../../html/auth.html")).toString();

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
                    if (await WhatsAppService.isAuthorized()) {
                        await WhatsAppService.deauthorize();
                        await sleep(3000);
                    }
                    return h.redirect(`/auth`);
                }

                if (await WhatsAppService.isAuthorized()) {
                    return "Already Authorized";
                }
                
                const qr = await WhatsAppService.getAuthQr();
                return TEMPLATE.replace("{{VALUE}}", qr);
            }
        }
    ]
}
