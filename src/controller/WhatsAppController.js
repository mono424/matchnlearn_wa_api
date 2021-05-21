const WhatsAppService = require('../services/WhatsAppService');
const DBLogService = require('../services/DBLogService');
const StudentController = require('./StudentController');
const GroupController = require('./GroupController');
const Boom = require('@hapi/boom');
const { find } = require('./StudentController');
const chalk = require('chalk');

const groupStatsLog = (msg) => console.log(chalk.cyan("[UPDATE_GROUP_STATS] ") + msg);
const createGroupLog = (msg) => console.log(chalk.cyan("[CREATE_GROUP] ") + msg);
const converNumber = (number) => number.replace(/^[\+]/, "").replace(/\s/g, "") + "@c.us";
const DUMMY_MEMBER_PHONE = process.env.DUMMY_MEMBER_PHONE;

const repairPhoneNumber = (phoneNumber) => {
    if (phoneNumber.startsWith("+1")) return phoneNumber.replace(/^\+1/, "+491");
    return null;
};

module.exports = {

    async repairNumber(studentId) {
        if (!(await WhatsAppService.isAuthorized())) {
            throw Boom.internal("WhatsappService not auhtorized.");
        }

        const student = await StudentController.find(studentId);
        if (!student) {
            throw Boom.notFound(`Student(${studentId}) not found.`);
        }

        if (this._checkPhoneNumber(student.phoneNumber)) {
            await StudentController.trySet(student._id, "validWhatsAppNumber", true);
            throw Boom.badRequest(`Student(${studentId}) has already a valid phonenumber.`);
        }

        let repairedNumber = repairPhoneNumber(student.phoneNumber);
        if (repairedNumber == null) {
            return false;
        }

        if (!this._checkPhoneNumber(repairedNumber)) {
            return false;
        }

        await StudentController.trySet(student._id, "validWhatsAppNumber", true);
        await StudentController.trySet(student._id, "phoneNumber", repairedNumber);
        return true;
    },

    async _checkPhoneNumber(phoneNumber) {
        const numberId = converNumber(phoneNumber);
        const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
        return !!(numLookup.numberExists && numLookup.canReceiveMessage);
    },

    async checkNumber(studentId, updateDbRecord = false) {
        if (!(await WhatsAppService.isAuthorized())) {
            throw Boom.internal("WhatsappService not auhtorized.");
        }

        const student = await StudentController.find(studentId);
        if (!student) {
            throw Boom.notFound(`Student(${studentId}) not found.`);
        }
        
        let valid = await this._checkPhoneNumber(student.phoneNumber)
        if (updateDbRecord) await StudentController.trySet(student._id, "validWhatsAppNumber", valid);

        return valid;
    },

    async sendMessage(studentId, message, logEntryId = null) {
        logEntryId = logEntryId || await DBLogService.createEntry("WhatsAppController.sendMessage", { studentId, message });
        await DBLogService.entryStarted(logEntryId);

        try {
            if (!(await WhatsAppService.isAuthorized())) {
                throw Error("WhatsappService not auhtorized.");
            }

            const student = await StudentController.find(studentId);
            if (!student) {
                throw Error(`Student(${studentId}) not found.`);
            }
            
            const numberId = converNumber(student.phoneNumber);
            const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
    
            if (!numLookup.numberExists) {
                throw Error("Number does not use WhatsApp.");
            }
            if (!numLookup.numberExists) {
                throw Error("Number is registered but cannot receive Messages.");
            }

            await WhatsAppService.getClient().sendText(numberId, this.replacePlaceholder(message, student));
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
        createGroupLog("Started creating group");

        try {
            if (!(await WhatsAppService.isAuthorized())) {
                throw Error("WhatsappService not auhtorized.");
            }

            const dummyMemberId = converNumber(DUMMY_MEMBER_PHONE);
            createGroupLog("Create group ...");
            const { gid: { _serialized: groupId } } = await WhatsAppService.getClient().createGroup(name, [dummyMemberId]);
            
            createGroupLog("Wait for group to appear: " + groupId);
            await WhatsAppService.waitForGroup(groupId);

            createGroupLog("Remove dummy participant ...");
            await WhatsAppService.getClient().removeParticipant(groupId, dummyMemberId);
            
            createGroupLog("Create invite link ...");
            const inviteLink = await WhatsAppService.getClient().getGroupInviteLink(groupId);
            const res = [];
            
            for (const participent of participents) {
                try {
                    createGroupLog("Send invite link to student: " + participent.studentId);
                    const student = await StudentController.find(participent.studentId);
                    if (!student) {
                        throw Error(`Student(${participent.studentId}) not found.`);
                    }

                    const numberId = converNumber(student.phoneNumber);
                    const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);
                    if (!numLookup.numberExists) {
                        throw Error("Number does not use WhatsApp.");
                    }
                    if (!numLookup.numberExists) {
                        throw Error("Number is registered but cannot receive Messages.");
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
    },

    async updateGroupStats({ groupId = null, complete = false, debug = false } = {}) {
        groupStatsLog("Started");
        const groups = !groupId ? await GroupController.findMany() : [await GroupController.find(groupId)].filter(x => x);

        groupStatsLog(`Found ${groups.length} groups`);
        let i = 0;
        for (const group of groups) {
            i++;
            groupStatsLog(`Update ${i} of ${groups.length} [${group._id}]`);

            // Sync whatsapp chat id
            if (!group.whatsAppChatId) {
                const waId = await this._findChatGroupIdForGroup(group);
                if (!waId) {
                    groupStatsLog(`Failed to link whatsAppChatId with group`);
                    continue;
                }

                group.whatsAppChatId = waId;
                await GroupController.trySet(group._id, "whatsAppChatId", waId);
                groupStatsLog(`Successfully linked whatsAppChatId with group`);
            }

            await this._updateGroupStats(group, complete, debug);
            groupStatsLog(`Finished ${i} of ${groups.length}`);
        }
    },

    async _updateGroupStats(group, complete = false, debug = false) {
        const messages = (await WhatsAppService.getClient().loadAndGetAllMessagesInChat(group.whatsAppChatId)).map(msg => {
            if (group.lastMessageAt != null && complete == false && msg.timestamp * 1000 <= group.lastMessageAt.getTime()) return null;
            return {
                id: msg.id,
                author: msg.author,
                timestamp: msg.timestamp
            }
        }).filter(x => x);

        const groupMemberIds = (await WhatsAppService.getClient().getGroupMembersIds(group.whatsAppChatId));
        if (debug) groupStatsLog(` >> Group Members: ` + groupMemberIds.map(id => id._serialized).join(", "));

        let totalMessages = 0;
        for (const student of group.students) {
            if (complete) student.numberOfMessages = 0;

            // Sync whatsapp id
            if (!student.whatsAppId) {
                const studentRecord = await StudentController.find(student.studentId);
                student.waStudentId = converNumber(studentRecord.phoneNumber);
            }

            // Check if still member of group
            student.isGroupMember = groupMemberIds.filter(id => id._serialized == student.waStudentId).length > 0;

            // Get relevant Messages
            const relevantMessages = messages.filter(msg => msg.author == student.waStudentId);
            student.numberOfMessages += relevantMessages.length;
            if (relevantMessages.length > 0) {
                student.lastMessageAt = new Date(relevantMessages[relevantMessages.length - 1].timestamp * 1000);
            } else if (!student.lastMessageAt) {
                student.lastMessageAt = null;
            }
            totalMessages += student.numberOfMessages;
        }

        const lastMessageId = (messages.length > 0) ? messages[messages.length - 1].id : (group.lastMessageId ? group.lastMessageId : null);
        const lastMessageAt = (messages.length > 0) ? new Date(messages[messages.length - 1].timestamp * 1000) : (group.lastMessageAt ? group.lastMessageAt : null);

        await GroupController.trySetMany(group._id, {
            students: group.students,
            totalMessages: totalMessages,
            invitedStudentsTotal: group.students.length,
            invitedStudentsJoined: group.students.filter((student) => student.isGroupMember).length,
            lastMessageId: lastMessageId,
            lastMessageAt: lastMessageAt
        });
    },

    async _findChatGroupIdForGroup(group) {
        for (const student of group.students) {
            const groupId = await this._findChatGroupIdFromStudent(student);
            if (groupId != null) return groupId;
        }
        return null;
    },

    async _findChatGroupIdFromStudent(student) {
        const firstPerson = await StudentController.find(student.studentId);
        const msgs = await WhatsAppService.getClient().getAllMessagesInChat(converNumber(firstPerson.phoneNumber));
        const inviteLinks = msgs.map(this.getInviteLinksFromMessage).filter(x => x);

        if (inviteLinks.length == 0) return;
        const groupInfo = await WhatsAppService.getClient().getGroupInfoFromInviteLink(inviteLinks[0]);
        return groupInfo.id._serialized;
    },

    // we could add content parser aswell
    getInviteLinksFromMessage(message) {
        if (message.matchedText && message.matchedText.startsWith("https://chat.whatsapp.com/")) {
            return message.matchedText;
        }
        return null;
    },

    replacePlaceholder(message, student) {
        return message
            .replace(/\{name\}/g, student.name)
            .replace(/\{phone\}/g, student.phoneNumber);
    }
}