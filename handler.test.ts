import { APIGatewayProxyEvent } from "aws-lambda";
import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { getUserHandler } from "./handler";

const ddbMock = mockClient(DynamoDBDocumentClient);

const item = {
    Item: {
        userId: "@fuga_fuga",
        userName: "Fuga Fuga",
        userAvatarUrl: "https://b.png",
    },
};

beforeAll(() => {
    process.env.USERS_TABLE = "users-table-offline";
});

beforeEach(() => {
    ddbMock.reset();
});

const getHandlerRequest = (
    userId: string | undefined,
): APIGatewayProxyEvent => {
    return {
        pathParameters: {
            userId,
        },
        body: "",
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

describe("GET /users/:userId", () => {
    test("正常時、userId, userName, userAvatarUrlを返す", async () => {
        ddbMock.on(GetCommand).resolves(item);

        const response = await getUserHandler(getHandlerRequest("@fuga_fuga"));

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify(item.Item));
    });

    test("リクエストのuserIdが空の時、USE-01と400エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await getUserHandler(getHandlerRequest(undefined));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-01",
            }),
        );
    });

    test("存在しないuserIdでアクセスしたとき、USE-02と500エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await getUserHandler(getHandlerRequest("@ほげ"));

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-02",
            }),
        );
    });

    test("サーバー内部でのエラー発生時、USE-03と500エラーを返す", async () => {
        // NOTE: DynamoDBをmock化しない

        const response = await getUserHandler(getHandlerRequest("@fuga_fuga"));

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-03" }));
    });
});
