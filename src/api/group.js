const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppController = require('../controller/WhatsAppController');

module.exports = {
    routes: () => [
        {
            method: 'POST',
            path: '/group',
            options: {
                validate: {
                    payload: Joi.object({ 
                        participents: Joi.array().items(Joi.object({
                            number: Joi.string().required(),
                            message: Joi.string().required()
                        })).min(1).required()
                    })
                }
            },
            handler: async (request, h) => {
                const { participents } = request.payload;
                if (!(await WhatsAppService.isAuthorized())) {
                    return Boom.locked("Not Authorized. Authorize whatsapp first by using '/auth'.");
                }
                WhatsAppController.createGroup(participents);
                return { status: "ok" };
            }
        }
    ]
}
