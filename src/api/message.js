const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const WhatsAppService = require('../services/WhatsApp');
const converNumber = (number) => number.replace(/^[\+]/, "") + "@c.us";

module.exports = {
    routes: () => [
        {
            method: 'POST',
            path: '/message',
            options: {
                validate: {
                    payload: Joi.object({
                        number: Joi.string().required(),
                        message: Joi.string().required()
                    })
                }
            },
            handler: async (request, h) => {
                const { number, message } = request.payload;
                
                if (!(await WhatsAppService.isAuthorized())) {
                    return Boom.locked("Not Authorized. Authorize whatsapp first by using '/auth'.");
                }
                
                const numberId = converNumber(number);
                const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
                if (!numLookup.numberExists) {
                    return Boom.badRequest("Number does not use WhatsApp.");
                }
                if (!numLookup.numberExists) {
                    return Boom.badRequest("Number is registered but cannot receive Messages.");
                }

                try {
                    await WhatsAppService.getClient().sendText(numberId, message);
                    return { status: "ok" };
                } catch (error) {
                    console.error(error);
                    return Boom.internal("Something went wrong. Check the server logs.");
                }
            }
        }
    ]
}
