import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { envConfig } from "@/config";

export const getDynamoDBClient = (): DynamoDBDocumentClient => {
    let client = new DynamoDBClient({
        region: envConfig.AWS_REGION,
        credentials: { accessKeyId: "FAKE", secretAccessKey: "FAKE" },
        endpoint: "http://localhost.test:8000",
    });
    if (process.env.DEPLOY_ENV !== "offline") {
        client = new DynamoDBClient({
            region: envConfig.AWS_REGION,
        });
    }
    return DynamoDBDocumentClient.from(client, {
        marshallOptions: {
            removeUndefinedValues: true,
        },
    });
};
