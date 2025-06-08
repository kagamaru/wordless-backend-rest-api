import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { findUser } from "@/app/users/findUser";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

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

describe("GET /users/:userId", () => {
    test("正常時、userId, userName, userAvatarUrlを返す", async () => {
        ddbMock.on(GetCommand).resolves(item);

        const response = await findUser(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify(item.Item));
    });

    test("リクエストのpathParametersが無い時、USE-01と400エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await findUser(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-01",
            }),
        );
    });

    test("リクエストのuserIdが空の時、USE-01と400エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await findUser(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-01",
            }),
        );
    });

    test("存在しないuserIdでアクセスしたとき、USE-02と404エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await findUser(
            getHandlerRequest({ pathParameters: { userId: "@ほげ" } }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-02",
            }),
        );
    });

    test("UserTableとの接続に失敗したとき、USE-03と500エラーを返す", async () => {
        ddbMock.on(GetCommand).rejects(new Error());

        const response = await findUser(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-03" }));
    });
});
