const DBLogService = require('./DBLogService');
const db = require('../db');

const delay = time => new Promise(res=>setTimeout(res,time));

module.exports = {

    // not used yet
    async retryDelayed(id, { delay = 3000, maxRetries = 3 } = {}) {
        await delay(delay);
        const entry = await DBLogService.findEntry(id);
        if (entry.retries < maxRetries) {
            this.retryLogEntry(entry);
        } else {
            console.log(`⚠️ Gave up on ${entry.event} (${id}) after ${entry.retries}`);
        }
    },

    async retryFailedBetween(from, to, { maxRetries = 3 } = {}) {
        const logEntries = await db.getClient().db().collection("whatsapp-logs").find(
            {
                status: "failed",
                startedAt: {
                    $gte: from,
                    $lt: to
                },
                retries: {
                    $lte: maxRetries
                }
            }
        );

        console.log(`Retrying ${await logEntries.count()} events`);
        for (const logEntry of (await logEntries.toArray())) {
            this.retryLogEntry(logEntry);
        }
    },

    async retryLogEntry(logEntry) {
        const WhatsAppController = require('../controller/WhatsAppController');

        DBLogService.incrementRetry(logEntry._id);
        console.log(`♻️ Retry: ${logEntry.event} [${logEntry._id.toString()}]`);
        switch (logEntry.event) {
            case "WhatsAppController.createGroup":
                WhatsAppController.createGroup(logEntry.meta.name, logEntry.meta.participents, logEntry._id);
            break;
            case "WhatsAppController.sendMessage":
                WhatsAppController.sendMessage(logEntry.meta.studentId, logEntry.meta.message, logEntry._id);
            break;
        }
    }

}