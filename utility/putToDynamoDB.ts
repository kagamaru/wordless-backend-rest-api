import { PutCommand } from "@aws-sdk/lib-dynamodb";
import { getDynamoDBClient } from "@/utility/getDynamoDBClient";

const docClient = getDynamoDBClient();

export async function putToDynamoDB<T>(
    tableName: string,
    item: Record<string, T>,
    ConditionExpression?: string,
): Promise<void> {
    try {
        await docClient.send(
            new PutCommand({
                TableName: tableName,
                Item: item,
                ConditionExpression,
            }),
        );
    } catch (error) {
        if (error.message.includes("ConditionalCheckFailedException")) {
            throw new Error("Duplicate");
        }
        throw error;
    }
}
