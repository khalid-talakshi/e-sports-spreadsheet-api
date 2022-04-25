import express from "express";
import { google } from "googleapis"
import dotenv from "dotenv"
import cors from "cors"

const app = express();
const port = process.env.PORT || 8080; // default port to listen
dotenv.config()


app.use(cors())

const auth = await google.auth.getClient({
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly', 'https://www.googleapis.com/auth/drive.metadata.readonly'],
    keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS
});

// define a route handler for the default home page
app.get("/", (req, res) => {
    res.send("Hello world!");
});

app.get("/schedule", async(req, res) => {
    const sheets = google.sheets({ version: 'v4', auth });

    const range = `Sheet1!A1`;

    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SHEET_ID,
        range,
    });

    // Result

    console.log(response.data.values[0])
    res.send({ data: response.data.values[0] })

})

app.get("/modifiedDate", async(req, res) => {
    const drive = google.drive({ version: "v3", auth })

    const response = await drive.files.get({
        fileId: process.env.SHEET_ID,
        fields: "modifiedTime"
    })

    console.log(response.data)

    res.send(response.data)
})


// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${ port }`);
});