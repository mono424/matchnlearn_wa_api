const WhatsAppService = require('../services/WhatsAppService');

const converNumber = (number) => number.replace(/^[\+]/, "") + "@c.us";
const DUMMY_MEMBER_PHONE = process.env.DUMMY_MEMBER_PHONE;

module.exports = {

    async sendMessage(number, message) {
        const numberId = converNumber(number);
        const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
        if (!numLookup.numberExists) {
            return Boom.badRequest("Number does not use WhatsApp.");
        }
        if (!numLookup.numberExists) {
            return Boom.badRequest("Number is registered but cannot receive Messages.");
        }

        try {
            await WhatsAppService.getClient().sendText(numberId, message);
            // success
        } catch (error) {
            console.error(error);
        }
    },

    async createGroup(participents) {
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

            // success
        } catch (error) {
            console.error(error);
        }
    }
}