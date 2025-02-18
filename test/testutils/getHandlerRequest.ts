import {
    APIGatewayProxyEvent,
    APIGatewayProxyEventPathParameters,
} from "aws-lambda";

export const getHandlerRequest = (
    pathParameters?: APIGatewayProxyEventPathParameters,
    body?: string,
): APIGatewayProxyEvent => {
    return {
        pathParameters,
        body,
        headers: undefined,
        multiValueHeaders: undefined,
        httpMethod: "",
        isBase64Encoded: false,
        path: "",
        queryStringParameters: undefined,
        multiValueQueryStringParameters: undefined,
        stageVariables: undefined,
        requestContext: undefined,
        resource: "",
    };
};
