import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
} from "@/utility";

const handleErrorResponse = (errorCode: string, originName: string) => {
    const errorMap = {
        "USB-02": 404,
        "USB-03": 500,
        "USB-04": 404,
        "USB-05": 500,
    };
    return createErrorResponse(
        errorMap[errorCode],
        { error: errorCode },
        originName,
    );
};

export const findUserSub = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters || !event.pathParameters.userSub) {
        return createErrorResponse(
            400,
            {
                error: "USB-01",
            },
            originName,
        );
    }

    const userSub = event.pathParameters.userSub;
    let userIdFetchedFromUserSub: string;

    try {
        userIdFetchedFromUserSub = (
            await getItemFromDynamoDB(envConfig.USER_SUB_TABLE, {
                userSub,
            })
        ).userId as string;
    } catch (error) {
        console.error(error);
        return handleErrorResponse(
            error.message === "Cannot find item" ? "USB-02" : "USB-03",
            originName,
        );
    }

    try {
        const { userId, userName, userAvatarUrl } = await getItemFromDynamoDB(
            envConfig.USER_TABLE,
            { userId: userIdFetchedFromUserSub },
        );

        return createResponse({ userId, userName, userAvatarUrl }, originName);
    } catch (error) {
        console.error(error);
        return handleErrorResponse(
            error.message === "Cannot find item" ? "USB-04" : "USB-05",
            originName,
        );
    }
};
