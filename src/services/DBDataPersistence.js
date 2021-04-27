const fs = require('fs');
const path = require('path');
const db = require('../db');

const serviceName = "matchnlearn_wa_api";
const basePath = path.resolve(__dirname, "../../data");

module.exports = {

    /**
     * Adds or updates a file.
     * @param {String} file 
     * @returns 
     */
    async updateFile(file) {
        const res = await db.getClient().db().collection("persistence-files").updateOne(
            {
                serviceName,
                file,
            },
            {   
                $set: {
                    serviceName,
                    file,
                    data: fs.readFileSync(path.resolve(basePath, file)),
                    updatedAt: new Date()
                }
            },
            { upsert: true }
        );
        console.log(`💾  Updated Persistent-File: "${file}".`);
        return res;
    },

    async removeFile(file) {
        const res = await db.getClient().db().collection("persistence-files").deleteOne({
            serviceName,
            file,
        });
        console.log(`💾  Deleted Persistent-File: "${file}".`);
        return res;
    },

    async pullFiles() {
       const files = await db.getClient().db().collection("persistence-files").find({
            serviceName
       });
       
       for (const { file, data } of (await files.toArray())) {
           const filePath = path.resolve(basePath, file);
           fs.writeFileSync(filePath, data.buffer);
           console.log(`💾  Restored Persistent-File: "${file}".`);
       }
    },

}