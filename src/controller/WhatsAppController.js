const WhatsAppService = require('../services/WhatsAppService');
const DBLogService = require('../services/DBLogService');
const StudentController = require('./StudentController');
const GroupController = require('./GroupController');
const Boom = require('@hapi/boom');
const { find } = require('./StudentController');
const chalk = require('chalk');

const groupStatsLog = (msg) => console.log(chalk.cyan("[UPDATE_GROUP_STATS] ") + msg);
const converNumber = (number) => number.replace(/^[\+]/, "").replace(/\s/g, "") + "@c.us";
const DUMMY_MEMBER_PHONE = process.env.DUMMY_MEMBER_PHONE;

module.exports = {

    async checkNumber(studentId) {
        if (!(await WhatsAppService.isAuthorized())) {
            throw Boom.internal("WhatsappService not auhtorized.");
        }

        const student = await StudentController.find(studentId);
        if (!student) {
            throw Boom.notFound(`Student(${studentId}) not found.`);
        }
        
        const numberId = converNumber(student.phoneNumber);
        const numLookup = await WhatsAppService.getClient().checkNumberStatus(numberId);

        if (!numLookup.numberExists) {
            return false;
        }
        if (!numLookup.numberExists) {
            return false;
        }

        return true;
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

    async updateGroupStats() {
        groupStatsLog("Started");
        const groups = await GroupController.findMany();
        
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

            await this._updateGroupStats(group);
            groupStatsLog(`Finished ${i} of ${groups.length}`);
        }
    },

    async _updateGroupStats(group) {
        const messages = (await WhatsAppService.getClient().loadAndGetAllMessagesInChat(group.whatsAppChatId)).map(msg => {
            if (group.lastMessageAt != null && msg.timestamp * 1000 <= group.lastMessageAt.getTime()) return null;
            return {
                id: msg.id,
                author: msg.author,
                timestamp: msg.timestamp
            }
        }).filter(x => x);

        const groupMemberIds = (await WhatsAppService.getClient().getGroupMembersIds(group.whatsAppChatId));

        let totalMessages = 0;
        for (const student of group.students) {
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
            } else {
                student.lastMessageAt = null;
            }
            totalMessages += student.numberOfMessages;
        }

        await GroupController.trySet(group._id, "students", group.students);
        await GroupController.trySet(group._id, "totalMessages", totalMessages);
        if (messages.length > 0) {
            await GroupController.trySet(group._id, "lastMessageId", messages[messages.length - 1].id);
            await GroupController.trySet(group._id, "lastMessageAt", new Date(messages[messages.length - 1].timestamp * 1000));
        } else {
            await GroupController.trySet(group._id, "lastMessageId", null);
            await GroupController.trySet(group._id, "lastMessageAt", null);
        }
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