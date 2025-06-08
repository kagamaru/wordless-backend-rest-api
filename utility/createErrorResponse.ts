import { envConfig } from "@/config";

export function createErrorResponse(
    statusCode: 400 | 401 | 404 | 500,
    responseBody: { error: string },
    originName: string,
): {
    statusCode: 400 | 401 | 404 | 500;
    body: string;
    headers: {
        "Access-Control-Allow-Origin": string;
        "Access-Control-Allow-Headers": "Content-Type";
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET";
    };
} {
    console.error(responseBody.error);
    return {
        statusCode,
        body: JSON.stringify(responseBody),
        headers: {
            "Access-Control-Allow-Origin":
                originName === envConfig.ALLOW_ORIGIN
                    ? envConfig.ALLOW_ORIGIN
                    : envConfig.FRONTEND_URL,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        },
    };
}
