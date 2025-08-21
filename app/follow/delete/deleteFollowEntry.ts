import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { FollowCoreResponse as DeleteFollowCoreResponse } from "@/@types";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    invokeTokenValidator,
    invokeLambda,
    createResponse,
} from "@/utility";

export const deleteFollowEntry = async (
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
                error: "FOL-32",
            },
            originName,
        );
    }

    // NOTE: 存在しないIDを指定したとしても、効果がないクエリが実行されるだけのため、ユーザーの実在性確認はしない

    const deleteFollowResult = await invokeLambda<DeleteFollowCoreResponse>(
        envConfig.DELETE_FOLLOW_LAMBDA_NAME,
        { followerId, followeeId },
    );

    if (deleteFollowResult === "lambdaInvokeError") {
        return createErrorResponse(
            500,
            {
                error: "FOL-33",
            },
            originName,
        );
    }

    return createResponse(deleteFollowResult, originName);
};
