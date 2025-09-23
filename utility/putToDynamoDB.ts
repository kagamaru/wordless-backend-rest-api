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
        if (
            ConditionExpression &&
            error.message === "The conditional request failed"
        ) {
            if (ConditionExpression.includes("attribute_not_exists")) {
                throw new Error("Duplicate");
            } else if (ConditionExpression.includes("attribute_exists")) {
                throw new Error("Not found");
            }
        } else {
            throw error;
        }
    }
}
