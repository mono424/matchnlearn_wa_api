const fs = require('fs');
const path = require('path');
const Joi = require('@hapi/joi');
const RetryService = require('../services/RetryService');

module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/retry',
            options: {
                validate: {
                    query: Joi.object({
                        from: Joi.date().required(),
                        to: Joi.date(),
                    })
                }
            },
            handler: async (request, h) => {
                const { from, to = new Date() } = request.query;
                RetryService.retryFailedBetween(from, to);
                return "ok";
            }
        }
    ]
}
