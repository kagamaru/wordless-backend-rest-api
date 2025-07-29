import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { ErrorCode } from "@/@types";
import { getDynamoDBClient } from "@/utility/getDynamoDBClient";

const docClient = getDynamoDBClient();

export async function putToDynamoDB<T>(
    tableName: string,
    item: Record<string, T>,
): Promise<void> {
    try {
        await docClient.send(
            new PutCommand({
                TableName: tableName,
                Item: item,
            }),
        );
    } catch (error) {
        throw error;
    }
}
