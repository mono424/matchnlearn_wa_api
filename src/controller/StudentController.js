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
    }

}