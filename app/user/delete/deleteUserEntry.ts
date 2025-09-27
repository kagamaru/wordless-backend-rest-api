import {
    createErrorResponse,
    createResponse,
    invokeTokenValidator,
    invokeLambda,
} from "@/utility";
import { envConfig } from "@/config";
import { putToDynamoDB } from "@/utility/putToDynamoDB";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { BLACKLISTED } from "@/static/blackListIds";

export const deleteUserEntry = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;

    if (
        !event.pathParameters ||
        !event.pathParameters.userId ||
        event.pathParameters.userId === ""
    ) {
        return createErrorResponse(400, { error: "USE-41" }, originName);
    }
    const userId = event.pathParameters.userId;

    if (BLACKLISTED.has(userId)) {
        return createErrorResponse(400, { error: "USE-42" }, originName);
    }

    const tokenResult = await invokeTokenValidator(
        event.headers.Authorization,
        userId,
    );
    if (tokenResult !== "valid") {
        return createErrorResponse(401, { error: "AUN-99" }, originName);
    }

    const lambdaResult = await invokeLambda(envConfig.DELETE_USER_LAMBDA_NAME, {
        userId,
    });
    if (lambdaResult === "lambdaInvokeError") {
        return createErrorResponse(500, { error: "USE-43" }, originName);
    }

    try {
        await putToDynamoDB(
            envConfig.USER_TABLE,
            {
                userId,
                userName: "削除済みユーザー",
                userAvatarUrl:
                    envConfig.CLOUDFRONT_USER_IMAGE_URL +
                    "/userImagePreset/deletedAvatar.png",
            },
            "attribute_exists(userId)",
        );
    } catch (e: any) {
        if (e && e.message && e.message.includes("Not found")) {
            return createErrorResponse(404, { error: "USE-44" }, originName);
        }
        return createErrorResponse(500, { error: "USE-45" }, originName);
    }

    try {
        await putToDynamoDB(
            envConfig.USER_SUKI_TABLE,
            { userId, userSuki: [] },
            "attribute_exists(userId)",
        );
    } catch (e: any) {
        if (e && e.message && e.message.includes("Not found")) {
            return createErrorResponse(404, { error: "USE-46" }, originName);
        }
        return createErrorResponse(500, { error: "USE-47" }, originName);
    }

    return createResponse({}, originName);
};
