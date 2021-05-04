const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const WhatsAppService = require('../services/WhatsAppService');
const WhatsAppController = require('../controller/WhatsAppController');

module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/check/{studentId}',
            options: {
                validate: {
                    params: Joi.object({
                        studentId: Joi.string().required(),
                    })
                }
            },
            handler: async (request, h) => {
                const { studentId } = request.params;
                const res = await WhatsAppController.checkNumber(studentId);
                return { valid: res };
            }
        }
    ]
}
