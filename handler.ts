import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import express from "express";
import serverless from "serverless-http";

const app = express();
app.use(express.json());

const USERS_TABLE = process.env.USERS_TABLE;

const client = new DynamoDBClient({
    region: "us-west-2",
});
// NOTE: ローカル検証時はこちらにする;
// const client = new DynamoDBClient({
//     region: "us-west-2",
//     credentials: { accessKeyId: "FAKE", secretAccessKey: "FAKE" },
//     endpoint: "http://localhost:8000",
// });
const docClient = DynamoDBDocumentClient.from(client);

app.get("/users/:userId", async (req: any, res: any) => {
    const params = {
        TableName: USERS_TABLE,
        Key: {
            userId: req.params.userId,
        },
    };

    try {
        const command = new GetCommand(params);
        const { Item } = await docClient.send(command);
        if (Item) {
            const { userId, userName, userAvatarUrl } = Item;
            res.json({ userId, userName, userAvatarUrl });
        } else {
            res.status(404).json({
                error: 'Could not find user with provided "userId"',
            });
        }
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: "Could not retrieve user" });
    }
});

app.use((_: any, res: any, __: any) => {
    return res.status(404).json({
        error: "Not Found",
    });
});

exports.handler = serverless(app);
