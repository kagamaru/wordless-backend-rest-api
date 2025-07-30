import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createErrorResponse, getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const deleteEmote = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters) {
        return createErrorResponse(
            400,
            {
                error: "EMT-11",
            },
            originName,
        );
    }

    const { emoteId } = event.pathParameters;

    if (!emoteId) {
        return createErrorResponse(
            400,
            {
                error: "EMT-12",
            },
            originName,
        );
    }

    try {
        await mysqlClient.query(
            `UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE emote_id = ?`,
            [emoteId],
        );
    } catch (error) {
        return createErrorResponse(
            500,
            {
                error: "EMT-13",
            },
            originName,
        );
    } finally {
        await mysqlClient.end();
    }
};
