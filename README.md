# matchnlearn_wa_api

[![Deploy](https://github.com/mono424/matchnlearn_wa_api/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/mono424/matchnlearn_wa_api/actions/workflows/deploy.yml)

Url: https://matchnlearn-wa-api.herokuapp.com

## REST-Endpoints

### GET /
returns a welcome message.

### GET /auth
Open this endpoint in a Browser to authorize or deauthorize the whatsapp bot. This endpoint will display a page with an QR-Code. This code should be scanned with your device.
#### Query Params
 - **deauth** *boolean*

### POST /group
This endpoint creates a group and invites all participients defined in the payload. You can sent individuel messages, where the placeholder `{inviteUrl}` will be replaced by the join link(if you want to display the link under the link container again).
#### Body / Payload
```json
{
    "name": "Awesome Group Name",
    "participents": [
        { "studentId": "{MONGO_STUDENT_ID}", "message": "Hey Daniel, join our cool group :) Here is the link {inviteUrl}." },
        { "studentId": "{MONGO_STUDENT_ID}", "message": "Hey Franklin, join our cool group :) Here is the link {inviteUrl}." }
    ]
}
```

### POST /message
This endpoint sends a message to specific number. You can use it confirmations, reminders or notifications for example.
This Endpoint sets a flag for each student, which indicates wether the service could reach the student number or not : `validWhatsAppNumber=true/false`
#### Body / Payload
```json
{
	"studentId": "{MONGO_STUDENT_ID}",
	"message": "Hey Daniel, this is my awesome confirmation message :)"
}
```

### POST /repair-number/{STUDENT_ID}
Repairs the number of a specific student. Returns true if it was successful

#### Response
```json
{
	"repaired": true,
}
```

### POST /repair-number/all
Repairs all numbers of students with invalid whatsappnumber.

#### Response
```text
ok
```

### GET /check/{STUDENT_ID}
Check the number of a specific student. Returns true if its availabl on whatsapp
#### Query Params
 - **updateRecord** *boolean* if true, it will update the database record of the student

#### Response
```json
{
	"valid": true,
}
```

### GET /check/all
Checks if the number is valid for all students
#### Query Params
 - **onlyInvalid** *boolean* if true, it will update only students with invalid whatsappnumber
 - **updateRecord** *boolean* if true, it will update the database record of the students
 - **background** *boolean* if true, it will run in background

#### Response
```json
{
  "60897b96fa718a642bc5cab2": true,
  "608e676c660afe3bbef09ced": true,
  "608e67ca660afe3bbef09cee": true,
  "608e6832963ef9474d8ad1c0": true
}
```

### POST /message/many
You can send a messsage to many students. You can select them by passing their ids.
Further you can test your filters by settings the paramter `dry` in payload to true.
It adds the `messageId` to the student record on `sentMulticastMessages`-Array.
This endpoint does not sent messages doubled to people. So if the messageId already exist
in the `sentMulticastMessages`-Array the student will be ignored.

Following Placeholder are available in the message: `{name}`, `{phone}`.

#### Body / Payload
```json
{
  "studentIds": [
    "608d2ce0f3b3e3218bbb99e0",
    "608e676c660afe3bbef09ced",
    "608e67ca660afe3bbef09cee",
  ],
  "messageId": "someMessageIdentefier",
  "message": " --> A message for you my friend {name} {phone} *:)*",
  "dry": true
}
```
#### Response
```json
{
  "status": "ok",
  "count": 3,
  "dryResult": [
    {
      "id": "608d2ce0f3b3e3218bbb99e0",
      "name": "Frank",
      "phoneNumber": "+491234345124",
      "message": " --> A message for you my friend Frank +491234345124 *:)*"
    },
    {
      "id": "608e676c660afe3bbef09ced",
      "name": "Simon",
      "phoneNumber": "+49123435234",
      "message": " --> A message for you my friend Simon +49123435234 *:)*"
    },
    {
      "id": "608e67ca660afe3bbef09cee",
      "name": "Nils",
      "phoneNumber": "+49112342135",
      "message": " --> A message for you my friend Nils +49112342135 *:)*"
    }
  ]
}
```

### POST /message/all [DISABLED]
You can send a messsage to many students. With the filters you can choose who should get the message.
Further you can test your filters by settings the paramter `dry` in payload to true.

Following Placeholder are available in the message: `{name}`, `{phone}`.

#### Body / Payload
```json
{
	"filter": {
		"from": "2021-05-02 09:01:26.140Z",
		"to": "2021-05-03 09:01:26.140Z",
		"hasCreatedAt": true,
    "matched": true,
	},
	"message": " --> A message for you my friend {name} {phone} *:)*",
	"dry": true
}
```
#### Response
```json
{
  "status": "ok",
  "count": 3,
  "dryResult": [
    {
      "id": "608d2ce0f3b3e3218bbb99e0",
      "name": "Frank",
      "phoneNumber": "+491234345124",
      "message": " --> A message for you my friend Frank +491234345124 *:)*"
    },
    {
      "id": "608e676c660afe3bbef09ced",
      "name": "Simon",
      "phoneNumber": "+49123435234",
      "message": " --> A message for you my friend Simon +49123435234 *:)*"
    },
    {
      "id": "608e67ca660afe3bbef09cee",
      "name": "Nils",
      "phoneNumber": "+49112342135",
      "message": " --> A message for you my friend Nils +49112342135 *:)*"
    }
  ]
}
```

### POST /group/update-stats
Run through all groups in background and update their stats.
#### Query Params
 - **complete** *boolean* if true, it will not only update from lastMessageId, but from the beginning of time :)
 - **debug** *boolean* if true, it will print some additional information into the logs

#### Response
```json
{
  "status": "ok"
}
```


### POST /group/{groupId}/update-stats
Updates stats of an specific group
#### Query Params
 - **complete** *boolean* if true, it will not only update from lastMessageId, but from the beginning of time :)
 - **debug** *boolean* if true, it will print some additional information into the logs

#### Response
```json
{
  "status": "ok"
}
```

thanks for reading
