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
                            studentId: Joi.string().required(),
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
        },
        {
            method: 'POST',
            path: '/group/update-stats',
            options: {
                validate: {
                    query: Joi.object({
                        complete: Joi.bool().default(false),
                        debug: Joi.bool().default(false),
                    })
                }
            },
            handler: async (request, h) => {
                const { complete, debug } = request.query;
                WhatsAppController.updateGroupStats({ complete, debug });
                return { status: "ok" };
            }
        },
        {
            method: 'POST',
            path: '/group/{groupId}/update-stats',
            options: {
                validate: {
                    params: Joi.object({
                        groupId: Joi.string().required(),
                    }),
                    query: Joi.object({
                        complete: Joi.bool().default(false),
                        debug: Joi.bool().default(false),
                    })
                }
            },
            handler: async (request, h) => {
                const { groupId } = request.params;
                const { complete, debug } = request.query;
                WhatsAppController.updateGroupStats({ groupId, complete, debug });
                return { status: "ok" };
            }
        }
    ]
}
