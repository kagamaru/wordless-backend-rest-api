import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    createResponse,
    createErrorResponse,
    getRDSDBClient,
    getItemFromDynamoDB,
    invokeTokenValidator,
} from "@/utility";
import { envConfig } from "@/config";

const mysqlClient = getRDSDBClient();

const handleDynamoDBError = (error: Error, originName: string) => {
    if (error.message === "Cannot find item") {
        return createErrorResponse(
            404,
            {
                error: "FOL-13",
            },
            originName,
        );
    }
    return createErrorResponse(
        500,
        {
            error: "FOL-14",
        },
        originName,
    );
};

export const postFollow = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.body || !event.pathParameters) {
        return createErrorResponse(
            400,
            {
                error: "FOL-11",
            },
            originName,
        );
    }

    const { followerId } = JSON.parse(event.body);
    const result = await invokeTokenValidator(
        event.headers.Authorization,
        followerId,
    );
    if (result === "invalid") {
        return createErrorResponse(401, { error: "AUN-99" }, originName);
    }

    const { userId } = event.pathParameters;
    const followeeId = userId;

    if (!followerId || !followeeId || followerId === followeeId) {
        return createErrorResponse(
            400,
            {
                error: "FOL-12",
            },
            originName,
        );
    }

    const dynamoPromises = [
        getItemFromDynamoDB(envConfig.USERS_TABLE, { userId: followerId }),
        getItemFromDynamoDB(envConfig.USERS_TABLE, { userId: followeeId }),
    ];

    // NOTE: フォローされるユーザーが存在しない場合、エラーを返す
    // NOTE: フォローするユーザーが存在しない場合、エラーを返す
    try {
        await Promise.all(dynamoPromises);
    } catch (error) {
        if (error instanceof Error) {
            return handleDynamoDBError(error, originName);
        }
    }

    let followingArray: Array<{ followee_id: string }> = [];
    let followeeArray: Array<{ follower_id: string }> = [];

    try {
        await mysqlClient.query(
            `INSERT INTO wordlessdb.follow_table (follower_id, followee_id) VALUES (?, ?)`,
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
                error: "FOL-15",
            },
            originName,
        );
    } finally {
        await mysqlClient.end();
    }
};
