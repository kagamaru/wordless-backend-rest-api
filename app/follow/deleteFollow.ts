import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { createResponse, createErrorResponse, getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const deleteFollow = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.body || !event.pathParameters) {
        return createErrorResponse(
            400,
            {
                error: "FOL-31",
            },
            originName,
        );
    }

    const { followerId } = JSON.parse(event.body);
    const { userId } = event.pathParameters;
    const followeeId = userId;

    if (!followerId || !followeeId || followerId === followeeId) {
        return createErrorResponse(
            400,
            {
                error: "FOL-32",
            },
            originName,
        );
    }

    // NOTE: 存在しないIDを指定したとしても、効果がないクエリが実行されるだけのため、ユーザーの実在性確認はしない

    let followingArray: Array<{ followee_id: string }> = [];
    let followeeArray: Array<{ follower_id: string }> = [];

    try {
        await mysqlClient.query(
            `DELETE FROM wordlessdb.follow_table WHERE follower_id = ? AND followee_id = ?`,
            [followerId, followeeId],
        );

        followingArray = await mysqlClient.query(
            `SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?`,
            [followeeId],
        );
        followeeArray = await mysqlClient.query(
            `SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id = ?`,
            [followeeId],
        );

        return createResponse(
            {
                totalNumberOfFollowing: followingArray.length,
                followingUserIds: followingArray.map(
                    (item) => item.followee_id,
                ),
                totalNumberOfFollowees: followeeArray.length,
                followeeUserIds: followeeArray.map((item) => item.follower_id),
            },
            originName,
        );
    } catch (error) {
        return createErrorResponse(
            500,
            {
                error: "FOL-33",
            },
            originName,
        );
    } finally {
        await mysqlClient.end();
    }
};
