import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "./getDynamoDBClient";

const docClient = getDynamoDBClient();

export async function getItemFromDynamoDB<T>(
    tableName: string,
    key: Record<string, string>,
): Promise<Record<string, T>> {
    try {
        const result = await docClient.send(
            new GetCommand({
                TableName: tableName,
                Key: key,
            }),
        );
        if (result.Item) {
            return result.Item;
        } else {
            throw new Error("Cannot find item");
        }
    } catch (error) {
        throw error;
    }
}
