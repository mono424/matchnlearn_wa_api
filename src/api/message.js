const Joi = require('@hapi/joi');
const StudentController = require('../controller/StudentController');
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
        },
        {
            method: 'POST',
            path: '/message/all',
            options: {
                validate: {
                    payload: Joi.object({
                        filter: Joi.object({
                            from: Joi.date().default(null),
                            to: Joi.date().default(null),
                            matched: Joi.bool().default(null),
                        }),
                        message: Joi.string().required(),
                        dry: Joi.bool().default(false),
                    })
                }
            },
            handler: async (request, h) => {
                const { filter, message, dry } = request.payload;
                let students = await StudentController.findMany(filter);
                
                let dryResult = [];
                for (const student of students) {
                    if (dry) {
                        dryResult.push({
                            id: student._id,
                            name: student.name,
                            message: WhatsAppController.replacePlaceholder(message, student),
                        });
                        continue;
                    }
                    WhatsAppController.sendMessage(student.id, message);
                }

                return { status: "ok", count: students.length, dryResult: dry ? dryResult : undefined };
            }
        }
    ]
}