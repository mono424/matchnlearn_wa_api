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
                        name: Joi.string().required(),
                        participents: Joi.array().items(Joi.object({
                            number: Joi.string().required(),
                            message: Joi.string().required()
                        })).min(1).required()
                    })
                }
            },
            handler: async (request, h) => {
                const { name, participents } = request.payload;
                WhatsAppController.createGroup(name, participents);
                return { status: "ok" };
            }
        }
    ]
}
