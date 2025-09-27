import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { postUser } from "@/app/user/postUser";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";

const ddbMock = mockClient(DynamoDBDocumentClient);
const userTableName = "user-table-offline";
const userSubTableName = "user-sub-table-offline";
const userSukiTableName = "user-suki-table-offline";

jest.mock("@/config", () => ({
    envConfig: {
        USER_TABLE: "user-table-offline",
        USER_SUB_TABLE: "user-sub-table-offline",
        USER_SUKI_TABLE: "user-suki-table-offline",
    },
}));

let invokeTokenValidateAndGetUserSubMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidateAndGetUserSub: () =>
            invokeTokenValidateAndGetUserSubMock(),
    };
});

const testSetUp = (setUp: {
    isUserSubDBPostSetup: "ok" | "fail";
    isUserDBPostSetup: "ok" | "fail" | "duplicate";
    isUserSukiDBPostSetup: "ok" | "fail";
}): void => {
    const userSubDdbPostMock = ddbMock.on(PutCommand, {
        TableName: userSubTableName,
        Item: {
            userSub: "userSub",
            userId: "@a",
        },
    });
    const userDdbPostMock = ddbMock.on(PutCommand, {
        TableName: userTableName,
        Item: {
            userId: "@a",
        },
    });
    const userSukiDdbPostMock = ddbMock.on(PutCommand, {
        TableName: userSukiTableName,
        Item: {
            userId: "@a",
            userSuki: [],
        },
    });

    if (setUp.isUserSubDBPostSetup === "ok") {
        userSubDdbPostMock.resolves({});
    } else if (setUp.isUserSubDBPostSetup === "fail") {
        userSubDdbPostMock.rejects(new Error());
    }

    if (setUp.isUserDBPostSetup === "ok") {
        userDdbPostMock.resolves({});
    } else if (setUp.isUserDBPostSetup === "duplicate") {
        userDdbPostMock.rejects(
            new ConditionalCheckFailedException({
                $metadata: {},
                message: "Duplicate userId",
            }),
        );
    } else if (setUp.isUserDBPostSetup === "fail") {
        userDdbPostMock.rejects(new Error());
    }

    if (setUp.isUserSukiDBPostSetup === "ok") {
        userSukiDdbPostMock.resolves({});
    } else if (setUp.isUserSukiDBPostSetup === "fail") {
        userSukiDdbPostMock.rejects(new Error());
    }
};

beforeEach(() => {
    ddbMock.reset();
    invokeTokenValidateAndGetUserSubMock = jest.fn(() => ({
        isValid: "valid",
        userSub: "userSub",
    }));
});

describe("正常系", () => {
    beforeEach(() => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });
    });

    test.each([
        "@abc",
        "@abc123",
        "@abc_123",
        "@a_b_c",
        "@z9_",
        "@" + "a".repeat(23),
    ])("userIdが%sの時、200を返す", async (userId) => {
        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(200);
    });

    test.each([
        "A",
        "User.Name",
        "foo-bar",
        "HELLO_WORLD",
        ".-_.",
        "Z9.-_",
        "X".repeat(24),
    ])("userNameが%sの時、200を返す", async (userName) => {
        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName }),
            }),
        );

        expect(response.statusCode).toBe(200);
    });

    test("userIdを返す", async () => {
        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify({ userId: "@a" }));
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とUSE-31を返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-31",
            }),
        );
    });

    test("リクエストのuserIdが空の時、ステータスコード400とUSE-31を返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "" },
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-31",
            }),
        );
    });

    test("リクエストのuserIdがundefinedの時、ステータスコード400とUSE-31を返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: undefined },
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-31",
            }),
        );
    });

    test("リクエストボディが無い時、ステータスコード400とUSE-32を返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-32",
            }),
        );
    });

    test("リクエストボディがJSON形式でない時、ステータスコード400とUSE-32を返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: "invalid-json",
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-32",
            }),
        );
    });

    test.each([
        "@Abc",
        "@abc-123",
        "@abc.123",
        "@abc@123",
        "@abc 123",
        "@",
        "abc",
        "@" + "a".repeat(24),
    ])("userIdが%sの時、ステータスコード400とUSE-33を返す", async (userId) => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-33",
            }),
        );
    });

    test.each([
        "ユーザーネーム",
        "ゆーざーねーむ",
        "🐍",
        "@/",
        " name ",
        "a".repeat(25),
    ])(
        "userNameに使用できない文字が含まれている時、ステータスコード400とUSE-34を返す",
        async (userName) => {
            testSetUp({
                isUserSubDBPostSetup: "ok",
                isUserDBPostSetup: "ok",
                isUserSukiDBPostSetup: "ok",
            });

            const response = await postUser(
                getHandlerRequest({
                    pathParameters: { userId: "@a" },
                    body: JSON.stringify({ userName }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "USE-34",
                }),
            );
        },
    );

    test("トークンの検証に失敗した時、AUN-99と401エラーを返す", async () => {
        invokeTokenValidateAndGetUserSubMock = jest.fn(() => ({
            isValid: "invalid",
            userSub: "userSub",
        }));

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-99",
            }),
        );
    });

    test("ユーザーIDの登録時、userTableと接続できなかった場合、USE-35と500エラーを返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "fail",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-35",
            }),
        );
    });

    test("指定されたユーザーIDが既に存在している時、ステータスコード400とUSE-36を返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "duplicate",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-36",
            }),
        );
    });

    test("userSubの登録時、userSubTableと接続できなかった場合、USE-37と500エラーを返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "fail",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "ok",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-37",
            }),
        );
    });

    test("userSukiの登録時、userSukiTableと接続できなかった場合、USE-38と500エラーを返す", async () => {
        testSetUp({
            isUserSubDBPostSetup: "ok",
            isUserDBPostSetup: "ok",
            isUserSukiDBPostSetup: "fail",
        });

        const response = await postUser(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName: "test-user" }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-38",
            }),
        );
    });
});
