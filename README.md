# matchnlearn_wa_api

[![Deploy](https://github.com/mono424/matchnlearn_wa_api/actions/workflows/deploy.yml/badge.svg?branch=main)](https://github.com/mono424/matchnlearn_wa_api/actions/workflows/deploy.yml)

Url: https://matchnlearn-wa-api.herokuapp.com

## REST-Endpoints

### GET **/**
returns a welcome message.

### GET **/auth**
Open this endpoint in a Browser to authorize or deauthorize the whatsapp bot. This endpoint will display a page with an QR-Code. This code should be scanned with your device.
#### Query Params
 - **deauth** *boolean*

 ### POST **/group**
This endpoint creates a group and invites all participients defined in the payload. You can sent individuel messages, where the placeholder `{inviteUrl}` will be replaced by the join link(if you want to display the link under the link container again).
#### Body / Payload
```json
    {
        "participents": [
            { "number": "+49000000000", "message": "Hey Daniel, join our cool group :) Here is the link {inviteUrl}." },
            { "number": "+49000000001", "message": "Hey Franklin, join our cool group :) Here is the link {inviteUrl}." }
        ]
    }
```

