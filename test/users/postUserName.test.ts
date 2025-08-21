import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { postUserName } from "@/app/users/postUserName";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);
const usersTableName = "users-table-offline";

jest.mock("@/config", () => ({
    envConfig: {
        USERS_TABLE: "users-table-offline",
    },
}));

let invokeTokenValidatorMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidator: () => invokeTokenValidatorMock(),
    };
});

const testSetUp = (setUp: {
    isUserDBFetchSetup: "found" | "notFound" | "fail";
    isUserDBPostSetup: "ok" | "fail";
}): void => {
    const userDdbFetchMock = ddbMock.on(GetCommand, {
        TableName: usersTableName,
        Key: {
            userId: "@a",
        },
    });
    const userDdbPostMock = ddbMock.on(PutCommand, {
        TableName: usersTableName,
        Item: {
            userId: "@a",
        },
    });

    if (setUp.isUserDBFetchSetup === "found") {
        userDdbFetchMock.resolves({
            Item: {
                userId: "@a",
                userName: "test-user",
            },
        });
    } else if (setUp.isUserDBFetchSetup === "notFound") {
        userDdbFetchMock.resolves({ Item: null });
    } else if (setUp.isUserDBFetchSetup === "fail") {
        userDdbFetchMock.rejects(new Error());
    }

    if (setUp.isUserDBPostSetup === "ok") {
        userDdbPostMock.resolves({});
    } else if (setUp.isUserDBPostSetup === "fail") {
        userDdbPostMock.rejects(new Error());
    }
};

beforeEach(() => {
    ddbMock.reset();
    invokeTokenValidatorMock = jest.fn(() => "valid");
});

describe("正常系", () => {
    beforeEach(() => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });
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
        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName }),
            }),
        );

        expect(response.statusCode).toBe(200);
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とUSE-21を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-21",
            }),
        );
    });

    test("リクエストのuserIdが空の時、ステータスコード400とUSE-21を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
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
                error: "USE-21",
            }),
        );
    });

    test("リクエストのuserIdがundefinedの時、ステータスコード400とUSE-21を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
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
                error: "USE-21",
            }),
        );
    });

    test("リクエストボディが無い時、ステータスコード400とUSE-21を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-21",
            }),
        );
    });

    test.each(["@wl_nozomi", "@wl_nico"])(
        "ブラックリストに登録されているユーザーの時、ステータスコード400とUSE-22を返す",
        async (userId) => {
            testSetUp({
                isUserDBFetchSetup: "found",
                isUserDBPostSetup: "ok",
            });

            const response = await postUserName(
                getHandlerRequest({
                    pathParameters: { userId },
                    body: JSON.stringify({
                        userName: "test-user",
                    }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "USE-22",
                }),
            );
        },
    );

    test("トークンの検証に失敗した時、AUN-99と401エラーを返す", async () => {
        invokeTokenValidatorMock = jest.fn(() => "invalid");

        const response = await postUserName(
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

    test("存在しないuserIdでアクセスしたとき、USE-23と404エラーを返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "notFound",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-23",
            }),
        );
    });

    test("userId検証時にDBと接続できなかった時、USE-24と500エラーを返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "fail",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-24",
            }),
        );
    });

    test("リクエストボディのJSON変換に失敗した時、ステータスコード400とUSE-25を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: "invalid-json",
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-25",
            }),
        );
    });

    test("userNameが空の時、ステータスコード400とUSE-26を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({ userName: "" }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-26",
            }),
        );
    });

    test("userNameが24文字を超える時、ステータスコード400とUSE-26を返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "ok",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    userName: "a".repeat(25),
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-26",
            }),
        );
    });

    test.each(["ユーザーネーム", "ゆーざーねーむ", "🐍", "@/", " name "])(
        "userNameに使用できない文字が含まれている時、ステータスコード400とUSE-26を返す",
        async (userName) => {
            testSetUp({
                isUserDBFetchSetup: "found",
                isUserDBPostSetup: "ok",
            });

            const response = await postUserName(
                getHandlerRequest({
                    pathParameters: { userId: "@a" },
                    body: JSON.stringify({ userName }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "USE-26",
                }),
            );
        },
    );

    test("UserTableとの接続に失敗したとき、USE-27と500エラーを返す", async () => {
        testSetUp({
            isUserDBFetchSetup: "found",
            isUserDBPostSetup: "fail",
        });

        const response = await postUserName(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
                body: JSON.stringify({
                    userName: "test-user",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-27" }));
    });
});
