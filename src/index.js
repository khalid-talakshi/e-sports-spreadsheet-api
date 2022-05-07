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
const sheets = google.sheets({ version: 'v4', auth });

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

    let cachedResponse = null

    if (fs.existsSync("schedule.json")) {
        cachedResponse = JSON.parse(fs.readFileSync("schedule.json"))
    }

    const remoteDate = (await getLastModifiedDate()).data["modifiedTime"]

    if (cachedResponse && cachedResponse["lastModifiedDate"] >= remoteDate) {
        console.log("sending cached response")
        res.send(cachedResponse)
    } else {
        console.log("fetching new schedule")

        const range = `Sheet1!A1:G10`;

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: process.env.SHEET_ID,
            range,
        });

        const values = response.data.values
        console.log(values)

        let day1;
        let day2;
        let day3;
        let result = { "friday": {}, "saturday": {} }

        for (let i = 0; i < values.length; i++) {
            if (i == 0) {
                // day row
                continue;
            } else {
                // standard time row
                const time = values[i][0]
                const stream1Friday = values[i][1] || ""
                const stream2Friday = values[i][2] || ""
                const stream3Friday = values[i][3] || ""
                const stream4Friday = values[i][4] || ""
                const stream5Friday = values[i][5] || ""
                const stream6Friday = values[i][6] || ""
                const stream1Saturday = values[i][3] || ""
                const stream2Saturday = values[i][4] || ""
                result["friday"] = {...result["friday"], [time]: [stream1Friday, stream2Friday, stream3Friday, stream4Friday, stream5Friday, stream6Friday] }
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

app.get("/standings", async(req, res) => {
    const group1Range = `Sheet2!A1:I8`;
    const group2Range = `Sheet2!A10:I25`
    const localFile = "standings.json"

    let cachedResponse = null

    if (fs.existsSync(localFile)) {
        cachedResponse = JSON.parse(fs.readFileSync(localFile))
    }

    const remoteDate = (await getLastModifiedDate()).data["modifiedTime"]

    if (cachedResponse && cachedResponse["lastModifiedDate"] >= remoteDate) {
        console.log("sending cached response")
        res.send(cachedResponse)
    } else {
        console.log("fetching new standings")
        const response = await sheets.spreadsheets.values.batchGet({
            spreadsheetId: process.env.SHEET_ID,
            ranges: [group1Range, group2Range],
        });

        const values = response.data.valueRanges.map((item) => {
            const intValues = item.values
            const groupName = item.values[0][0]
            return {
                [groupName]: intValues.slice(1)
            }
        })

        const respone = { data: values, "lastModifiedDate": remoteDate }

        fs.writeFileSync(localFile, JSON.stringify(respone))

        res.send(respone)
    }
})

// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${ port }`);
});