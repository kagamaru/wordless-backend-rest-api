import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { User } from "@/@types";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
    invokeTokenValidator,
    putToDynamoDB,
    verifyUserName,
} from "@/utility";
import { BLACKLISTED } from "@/static/blackListIds";

type PostUserNameRequestBody = {
    userName: string;
};

export const postUserName = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;

    if (!event.pathParameters || !event.pathParameters.userId || !event.body) {
        return createErrorResponse(
            400,
            {
                error: "USE-21",
            },
            originName,
        );
    }

    const userId = event.pathParameters.userId;

    if (BLACKLISTED.has(userId)) {
        return createErrorResponse(
            400,
            {
                error: "USE-22",
            },
            originName,
        );
    }

    const result = await invokeTokenValidator(
        event.headers.Authorization,
        userId,
    );
    if (result === "invalid") {
        return createErrorResponse(401, { error: "AUN-99" }, originName);
    }

    let userItem: User;
    try {
        userItem = (await getItemFromDynamoDB(envConfig.USER_TABLE, {
            userId,
        })) as User;
    } catch (error) {
        console.error(error);
        if (error.message === "Cannot find item") {
            return createErrorResponse(
                404,
                {
                    error: "USE-23",
                },
                originName,
            );
        }

        return createErrorResponse(
            500,
            {
                error: "USE-24",
            },
            originName,
        );
    }

    let requestBody: PostUserNameRequestBody;
    try {
        requestBody = JSON.parse(event.body);
    } catch (error) {
        console.error(error);
        return createErrorResponse(
            400,
            {
                error: "USE-25",
            },
            originName,
        );
    }

    const { userName } = requestBody;

    if (verifyUserName(userName) === "error") {
        return createErrorResponse(
            400,
            {
                error: "USE-26",
            },
            originName,
        );
    }

    try {
        await putToDynamoDB(envConfig.USER_TABLE, {
            userId,
            userName,
            userAvatarUrl: userItem.userAvatarUrl,
        });

        return createResponse({}, originName);
    } catch (error) {
        return createErrorResponse(
            500,
            {
                error: "USE-27",
            },
            originName,
        );
    }
};
