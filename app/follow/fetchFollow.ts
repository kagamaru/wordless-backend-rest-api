import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse, createErrorResponse, getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const fetchFollow = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters) {
        return createErrorResponse(
            400,
            {
                error: "FOL-01",
            },
            originName,
        );
    }

    const { userId } = event.pathParameters;

    if (!userId) {
        return createErrorResponse(
            400,
            {
                error: "FOL-02",
            },
            originName,
        );
    }

    // NOTE: 存在しないuserIdを指定したとしても、空配列が返却されるだけなので、userIdの実在性検査はしない

    let followingArray: Array<{ followee_id: string }> = [];
    let followeeArray: Array<{ follower_id: string }> = [];

    try {
        followingArray = await mysqlClient.query(
            `SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?`,
            [userId],
        );
        followeeArray = await mysqlClient.query(
            `SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id = ?`,
            [userId],
        );
    } catch (error) {
        return createErrorResponse(
            500,
            {
                error: "FOL-03",
            },
            originName,
        );
    } finally {
        await mysqlClient.end();
    }

    return createResponse(
        {
            totalNumberOfFollowing: followingArray.length,
            followingUserIds: followingArray.map((item) => item.followee_id),
            totalNumberOfFollowees: followeeArray.length,
            followeeUserIds: followeeArray.map((item) => item.follower_id),
        },
        originName,
    );
};
