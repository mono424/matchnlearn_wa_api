const { ObjectId } = require('mongodb');
const db = require('../db');

module.exports = {

    find(id) {
        return db.getClient().db().collection("students").findOne({ _id: ObjectId(id) });
    },

    async trySet(id, key, val) {
        try {
            return await db.getClient().db().collection("students").updateOne(
                { _id: ObjectId(id) },
                { $set: { [key]: val } }
            );
        } catch (_) {}
        return false;
    },

    findMany({ from, to, matched, validWhatsAppNumber, hasCreatedAt }) {
        let filter = {};
        if (from !== null || to !== null) {
            filter.createdAt = {};
            if (from !== null) filter.createdAt.$gte = new Date(from);
            if (to !== null) filter.createdAt.$lt = new Date(to);
        }
        if (hasCreatedAt !== null) {
            filter.createdAt = { $exists: hasCreatedAt };
        }
        if (matched !== null) filter.matched = matched;
        if (validWhatsAppNumber !== null) filter.validWhatsAppNumber = validWhatsAppNumber;

        return db.getClient().db().collection("students").find({ 
            ...filter
        }).toArray();
    },

}