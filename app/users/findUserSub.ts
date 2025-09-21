import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    getItemFromDynamoDB,
} from "@/utility";

const handleErrorResponse = (errorCode: string, originName: string) => {
    const errorMap = {
        "USE-12": 404,
        "USE-13": 500,
        "USE-14": 404,
        "USE-15": 500,
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
                error: "USE-11",
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
            error.message === "Cannot find item" ? "USE-12" : "USE-13",
            originName,
        );
    }

    try {
        const { userId, userName, userAvatarUrl } = await getItemFromDynamoDB(
            envConfig.USERS_TABLE,
            { userId: userIdFetchedFromUserSub },
        );

        return createResponse({ userId, userName, userAvatarUrl }, originName);
    } catch (error) {
        console.error(error);
        return handleErrorResponse(
            error.message === "Cannot find item" ? "USE-14" : "USE-15",
            originName,
        );
    }
};
