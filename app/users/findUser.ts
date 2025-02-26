import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
} from "@/utility";

export const findUser = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters || !event.pathParameters.userId) {
        return createErrorResponse(
            400,
            {
                error: "USE-01",
            },
            originName,
        );
    }

    const pathParameterUserId = event.pathParameters.userId;

    try {
        const { userId, userName, userAvatarUrl } = await getItemFromDynamoDB(
            envConfig.USERS_TABLE,
            { userId: pathParameterUserId },
        );

        return createResponse({ userId, userName, userAvatarUrl }, originName);
    } catch (error) {
        if (error.message === "Cannot find item") {
            return createErrorResponse(
                500,
                {
                    error: "USE-02",
                },
                originName,
            );
        }

        return createErrorResponse(
            500,
            {
                error: "USE-03",
            },
            originName,
        );
    }
};
