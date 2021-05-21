const path = require('path');
const Joi = require('@hapi/joi');
const WhatsAppService = require('../services/WhatsAppService');

module.exports = {
    routes: () => [
        {
            method: 'POST',
            path: '/repair-number/all',
            handler: async (request, h) => {
                const doStuff = async (updateRecord, onlyInvalid) => {
                    const studentIds = await db.getClient().db().collection("students").find({
                        $or: [{validWhatsAppNumber: null}, {validWhatsAppNumber: false}]
                    }, { _id: 1 }).toArray();
                    
                    console.log("Start repairing numbers: " + studentIds.length);
                    let i = 0;
                    for (const studentId of studentIds) {
                        console.log("[" + (++i) + " / " + studentIds.length + "] Repair student whatsapp number: " + studentId._id.toString());
                        try {
                            let repaired = await WhatsAppController.repairNumber(studentId._id);
                            console.log(" > Number repaired: " + (repaired ? "yes" : "no"));
                        } catch (error) {}
                    }
                    console.log("Done repairing numbers");
                    return res;
                };
                doStuff();
                return "ok"
            }
        },
        {
            method: 'POST',
            path: '/repair-number/{studentId}',
            options: {
                validate: {
                    params: Joi.object({
                        studentId: Joi.string().required(),
                    }),
                }
            },
            handler: async (request, h) => {
                const { studentId } = request.params;
                const { updateRecord } = request.query;
                const res = await WhatsAppController.repairNumber(studentId);
                return { repaired: res };
            }
        }
    ]
}
