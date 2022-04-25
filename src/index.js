import express from "express";
import { google } from "googleapis"
import dotenv from "dotenv"
import cors from "cors"

const app = express();
const port = process.env.PORT || 8080; // default port to listen
dotenv.config()


app.use(cors())

// define a route handler for the default home page
app.get("/", (req, res) => {
    res.send("Hello world!");
});

app.get("/schedule", async(req, res) => {
    // Auth
    const auth = await google.auth.getClient({ scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'], keyFile: process.env.GOOGLE_APPLICATION_CREDENTIALS });

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


// start the Express server
app.listen(port, () => {
    console.log(`server started at http://localhost:${ port }`);
});