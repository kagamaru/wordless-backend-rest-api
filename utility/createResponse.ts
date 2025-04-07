export function createResponse(
    responseBody: Object,
    originName: string,
    token?: string,
): {
    statusCode: 200;
    body: string;
    headers: {
        "Set-Cookie": string;
        "Access-Control-Allow-Origin": string;
        "Access-Control-Allow-Headers": "Content-Type";
        "Access-Control-Allow-Methods": "OPTIONS, POST, GET";
    };
} {
    return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
        headers: {
            "Set-Cookie": token ? encodeURIComponent(token) : "",
            "Access-Control-Allow-Origin":
                originName === process.env.ALLOW_ORIGIN
                    ? process.env.ALLOW_ORIGIN
                    : process.env.FRONTEND_URL,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        },
    };
}
