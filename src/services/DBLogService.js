const { ObjectId } = require('mongodb');
const db = require('../db');

module.exports = {

    async createEntry(event, meta) {
        const res = await db.getClient().db().collection("whatsapp-logs").insertOne({
            event,
            status: "created",
            retries: 0,
            meta: (meta || {}),
        });
        return res.insertedId;
    },

    async findEntry(entryId) {
        return await db.getClient().db().collection("whatsapp-logs").findOne({ _id: ObjectId(entryId) });
    },

    async entryStarted(entryId) {
        await db.getClient().db().collection("whatsapp-logs").updateOne(
            { _id: ObjectId(entryId) },
            { $set: { status: "started", startedAt: new Date(), }, },
            { upsert: true }
        );
    },

    async incrementRetry(entryId) {
        await db.getClient().db().collection("whatsapp-logs").updateOne(
            { _id: ObjectId(entryId) },
            { $inc: { retries: 1 }, },
            { upsert: true }
        );
    },

    async entryFailed(entryId, errorDetails) {
        await db.getClient().db().collection("whatsapp-logs").updateOne(
            { _id: ObjectId(entryId) },
            { $set: { status: "failed", lastErrorDetails: (errorDetails || {}), endedAt: new Date(), }, },
            { upsert: true }
        );
    },

    async entrySucceed(entryId, result) {
        await db.getClient().db().collection("whatsapp-logs").updateOne(
            { _id: ObjectId(entryId) },
            { $set:{ status: "success", result: (result || {}), endedAt: new Date(), } },
            { upsert: true }
        );
    }

}