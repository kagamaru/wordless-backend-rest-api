export function createErrorResponse(
    statusCode: 400 | 401 | 500,
    responseBody: { error: string },
    originName: string,
): {
    statusCode: 400 | 401 | 500;
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
                originName === process.env.ALLOW_ORIGIN
                    ? process.env.ALLOW_ORIGIN
                    : process.env.FRONTEND_URL,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        },
    };
}
