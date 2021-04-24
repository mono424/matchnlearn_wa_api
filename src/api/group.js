const Joi = require('@hapi/joi');
const Boom = require('@hapi/boom');
const WhatsAppService = require('../services/WhatsApp');

const converNumber = (number) => number.replace(/^[\+]/, "") + "@c.us";
const DUMMY_MEMBER_PHONE = process.env.DUMMY_MEMBER_PHONE;

module.exports = {
    routes: () => [
        {
            method: 'POST',
            path: '/group',
            options: {
                validate: {
                    payload: Joi.object({ 
                        participents: Joi.array().items(Joi.object({
                            number: Joi.string().required(),
                            message: Joi.string().required()
                        })).min(1).required()
                    })
                }
            },
            handler: async (request, h) => {
                const { participents } = request.payload;

                if (!(await WhatsAppService.isAuthorized())) {
                    return Boom.locked("Not Authorized. Authorize whatsapp first by using '/auth'.");
                }
                
                try {
                    const dummyMemberId = converNumber(DUMMY_MEMBER_PHONE);
                    const { gid: { _serialized: groupId } } = await WhatsAppService.getClient().createGroup("MatchNLearn Group", [dummyMemberId]);

                    await WhatsAppService.waitForGroup(groupId);
                    await WhatsAppService.getClient().removeParticipant(groupId, dummyMemberId);

                    const inviteLink = await WhatsAppService.getClient().getGroupInviteLink(groupId);
                    const res = [];
                    
                    for (const participent of participents) {
                        try {
                            const numberId = converNumber(participent.number);
                            const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
                            if (!numLookup.numberExists) {
                                throw Error("Number does not use WhatsApp.");
                            }
                            if (!numLookup.numberExists) {
                                throw Error("Number is registered but cannot receive Messages.");
                            }
                            const message = participent.message.replace("{inviteUrl}", inviteLink);
                            await WhatsAppService.getClient().sendLinkPreview(numberId, inviteLink, message);
                            res.push({ participent: participent.number, err: null });
                        } catch (error) {
                            res.push({ participent: participent.number, error: error.message });
                        }
                    }

                    return { res, err: null };
                } catch (error) {
                    console.error(error);
                    return Boom.internal("Something went wrong. Check the server logs.");
                }
            }
        }
    ]
}
