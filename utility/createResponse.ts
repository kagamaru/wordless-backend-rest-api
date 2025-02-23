export function createResponse(responseBody: Object | { error: string }) {
    return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
    };
}
