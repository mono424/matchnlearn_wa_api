const Joi = require('@hapi/joi');
const db = require('../db');
const StudentController = require('../controller/StudentController');
const WhatsAppController = require('../controller/WhatsAppController');

module.exports = {
    routes: () => [
        {
            method: 'GET',
            path: '/check/all',
            options: {
                validate: {
                    query: Joi.object({
                        onlyInvalid: Joi.bool().optional().default(false),
                        updateRecord: Joi.bool().optional().default(false),
                        background: Joi.bool().optional().default(false),
                    })
                }
            },
            handler: async (request, h) => {
                const { updateRecord, onlyInvalid, background } = request.query;

                const doStuff = async (updateRecord, onlyInvalid) => {
                    const studentIds = await db.getClient().db().collection("students").find(onlyInvalid ? {
                        $or: [{validWhatsAppNumber: null}, {validWhatsAppNumber: false}]
                    } : {}, { _id: 1 }).toArray();
                    
                    const res = {};
                    console.log("Start checking numebrs: " + studentIds.length);
                    let i = 0;
                    for (const studentId of studentIds) {
                        console.log("[" + (++i) + " / " + studentIds.length + "] Check student whatsapp number: " + studentId._id.toString());
                        let valid = false;
                        try {
                            valid = await WhatsAppController.checkNumber(studentId._id, updateRecord);
                        } catch (error) {}
                        res[studentId._id.toString()] = valid;
                    }
                    console.log("Done checking numebrs");
                    return res;
                };

                if (background) {
                    doStuff(updateRecord, onlyInvalid);
                    return "ok";
                } else {
                    return await doStuff(updateRecord, onlyInvalid);
                }
            }
        },
        {
            method: 'GET',
            path: '/check/{studentId}',
            options: {
                validate: {
                    params: Joi.object({
                        studentId: Joi.string().required(),
                    }),
                    query: Joi.object({
                        updateRecord: Joi.bool().optional().default(false)
                    })
                }
            },
            handler: async (request, h) => {
                const { studentId } = request.params;
                const { updateRecord } = request.query;
                const res = await WhatsAppController.checkNumber(studentId, updateRecord);
                return { valid: res };
            }
        }
    ]
}
