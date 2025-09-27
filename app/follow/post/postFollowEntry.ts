import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { FollowCoreResponse as PostFollowCoreResponse } from "@/@types";
import { envConfig } from "@/config";
import {
    createResponse,
    createErrorResponse,
    getItemFromDynamoDB,
    invokeTokenValidator,
    invokeLambda,
} from "@/utility";

const handleDynamoDBError = (error: Error, originName: string) => {
    console.error(error);
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

export const postFollowEntry = async (
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
        getItemFromDynamoDB(envConfig.USER_TABLE, { userId: followerId }),
        getItemFromDynamoDB(envConfig.USER_TABLE, { userId: followeeId }),
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

    const postFollowResult = await invokeLambda<PostFollowCoreResponse>(
        envConfig.POST_FOLLOW_LAMBDA_NAME,
        { followerId, followeeId },
    );

    if (postFollowResult === "lambdaInvokeError") {
        return createErrorResponse(
            500,
            {
                error: "FOL-15",
            },
            originName,
        );
    }

    return createResponse(postFollowResult, originName);
};
