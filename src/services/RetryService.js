const DBLogService = require('./DBLogService');
const db = require('../db');

module.exports = {

    async retryFailedBetween(from, to) {
        const logEntries = await db.getClient().db().collection("whatsapp-logs").find(
            {
                status: "failed",
                startedAt: {
                    $gte: from,
                    $lt: to
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