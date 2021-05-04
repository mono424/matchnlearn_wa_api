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
                        studentId: Joi.string().required(),
                        message: Joi.string().required()
                    })
                }
            },
            handler: async (request, h) => {
                const { studentId, message } = request.payload;
                WhatsAppController.sendMessage(studentId, message);
                return { status: "ok" };
            }
        }
    ]
}
