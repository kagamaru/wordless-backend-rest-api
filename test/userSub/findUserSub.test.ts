import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { findUserSub } from "@/app/userSub/findUserSub";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);

const userSubTableName = "user-sub-table-offline";
const userTableName = "user-table-offline";

const userTableItem = {
    Item: {
        userId: "@fuga_fuga",
        userName: "Fuga Fuga",
        userAvatarUrl: "https://image.test/b.png",
    },
};

const userSubTableItem = {
    Item: {
        userSub: "userSub",
        userId: "@fuga_fuga",
    },
};

jest.mock("@/config", () => ({
    // HACK: 変数へのアクセスが不可のため、ハードコーディングする
    envConfig: {
        USER_SUB_TABLE: "user-sub-table-offline",
        USER_TABLE: "user-table-offline",
    },
}));

beforeEach(() => {
    ddbMock.reset();
});

const testSetUp = (setUpDB: {
    isUserDBSetup: "ok" | "fail" | "notfound";
    isUserSubDBSetup: "ok" | "fail" | "notfound";
}): void => {
    const userDdbMock = ddbMock.on(GetCommand, {
        TableName: userTableName,
        Key: {
            userId: "@fuga_fuga",
        },
    });
    const userSubDdbMock = ddbMock.on(GetCommand, {
        TableName: userSubTableName,
        Key: {
            userSub: "userSub",
        },
    });

    if (setUpDB.isUserDBSetup === "ok") {
        userDdbMock.resolves(userTableItem);
    } else if (setUpDB.isUserDBSetup === "notfound") {
        userDdbMock.resolves({ Item: null });
    } else {
        userDdbMock.rejects(new Error());
    }

    if (setUpDB.isUserSubDBSetup === "ok") {
        userSubDdbMock.resolves(userSubTableItem);
    } else if (setUpDB.isUserSubDBSetup === "notfound") {
        userSubDdbMock.resolves({ Item: null });
    } else {
        userSubDdbMock.rejects(new Error());
    }
};

describe("正常系", () => {
    test("正常時、userId, userName, userAvatarUrlを返す", async () => {
        testSetUp({ isUserDBSetup: "ok", isUserSubDBSetup: "ok" });

        const response = await findUserSub(
            getHandlerRequest({
                pathParameters: { userSub: "userSub" },
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify(userTableItem.Item));
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが無い時、USE-11と400エラーを返す", async () => {
        testSetUp({ isUserDBSetup: "ok", isUserSubDBSetup: "ok" });

        const response = await findUserSub(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-11",
            }),
        );
    });

    test("リクエストのuserSubが空の時、USE-11と400エラーを返す", async () => {
        testSetUp({ isUserDBSetup: "ok", isUserSubDBSetup: "ok" });

        const response = await findUserSub(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-11",
            }),
        );
    });

    test("存在しないuserSubでアクセスしたとき、USE-12と404エラーを返す", async () => {
        testSetUp({ isUserDBSetup: "ok", isUserSubDBSetup: "notfound" });

        const response = await findUserSub(
            getHandlerRequest({ pathParameters: { userSub: "userSub" } }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-12",
            }),
        );
    });

    test("UserSubTableとの接続に失敗したとき、USE-13と500エラーを返す", async () => {
        testSetUp({ isUserDBSetup: "ok", isUserSubDBSetup: "fail" });

        const response = await findUserSub(
            getHandlerRequest({
                pathParameters: { userSub: "userSub" },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-13" }));
    });

    test("UserSubTableから取得したuserIdに該当するユーザーがUserTableに存在しない時、USE-14と404エラーを返す", async () => {
        testSetUp({ isUserDBSetup: "notfound", isUserSubDBSetup: "ok" });

        const response = await findUserSub(
            getHandlerRequest({ pathParameters: { userSub: "userSub" } }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-14" }));
    });

    test("UserTableとの接続に失敗したとき、USE-15と500エラーを返す", async () => {
        testSetUp({ isUserDBSetup: "fail", isUserSubDBSetup: "ok" });

        const response = await findUserSub(
            getHandlerRequest({ pathParameters: { userSub: "userSub" } }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-15" }));
    });
});
