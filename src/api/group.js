const fs = require('fs');
const path = require('path');
const Joi = require('@hapi/joi');
const WhatsAppService = require('../services/WhatsApp');
const TEMPLATE = fs.readFileSync(path.resolve(__dirname + "/../../html/auth.html")).toString();

const MODERATOR_ID = "4917641208692@c.us";
const converNumber = (number) => number.replace(/^\\+/, "") + "@c.us";
const inviteCodeToUrl = (inviteCode) => `https://chat.whatsapp.com/${inviteCode}`;

module.exports = {
    routes: () => [
        {
            method: 'POST',
            path: '/group',
            options: {
                validate: {
                    payload: Joi.object({ 
                        participents: Joi.array().items(Joi.object({
                            number: Joi.string(),
                            message: Joi.string()
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
                    const moderator = await WhatsAppService.getClient().getContactById(MODERATOR_ID);
                    const res = await WhatsAppService.getClient().createGroup("MatchNLearn Group", [moderator]);
                    const groupId = res.gid;
                    try {
                        await WhatsAppService.waitForGroupChatJoin(groupId);
                    } catch (error) {}
                    const groupChat = await WhatsAppService.getClient().getChatById(groupId);
                    const inviteCode = await groupChat.getInviteCode();
                    console.log({inviteCode});
                    
                    for (const participent of participents) {
                        console.log({n: participent.number});
                        if (participent.message) {
                            const message = participent.message.replace("{invite}", inviteCodeToUrl(inviteCode));
                            await WhatsAppService.getClient().sendMessage(converNumber(participent.number), message);
                        } else {
                            await WhatsAppService.getClient().sendMessage(converNumber(participent.number), inviteCodeToUrl(inviteCode));
                        }
                    }

                    return { err: null };
                } catch (error) {
                    return { err: error.message };
                }
            }
        }
    ]
}
