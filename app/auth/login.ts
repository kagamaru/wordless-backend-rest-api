import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { serialize } from "cookie";
import { envConfig } from "@/config";
import { createErrorResponse, createResponse } from "@/utility";

const client = new CognitoIdentityProviderClient({
    region: envConfig.AWS_REGION,
});

export const login = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.body) {
        return createErrorResponse(
            401,
            {
                error: "AUN-01",
            },
            originName,
        );
    }

    const parsedBody = JSON.parse(event.body);
    if (!parsedBody.email || !parsedBody.password) {
        return createErrorResponse(
            401,
            {
                error: "AUN-02",
            },
            originName,
        );
    }

    const email = parsedBody.email;
    const password = parsedBody.password;

    const command = new InitiateAuthCommand({
        AuthFlow: "USER_PASSWORD_AUTH",
        ClientId: envConfig.COGNITO_CLIENT_ID,
        AuthParameters: {
            USERNAME: email,
            PASSWORD: password,
        },
    });

    try {
        const { AuthenticationResult } = await client.send(command);

        if (
            !AuthenticationResult.AccessToken ||
            !AuthenticationResult.RefreshToken
        ) {
            throw new Error();
        }
        const accessToken = AuthenticationResult?.AccessToken;
        const refreshToken = AuthenticationResult?.RefreshToken;

        const headers = new Headers();
        headers.append(
            "Set-Cookie",
            serialize("accessToken", accessToken, {
                httpOnly: true,
                secure: true,
                path: "/",
                sameSite: "lax",
                maxAge: 60 * 15,
            }),
        );
        headers.append(
            "Set-Cookie",
            serialize("refreshToken", refreshToken, {
                httpOnly: true,
                secure: true,
                path: "/",
                sameSite: "lax",
                maxAge: 60 * 60 * 24 * 7,
            }),
        );

        return createResponse({}, originName, headers.get("Set-Cookie"));
    } catch {
        return createErrorResponse(
            401,
            {
                error: "AUN-03",
            },
            originName,
        );
    }
};
