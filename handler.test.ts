import { mockClient } from "aws-sdk-client-mock";
import request from "supertest";
import { app } from "./handler";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);

const item = {
    Item: {
        userId: "@fuga_fuga",
        userAvatarUrl: "https://b.png",
        userName: "Fuga Fuga",
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

        const response = await request(app).get("/users/@fuga_fuga");

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(item.Item);
    });

    test("存在しないuserIdでアクセスしたとき、404エラーを返す", async () => {
        ddbMock.on(GetCommand).resolves({ Item: null });

        const response = await request(app).get("/users/@ほげ");

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({
            error: 'Could not find user with provided "userId"',
        });
    });

    test("サーバー内部でのエラー発生時、500エラーを返す", async () => {
        // NOTE: DynamoDBをmock化しない

        const response = await request(app).get("/users/@fuga_fuga");

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual({ error: "Could not retrieve user" });
    });
});

describe("存在しないURLにアクセスした時、", () => {
    test("404を返す", async () => {
        ddbMock.on(GetCommand).resolves(item);

        const response = await request(app).get("/hoge");

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ error: "Not Found" });
    });
});
