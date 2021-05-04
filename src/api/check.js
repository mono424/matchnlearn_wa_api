const Joi = require('@hapi/joi');
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
