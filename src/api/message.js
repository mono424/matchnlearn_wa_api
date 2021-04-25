const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppController = require('../controller/WhatsAppController');

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
                WhatsAppController.sendMessage(number, message);
                return { status: "ok" };
            }
        }
    ]
}
