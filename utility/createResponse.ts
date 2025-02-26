export function createResponse(
    responseBody: Object,
    originName: string,
): {
    statusCode: 200;
    body: string;
    headers: {
        "Access-Control-Allow-Origin": string;
        "Access-Control-Allow-Headers": "Content-Type";
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET";
    };
} {
    return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
        headers: {
            "Access-Control-Allow-Origin":
                originName === process.env.ALLOW_ORIGIN
                    ? process.env.ALLOW_ORIGIN
                    : process.env.FRONTEND_URL,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        },
    };
}
