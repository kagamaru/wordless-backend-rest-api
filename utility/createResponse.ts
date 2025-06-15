import { envConfig } from "@/config";

export function createResponse(
    responseBody: Object,
    originName: string,
): {
    statusCode: 200;
    body: string;
    headers: {
        "Access-Control-Allow-Origin": string;
        "Access-Control-Allow-Credentials": true;
        "Access-Control-Allow-Headers": "Content-Type";
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET";
    };
} {
    return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
        headers: {
            "Access-Control-Allow-Origin":
                originName === envConfig.ALLOW_ORIGIN
                    ? envConfig.ALLOW_ORIGIN
                    : envConfig.FRONTEND_URL,
            "Access-Control-Allow-Credentials": true,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        },
    };
}
