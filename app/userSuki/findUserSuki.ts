import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
} from "@/utility";

export const findUserSuki = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters || !event.pathParameters.userId) {
        return createErrorResponse(
            400,
            {
                error: "USK-01",
            },
            originName,
        );
    }

    const pathParameterUserId = event.pathParameters.userId;

    try {
        const { userSuki } = await getItemFromDynamoDB(
            envConfig.USER_SUKI_TABLE,
            { userId: pathParameterUserId },
        );

        return createResponse({ userSuki }, originName);
    } catch (error) {
        if (error.message === "Cannot find item") {
            return createErrorResponse(
                404,
                {
                    error: "USK-02",
                },
                originName,
            );
        }

        return createErrorResponse(
            500,
            {
                error: "USK-03",
            },
            originName,
        );
    }
};
