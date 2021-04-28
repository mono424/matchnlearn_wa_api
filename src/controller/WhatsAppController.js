const WhatsAppService = require('../services/WhatsAppService');
const DBLogService = require('../services/DBLogService');

const converNumber = (number) => number.replace(/^[\+]/, "") + "@c.us";
const DUMMY_MEMBER_PHONE = process.env.DUMMY_MEMBER_PHONE;

module.exports = {

    async sendMessage(number, message, logEntryId = null) {
        logEntryId = logEntryId || await DBLogService.createEntry("WhatsAppController.sendMessage", { number, message });
        await DBLogService.entryStarted(logEntryId);

        try {
            if (!(await WhatsAppService.isAuthorized())) {
                throw Error("WhatsappService not auhtorized.");
            }
            
            const numberId = converNumber(number);
            const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
    
            if (!numLookup.numberExists) {
                throw Error("Number does not use WhatsApp.");
            }
            if (!numLookup.numberExists) {
                throw Error("Number is registered but cannot receive Messages.");
            }

            await WhatsAppService.getClient().sendText(numberId, message);
            DBLogService.entrySucceed(logEntryId);
        } catch (error) {
            console.error(error);
            DBLogService.entryFailed(logEntryId, error.message);
        }
    },

    async createGroup(name, participents, logEntryId = null) {
        logEntryId = logEntryId || await DBLogService.createEntry("WhatsAppController.createGroup", { name, participents });
        await DBLogService.entryStarted(logEntryId);

        try {
            if (!(await WhatsAppService.isAuthorized())) {
                throw Error("WhatsappService not auhtorized.");
            }

            const dummyMemberId = converNumber(DUMMY_MEMBER_PHONE);
            const { gid: { _serialized: groupId } } = await WhatsAppService.getClient().createGroup(name, [dummyMemberId]);

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

            DBLogService.entrySucceed(logEntryId, res);
        } catch (error) {
            console.error(error);
            DBLogService.entryFailed(logEntryId, error.message);
        }
    }
}