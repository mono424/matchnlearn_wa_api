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

### GET /check/{STUDENT_ID}
Check the number of a specific student. Returns true if its availabl on whatsapp
#### Response
```json
{
	"valid": true,
}
```