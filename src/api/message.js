const Joi = require('@hapi/joi');
const StudentController = require('../controller/StudentController');
const WhatsAppController = require('../controller/WhatsAppController');

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

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
            path: '/message/many',
            options: {
                validate: {
                    payload: Joi.object({
                        studentIds: Joi.array().items(Joi.string()).required(),
                        messageId: Joi.string().required(),
                        message: Joi.string().required(),
                        dry: Joi.bool().default(false),
                    })
                }
            },
            handler: async (request, h) => {
                const { studentIds, messageId, message, dry } = request.payload;

                const doStuff = async (studentIds, messageId, message, dry) => {
                    let dryResult = [];
                    for (const studentId of studentIds) {
                        console.log("Sending message to Student(" + studentId + ")");
                        let student = await StudentController.find(studentId);

                        if(!student) {
                            dryResult.push({
                                id: student._id,
                                error: "Not found!"
                            });
                            console.log("Cannot find Student(" + studentId + ")");
                            continue;
                        }

                        if(!student.validWhatsAppNumber) {
                            dryResult.push({
                                id: student._id,
                                error: "No valid WhatsAppNumber"
                            });
                            console.log("No valid WhatsAppNumber(" + studentId + ")");
                            continue;
                        }

                        if (dry) {
                            dryResult.push({
                                id: student._id,
                                name: student.name,
                                phoneNumber: student.phoneNumber,
                                message: WhatsAppController.replacePlaceholder(message, student),
                            });
                            continue;
                        }

                        try {
                            const sentMessages = student.sentMulticastMessages || [];
                            sentMessages.push(messageId)
                            await StudentController.trySet(student._id, "sentMulticastMessages", sentMessages);
                            await WhatsAppController.sendMessage(student.id, message);
                            console.log("Succeed sending message to Student(" + student._id + ")");
                        } catch (error) {
                            console.log("Failed sending message to Student(" + student._id + ")");
                        }
                        await sleep(500);
                    }
                    return dryResult;
                };
                
                if (dry) {
                    let result = await doStuff(studentIds, messageId, message, dry);
                    return { status: "ok", count: studentIds.length, dryResult: result };
                } else {
                    doStuff(studentIds, messageId, message, dry);
                    return { status: "ok", count: studentIds.length };
                }
            }
        },
        // add sentMulticastMessages to student to keep track on sent messages
        // {
        //     method: 'POST',
        //     path: '/message/all',
        //     options: {
        //         validate: {
        //             payload: Joi.object({
        //                 filter: Joi.object({
        //                     from: Joi.date().default(null),
        //                     to: Joi.date().default(null),
        //                     matched: Joi.bool().default(null),
        //                     hasCreatedAt: Joi.bool().default(null),
        //                 }),
        //                 message: Joi.string().required(),
        //                 dry: Joi.bool().default(false),
        //             })
        //         }
        //     },
        //     handler: async (request, h) => {
        //         const { filter, message, dry } = request.payload;
        //         let students = await StudentController.findMany({
        //             ...filter,
        //             validWhatsAppNumber: true
        //         });
                
        //         let dryResult = [];
        //         for (const student of students) {
        //             if (dry) {
        //                 dryResult.push({
        //                     id: student._id,
        //                     name: student.name,
        //                     phoneNumber: student.phoneNumber,
        //                     message: WhatsAppController.replacePlaceholder(message, student),
        //                 });
        //                 continue;
        //             }
        //             WhatsAppController.sendMessage(student.id, message);
        //         }

        //         return { status: "ok", count: students.length, dryResult: dry ? dryResult : undefined };
        //     }
        // }
    ]
}