export function createResponse(responseBody: Object) {
    return {
        statusCode: 200,
        body: JSON.stringify(responseBody),
    };
}
