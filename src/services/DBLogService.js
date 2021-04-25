const { ObjectId } = require('mongodb');
const db = require('../db');

module.exports = {

    async createEntry(event, meta, status = "open") {
        const res = await db.getClient().db().collection("whatsapp-logs").insertOne({
            event,
            status,
            meta: (meta || {}),
            startedAt: new Date(),
        });
        return res.insertedId;
    },

    async entryFailed(entryId, errorDetails) {
        await db.getClient().db().collection("whatsapp-logs").updateOne(
            { _id: ObjectId(entryId) },
            { $set: { status: "failed", errorDetails: (errorDetails || {}), endedAt: new Date(), }, },
            { upsert: true }
        );
    },

    async entrySucceed(entryId) {
        await db.getClient().db().collection("whatsapp-logs").updateOne(
            { _id: ObjectId(entryId) },
            { $set:{ status: "success", endedAt: new Date(), } },
            { upsert: true }
        );
    }

}