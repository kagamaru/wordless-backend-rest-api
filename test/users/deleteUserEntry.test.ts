import { ConditionalCheckFailedException } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { deleteUserEntry } from "@/app/users/deleteUserEntry";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);
const usersTableName = "users-table-offline";
const userSukiTableName = "user-suki-table-offline";

jest.mock("@/config", () => {
    const actual = jest.requireActual("@/config");
    return {
        ...actual,
        envConfig: {
            USERS_TABLE: "users-table-offline",
            USER_SUKI_TABLE: "user-suki-table-offline",
            DELETE_USER_LAMBDA_NAME: "delete-user-lambda-offline",
        },
    };
});

let invokeTokenValidatorMock = jest.fn();
let invokeLambdaMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidator: () => invokeTokenValidatorMock(),
        invokeLambda: () => invokeLambdaMock(),
    };
});

const testSetUp = (setUp: {
    isUserDBSetup: "ok" | "fail" | "notfound";
    isUserSukiDBSetup: "ok" | "fail" | "notfound";
}): void => {
    const userDdbMock = ddbMock.on(PutCommand, {
        TableName: usersTableName,
    });
    const userSukiDdbMock = ddbMock.on(PutCommand, {
        TableName: userSukiTableName,
    });

    if (setUp.isUserDBSetup === "ok") {
        userDdbMock.resolves({});
    } else if (setUp.isUserDBSetup === "fail") {
        userDdbMock.rejects(new Error());
    } else if (setUp.isUserDBSetup === "notfound") {
        userDdbMock.rejects(
            new ConditionalCheckFailedException({
                $metadata: {},
                message: "Not found userId",
            }),
        );
    }

    if (setUp.isUserSukiDBSetup === "ok") {
        userSukiDdbMock.resolves({});
    } else if (setUp.isUserSukiDBSetup === "fail") {
        userSukiDdbMock.rejects(new Error());
    } else if (setUp.isUserSukiDBSetup === "notfound") {
        userSukiDdbMock.rejects(
            new ConditionalCheckFailedException({
                $metadata: {},
                message: "Not found userId",
            }),
        );
    }
};

beforeEach(() => {
    invokeTokenValidatorMock = jest.fn(() => "valid");
    invokeLambdaMock = jest.fn(() => {});
    ddbMock.reset();
    testSetUp({
        isUserDBSetup: "ok",
        isUserSukiDBSetup: "ok",
    });
});

describe("正常系", () => {
    test("200を返す", async () => {
        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@a",
                },
            }),
        );

        expect(response.statusCode).toBe(200);
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とUSE-41を返す", async () => {
        const response = await deleteUserEntry(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-41",
            }),
        );
    });

    test("リクエストのuserIdが無い時、ステータスコード400とUSE-41を返す", async () => {
        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-41",
            }),
        );
    });

    test("リクエストのuserIdが空文字の時、ステータスコード400とUSE-41を返す", async () => {
        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "",
                },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USE-41",
            }),
        );
    });

    test("トークンの検証に失敗した時、AUN-99と401エラーを返す", async () => {
        invokeTokenValidatorMock = jest.fn(() => "invalid");

        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "AUN-99",
            }),
        );
    });

    test("Lambdaでエラーが発生した時、ステータスコード500とUSE-42を返す", async () => {
        invokeLambdaMock = jest.fn(() => "lambdaInvokeError");

        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: { userId: "@y" },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-42" }));
    });

    test("userTableの中に指定したIDが存在しない時、ステータスコード404とUSE-43を返す", async () => {
        testSetUp({
            isUserDBSetup: "notfound",
            isUserSukiDBSetup: "ok",
        });

        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-43" }));
    });

    test("userTableとの接続に失敗した時、ステータスコード500とUSE-44を返す", async () => {
        testSetUp({
            isUserDBSetup: "fail",
            isUserSukiDBSetup: "ok",
        });

        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-44" }));
    });

    test("userSukiTableの中に指定したIDが存在しない時、ステータスコード404とUSE-45を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
            isUserSukiDBSetup: "notfound",
        });

        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-45" }));
    });

    test("userSukiTableとの接続に失敗した時、ステータスコード500とUSE-46を返す", async () => {
        testSetUp({
            isUserDBSetup: "ok",
            isUserSukiDBSetup: "fail",
        });

        const response = await deleteUserEntry(
            getHandlerRequest({
                pathParameters: { userId: "@a" },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "USE-46" }));
    });
});
