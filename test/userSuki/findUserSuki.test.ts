import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { findUserSuki } from "@/app/userSuki/findUserSuki";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);

const item = {
    Item: {
        userId: "@fuga_fuga",
        userSuki: ["snake", "dog", ":arrived:", ":neko_meme_screaming_cat:"],
    },
};

beforeAll(() => {
    process.env.USER_SUKI_TABLE = "user-suki-table-offline";
});

beforeEach(() => {
    ddbMock.reset();
});

describe("GET /users/:userId", () => {
    test("正常時、userSukiを返す", async () => {
        ddbMock.on(GetCommand).resolves(item);

        const response = await findUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({ userSuki: item.Item.userSuki }),
        );
    });

    test("正常時、userSukiが空の時、空の配列を返す", async () => {
        ddbMock
            .on(GetCommand)
            .resolves({ Item: { userId: "@fuga_fuga", userSuki: [] } });

        const response = await findUserSuki(
            getHandlerRequest({ pathParameters: { userId: "@fuga_fuga" } }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify({ userSuki: [] }));
    });

    test("リクエストのpathParametersが無い時、USK-01と400エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await findUserSuki(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-01",
            }),
        );
    });

    test("リクエストのuserIdが空の時、USK-01と400エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await findUserSuki(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-01",
            }),
        );
    });

    test("存在しないuserIdでアクセスしたとき、USK-02と404エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await findUserSuki(
            getHandlerRequest({ pathParameters: { userId: "@ほげ" } }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-02",
            }),
        );
    });

    test("UserSukiTableとの接続に失敗したとき、USK-03と500エラーを返す", async () => {
        ddbMock.on(GetCommand).rejects(new Error());

        const response = await findUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USK-03" }));
    });
});
