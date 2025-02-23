export function createErrorResponse(
    statusCode: 400 | 500,
    responseBody: { error: string },
) {
    console.error(responseBody.error);
    return {
        statusCode,
        body: JSON.stringify(responseBody),
    };
}
