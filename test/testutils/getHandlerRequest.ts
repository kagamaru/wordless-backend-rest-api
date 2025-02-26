import {
    APIGatewayProxyEvent,
    APIGatewayProxyEventPathParameters,
} from "aws-lambda";

export const getHandlerRequest = (request: {
    pathParameters?: APIGatewayProxyEventPathParameters;
    queryStringParameters?: APIGatewayProxyEventPathParameters;
    body?: string;
}): APIGatewayProxyEvent => {
    const { pathParameters, queryStringParameters, body } = request;
    return {
        pathParameters,
        body,
        headers: {
            origin: "http://localhost:3000",
        },
        multiValueHeaders: undefined,
        httpMethod: "",
        isBase64Encoded: false,
        path: "",
        queryStringParameters,
        multiValueQueryStringParameters: undefined,
        stageVariables: undefined,
        requestContext: undefined,
        resource: "",
    };
};
