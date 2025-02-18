import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const USERS_TABLE = process.env.USERS_TABLE;

let client = new DynamoDBClient({
    region: "us-west-2",
    credentials: { accessKeyId: "FAKE", secretAccessKey: "FAKE" },
    endpoint: "http://localhost:8000",
});

if (process.env.DEPLOY_ENV !== "offline") {
    client = new DynamoDBClient({
        region: "us-west-2",
    });
}

const docClient = DynamoDBDocumentClient.from(client);

export const findUser = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    if (!event.pathParameters || !event.pathParameters.userId) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: "USE-01" }),
        };
    }

    const { userId } = event.pathParameters;

    const params = {
        TableName: USERS_TABLE,
        Key: {
            userId,
        },
    };

    try {
        const command = new GetCommand(params);
        const { Item } = await docClient.send(command);

        if (Item) {
            const { userId, userName, userAvatarUrl } = Item;
            return {
                statusCode: 200,
                body: JSON.stringify({ userId, userName, userAvatarUrl }),
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "USE-02" }),
            };
        }
    } catch (error) {
        console.error("Error fetching user:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: "USE-03" }),
        };
    }
};
