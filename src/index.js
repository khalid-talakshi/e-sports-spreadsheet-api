import express from "express";
import { google } from "googleapis"
import dotenv from "dotenv"
import cors from "cors"
import * as fs from 'fs'

const app = express();
const port = process.env.PORT || 8080; // default port to listen
dotenv.config()

app.use(cors())

const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

const drive = google.drive({ version: "v3", auth })

const getLastModifiedDate = async() => {
    const response = await drive.files.get({
        fileId: process.env.SHEET_ID,
        fields: "modifiedTime"
    })
    return response
}

// define a route handler for the default home page
app.get("/", (req, res) => {
    res.send("Hello world!");
});

app.get("/schedule", async(req, res) => {
    const cachedResponse = JSON.parse(fs.readFileSync("schedule.json"))

    const remoteDate = (await getLastModifiedDate()).data["modifiedTime"]

    console.log(cachedResponse["lastModifiedDate"])
    console.log(remoteDate)

    if (cachedResponse["lastModifiedDate"] >= remoteDate) {
        console.log("sending cached response")
        res.send(cachedResponse)
    } else {
        console.log("fetching new schedule")

        const sheets = google.sheets({ version: 'v4', auth });

        const range = `Sheet1!A1:E18`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range,
        });

        const values = response.data.values

        let day1;
        let day2;
        let day3;
        let result = { "friday": {}, "saturday": {} }

        for (let i = 0; i < values.length; i++) {
            if (i == 0) {
                // day row
                continue;
            } else if (i == 1) {
                // stream row
                continue;
            } else {
                // standard time row
                const time = values[i][0]
                const stream1Friday = values[i][1] || ""
                const stream2Friday = values[i][2] || ""
                const stream1Saturday = values[i][3] || ""
                const stream2Saturday = values[i][4] || ""
                result["friday"] = {...result["friday"], [time]: [stream1Friday, stream2Friday] }
                result["saturday"] = {...result["saturday"], [time]: [stream1Saturday, stream2Saturday] }
            }
        }

        const respone = { data: result, "lastModifiedDate": remoteDate }

        fs.writeFileSync("schedule.json", JSON.stringify(respone))

        res.send({ data: result, "lastModifiedDate": remoteDate })
    }
})

app.get("/modifiedDate", async(req, res) => {

    const response = await getLastModifiedDate()

    res.send(response.data)
})


// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${ port }`);
});