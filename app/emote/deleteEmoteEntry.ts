import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { envConfig } from "@/config";
import {
    createErrorResponse,
    createResponse,
    invokeLambda,
    invokeTokenValidator,
} from "@/utility";

export const deleteEmoteEntry = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.pathParameters || !event.body) {
        return createErrorResponse(
            400,
            {
                error: "EMT-11",
            },
            originName,
        );
    }

    const { emoteId } = event.pathParameters;
    if (!emoteId) {
        return createErrorResponse(
            400,
            {
                error: "EMT-12",
            },
            originName,
        );
    }

    let userId: string;
    try {
        userId = JSON.parse(event.body).userId;
    } catch {
        return createErrorResponse(
            400,
            {
                error: "EMT-13",
            },
            originName,
        );
    }

    if (!userId) {
        return createErrorResponse(400, { error: "EMT-14" }, originName);
    }

    const result = await invokeTokenValidator(
        event.headers.Authorization,
        userId,
    );
    if (result === "invalid") {
        return createErrorResponse(401, { error: "AUN-99" }, originName);
    }

    try {
        const deleteEmoteResult = await invokeLambda(
            envConfig.DELETE_EMOTE_LAMBDA_NAME,
            { emoteId },
        );

        if (deleteEmoteResult === "lambdaInvokeError") {
            return createErrorResponse(
                500,
                {
                    error: "EMT-15",
                },
                originName,
            );
        } else if (deleteEmoteResult === "success") {
            return createResponse({}, originName);
        }
    } catch (error) {
        return createErrorResponse(500, { error: "EMT-16" }, originName);
    }
};
