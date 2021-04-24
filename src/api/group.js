const fs = require('fs');
const path = require('path');
const Joi = require('@hapi/joi');
const WhatsAppService = require('../services/WhatsApp');

const MODERATOR_ID = "573244142966@c.us";
const converNumber = (number) => number.replace(/^[\+]/, "") + "@c.us";

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

                if (!WhatsAppService.getClient()) {
                    return { err: "Not Authorized. Authorize whatsapp first by using '/auth'." };
                }
                
                try {
                    const { gid: { _serialized: groupId } } = await WhatsAppService.getClient().createGroup("MatchNLearn Group", [MODERATOR_ID]);

                    await WhatsAppService.waitForGroup(groupId);
                    await WhatsAppService.getClient().removeParticipant(groupId, MODERATOR_ID);

                    const inviteLink = await WhatsAppService.getClient().getGroupInviteLink(groupId);
                    const res = [];
                    
                    for (const participent of participents) {
                        try {
                            console.log({n: converNumber(participent.number)});
                            const message = participent.message.replace("{inviteUrl}", inviteLink);
                            await WhatsAppService.getClient().sendLinkPreview(converNumber(participent.number), inviteLink, message);
                            res.push({ participent: participent.number, err: null });
                        } catch (error) {
                            res.push({ participent: participent.number, err: error.message });
                        }
                    }

                    return { res, err: null };
                } catch (error) {
                    return { err: error.message };
                }
            }
        }
    ]
}
