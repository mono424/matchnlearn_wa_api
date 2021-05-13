const { ObjectId } = require('mongodb');
const db = require('../db');

module.exports = {

    async findMany()  {
        return db.getClient().db().collection("groups").find().toArray();
    },

    async trySet(id, key, val) {
        try {
            return await db.getClient().db().collection("groups").updateOne(
                { _id: ObjectId(id) },
                { $set: { [key]: val } }
            );
        } catch (_) {}
        return false;
    },

}