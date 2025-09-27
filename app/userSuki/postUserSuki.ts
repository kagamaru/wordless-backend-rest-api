import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
    invokeTokenValidator,
    putToDynamoDB,
} from "@/utility";
import { PostUserSukiPayload } from "@/@types";
import { emojiIds } from "@/static/emojiIds";

export const postUserSuki = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters || !event.pathParameters.userId || !event.body) {
        return createErrorResponse(
            400,
            {
                error: "USK-11",
            },
            originName,
        );
    }

    const pathParameterUserId = event.pathParameters.userId;
    const result = await invokeTokenValidator(
        event.headers.Authorization,
        pathParameterUserId,
    );
    if (result === "invalid") {
        return createErrorResponse(401, { error: "AUN-99" }, originName);
    }

    let body: PostUserSukiPayload;
    try {
        body = JSON.parse(event.body) as PostUserSukiPayload;
    } catch (error) {
        console.error(error);
        return createErrorResponse(
            400,
            {
                error: "USK-11",
            },
            originName,
        );
    }

    const { userSukiEmoji1, userSukiEmoji2, userSukiEmoji3, userSukiEmoji4 } =
        body;

    let isEmoteEnd = false;
    for (const emoteEmoji of [
        userSukiEmoji1,
        userSukiEmoji2,
        userSukiEmoji3,
        userSukiEmoji4,
    ]) {
        if (!emoteEmoji) {
            isEmoteEnd = true;
        } else {
            // NOTE: undefinedの絵文字がある(既に好きな絵文字の登録が終わっている)にも関わらず、後続の絵文字が存在する場合、エラーとする
            if (isEmoteEnd) {
                return createErrorResponse(
                    400,
                    {
                        error: "USK-11",
                    },
                    originName,
                );
            }
            // NOTE: 絵文字がリストの中に存在しない場合、エラーとする
            if (!emojiIds.includes(emoteEmoji)) {
                return createErrorResponse(
                    400,
                    {
                        error: "USK-11",
                    },
                    originName,
                );
            }
        }
    }

    try {
        await getItemFromDynamoDB(envConfig.USER_TABLE, {
            userId: pathParameterUserId,
        });
    } catch (error) {
        console.error(error);
        if (error.message === "Cannot find item") {
            return createErrorResponse(
                404,
                {
                    error: "USK-12",
                },
                originName,
            );
        }
        return createErrorResponse(
            500,
            {
                error: "USK-13",
            },
            originName,
        );
    }

    try {
        await putToDynamoDB(envConfig.USER_SUKI_TABLE, {
            userId: pathParameterUserId,
            userSuki: [
                userSukiEmoji1,
                userSukiEmoji2,
                userSukiEmoji3,
                userSukiEmoji4,
            ],
        });
    } catch (error) {
        console.error(error);
        return createErrorResponse(
            500,
            {
                error: "USK-14",
            },
            originName,
        );
    }

    try {
        const { userSuki } = await getItemFromDynamoDB(
            envConfig.USER_SUKI_TABLE,
            {
                userId: pathParameterUserId,
            },
        );
        return createResponse({ userSuki }, originName);
    } catch (error) {
        console.error(error);
        if (error.message === "Cannot find item") {
            return createErrorResponse(
                404,
                {
                    error: "USK-15",
                },
                originName,
            );
        }

        return createErrorResponse(
            500,
            {
                error: "USK-16",
            },
            originName,
        );
    }
};
