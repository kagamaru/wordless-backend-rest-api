import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    invokeTokenValidateAndGetUserSub,
    putToDynamoDB,
    verifyUserId,
    verifyUserName,
} from "@/utility";

export const postUser = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;

    if (!event.pathParameters || !event.pathParameters.userId) {
        return createErrorResponse(400, { error: "USE-31" }, originName);
    }
    const userId = event.pathParameters.userId;

    let body: { userName: string };
    let userName: string;
    try {
        body = JSON.parse(event.body);
        userName = body.userName;
    } catch (error) {
        console.error(error);
        return createErrorResponse(400, { error: "USE-32" }, originName);
    }

    if (verifyUserId(userId) === "error") {
        return createErrorResponse(400, { error: "USE-33" }, originName);
    }

    if (verifyUserName(userName) === "error") {
        return createErrorResponse(400, { error: "USE-34" }, originName);
    }

    const tokenResult = await invokeTokenValidateAndGetUserSub(
        event.headers.Authorization,
    );
    if (tokenResult.isValid !== "valid") {
        return createErrorResponse(401, { error: "AUN-99" }, originName);
    }

    try {
        await putToDynamoDB(
            envConfig.USERS_TABLE,
            {
                userId,
                userName,
                userAvatarUrl:
                    envConfig.CLOUDFRONT_USER_IMAGE_URL +
                    "/userImagePreset/presetAvatar.png",
            },
            "attribute_not_exists(userId)",
        );
    } catch (e: any) {
        console.error(e);
        if (e && e.message && e.message.includes("Duplicate")) {
            return createErrorResponse(400, { error: "USE-36" }, originName);
        }
        return createErrorResponse(500, { error: "USE-35" }, originName);
    }

    try {
        await putToDynamoDB(envConfig.USER_SUB_TABLE, {
            userSub: tokenResult.userSub,
            userId,
        });
    } catch (error) {
        console.error(error);
        return createErrorResponse(500, { error: "USE-37" }, originName);
    }

    try {
        await putToDynamoDB(envConfig.USER_SUKI_TABLE, {
            userId,
            userSuki: [],
        });
    } catch (error) {
        console.error(error);
        return createErrorResponse(500, { error: "USE-38" }, originName);
    }

    return createResponse({ userId }, originName);
};
