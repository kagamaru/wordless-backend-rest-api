export function createResponse(responseBody: Object, originName: string) {
    return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
        headers: {
            "Access-Control-Allow-Origin": originName.includes(
                process.env.ALLOW_ORIGIN,
            )
                ? process.env.ALLOW_ORIGIN
                : process.env.FRONTEND_URL,
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Allow-Methods": "OPTIONS, POST, GET",
        },
    };
}
