const WhatsAppService = require('../services/WhatsAppService');
const DBLogService = require('../services/DBLogService');
const StudentController = require('./StudentController');
const consts = require('../constants');

const converNumber = (number) => number.replace(/^[\+]/, "").replace(/\s/g, "") + "@c.us";
const DUMMY_MEMBER_PHONE = process.env.DUMMY_MEMBER_PHONE;

const { UNAUTHORIZED, STUDENT_NOT_FOUND, CANT_RECEIVE_MESSAGES, NOT_USING_WHATSAPP } = consts.errors;

module.exports = {

    async sendMessage(studentId, message, logEntryId = null) {
        logEntryId = logEntryId || await DBLogService.createEntry("WhatsAppController.sendMessage", { studentId, message });
        await DBLogService.entryStarted(logEntryId);

        try {
            if (!(await WhatsAppService.isAuthorized())) {
                throw Error(UNAUTHORIZED);
            }

            const student = await StudentController.find(studentId);
            if (!student) {
                throw Error(STUDENT_NOT_FOUND);
            }
            
            const numberId = converNumber(student.phoneNumber);
            const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
    
            if (!numLookup.numberExists) {
                throw Error(NOT_USING_WHATSAPP);
            }
            if (!numLookup.numberExists) {
                throw Error(CANT_RECEIVE_MESSAGES);
            }

            await WhatsAppService.getClient().sendText(numberId, message);
            DBLogService.entrySucceed(logEntryId);
            StudentController.trySet(studentId, "validWhatsAppNumber", true);
        } catch (error) {
            console.error(error);
            DBLogService.entryFailed(logEntryId, error.message);
            StudentController.trySet(studentId, "validWhatsAppNumber", false);
        }
    },

    async createGroup(name, participents, logEntryId = null) {
        logEntryId = logEntryId || await DBLogService.createEntry("WhatsAppController.createGroup", { name, participents });
        await DBLogService.entryStarted(logEntryId);

        try {
            if (!(await WhatsAppService.isAuthorized())) {
                throw Error(UNAUTHORIZED);
            }

            const dummyMemberId = converNumber(DUMMY_MEMBER_PHONE);
            const { gid: { _serialized: groupId } } = await WhatsAppService.getClient().createGroup(name, [dummyMemberId]);

            await WhatsAppService.waitForGroup(groupId);
            await WhatsAppService.getClient().removeParticipant(groupId, dummyMemberId);

            const inviteLink = await WhatsAppService.getClient().getGroupInviteLink(groupId);
            const res = [];
            
            for (const participent of participents) {
                try {
                    const student = await StudentController.find(participent.studentId);
                    if (!student) {
                        throw Error(STUDENT_NOT_FOUND);
                    }

                    const numberId = converNumber(student.phoneNumber);
                    const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
                    if (!numLookup.numberExists) {
                        throw Error(NOT_USING_WHATSAPP);
                    }
                    if (!numLookup.numberExists) {
                        throw Error(CANT_RECEIVE_MESSAGES);
                    }
                    const message = participent.message.replace("{inviteUrl}", inviteLink);
                    await WhatsAppService.getClient().sendLinkPreview(numberId, inviteLink, message);
                    res.push({ participentStudentId: participent.studentId, error: null });
                } catch (error) {
                    res.push({ participentStudentId: participent.studentId, error: error.message });
                }
            }

            DBLogService.entrySucceed(logEntryId, res);
        } catch (error) {
            console.error(error);
            DBLogService.entryFailed(logEntryId, error.message);
        }
    }
}