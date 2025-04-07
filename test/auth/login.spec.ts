import { mockClient } from "aws-sdk-client-mock";
import {
    CognitoIdentityProviderClient,
    InitiateAuthCommand,
} from "@aws-sdk/client-cognito-identity-provider";
import { login } from "@/app/auth/login";
import { getHandlerRequest } from "../testutils/getHandlerRequest";

const cognitoMock = mockClient(CognitoIdentityProviderClient);

jest.mock("@/config", () => ({
    envConfig: {
        COGNITO_USER_POOL_ARN: "arn",
        COGNITO_CLIENT_ID: "clientId",
        AWS_REGION: "us-west-2",
    },
}));

beforeEach(() => {
    cognitoMock.on(InitiateAuthCommand).resolves({
        AuthenticationResult: {
            AccessToken: "dummy",
            RefreshToken: "dummyForRefresh",
        },
    });
});

afterEach(() => {
    cognitoMock.reset();
});

describe("接続時", () => {
    test("正常時、アクセストークンとリフレッシュトークンをヘッダーに入れて返す", async () => {
        const response = await login(
            getHandlerRequest({
                body: JSON.stringify({
                    email: "example@example.com",
                    password: "password01",
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.headers["Set-Cookie"]).toContain("accessToken=dummy");
        expect(response.headers["Set-Cookie"]).toContain(
            "refreshToken=dummyForRefresh",
        );
    });
});

describe("異常系", () => {
    test("リクエストボディが空の時、ステータスコード401とAUN-01を返す", async () => {
        const response = await login(getHandlerRequest({}));

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-01",
            }),
        );
    });

    test("メールアドレスが取得できない時、ステータスコード401とAUN-02を返す", async () => {
        const response = await login(
            getHandlerRequest({
                body: JSON.stringify({
                    password: "password01",
                }),
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-02",
            }),
        );
    });

    test("パスワードが取得できない時、ステータスコード401とAUN-02を返す", async () => {
        const response = await login(
            getHandlerRequest({
                body: JSON.stringify({
                    email: "example@example.com",
                }),
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-02",
            }),
        );
    });

    test("アクセストークンが取得できない時、ステータスコード401とAUN-03を返す", async () => {
        cognitoMock.on(InitiateAuthCommand).resolves({
            AuthenticationResult: {
                RefreshToken: "dummy",
            },
        });

        const response = await login(
            getHandlerRequest({
                body: JSON.stringify({
                    email: "example@example.com",
                    password: "password01",
                }),
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-03",
            }),
        );
    });

    test("リフレッシュトークンが取得できない時、ステータスコード401とAUN-03を返す", async () => {
        cognitoMock.on(InitiateAuthCommand).resolves({
            AuthenticationResult: {
                AccessToken: "dummy",
            },
        });

        const response = await login(
            getHandlerRequest({
                body: JSON.stringify({
                    email: "example@example.com",
                    password: "password01",
                }),
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-03",
            }),
        );
    });
});
