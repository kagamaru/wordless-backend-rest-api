import { mockClient } from "aws-sdk-client-mock";
import {
    DynamoDBDocumentClient,
    GetCommand,
    PutCommand,
} from "@aws-sdk/lib-dynamodb";
import { postUserSuki } from "@/app/userSuki/postUserSuki";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);
const userTableName = "user-table-offline";
const userSukiTableName = "user-suki-table-offline";

const item = {
    Item: {
        userId: "@fuga_fuga",
        userSuki: ["snake", "dog", ":arrived:", ":neko_meme_screaming_cat:"],
    },
};

jest.mock("@/config", () => ({
    // HACK: 変数へのアクセスが不可のため、ハードコーディングする
    envConfig: {
        USER_SUKI_TABLE: "user-suki-table-offline",
        USER_TABLE: "user-table-offline",
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

const testSetUp = (setUpDB: {
    isUsersDBGetSetup: "ok" | "notfound" | "fail";
    isUserSukiDBPostSetup: "ok" | "fail";
    isUserSukiDBGetSetup: "ok" | "returnEmptyArray" | "fail" | "notfound";
}): void => {
    const usersDdbGetMock = ddbMock.on(GetCommand, {
        TableName: userTableName,
        Key: {
            userId: "@fuga_fuga",
        },
    });
    const userSukiDdbPostMock = ddbMock.on(PutCommand, {
        TableName: userSukiTableName,
        Item: {
            userId: "@fuga_fuga",
            userSuki: [":rat:", ":cow:", ":tiger:", ":rabbit:"],
        },
    });
    const userSukiDdbGetMock = ddbMock.on(GetCommand, {
        TableName: userSukiTableName,
        Key: {
            userId: "@fuga_fuga",
        },
    });

    if (setUpDB.isUsersDBGetSetup === "ok") {
        usersDdbGetMock.resolves({
            Item: {
                userId: "@fuga_fuga",
                userName: "Fuga Fuga",
                userAvatarUrl: "https://image.test/b.png",
            },
        });
    } else if (setUpDB.isUsersDBGetSetup === "notfound") {
        usersDdbGetMock.resolves({ Item: null });
    } else {
        usersDdbGetMock.rejects(new Error());
    }

    if (setUpDB.isUserSukiDBPostSetup === "ok") {
        userSukiDdbPostMock.resolves({});
    } else {
        userSukiDdbPostMock.rejects(new Error());
    }

    if (setUpDB.isUserSukiDBGetSetup === "ok") {
        userSukiDdbGetMock.resolves(item);
    } else if (setUpDB.isUserSukiDBGetSetup === "returnEmptyArray") {
        userSukiDdbGetMock.resolves({
            Item: { userId: "@fuga_fuga", userSuki: [] },
        });
    } else if (setUpDB.isUserSukiDBGetSetup === "notfound") {
        userSukiDdbGetMock.resolves({ Item: null });
    } else {
        userSukiDdbGetMock.rejects(new Error());
    }
};

beforeEach(() => {
    ddbMock.reset();
    invokeTokenValidatorMock = jest.fn(() => "valid");
});

describe("正常系", () => {
    test("userSukiを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":snake:",
                    userSukiEmoji2: ":dog:",
                    userSukiEmoji3: ":arrived:",
                    userSukiEmoji4: ":neko_meme_screaming_cat:",
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                userSuki: [
                    "snake",
                    "dog",
                    ":arrived:",
                    ":neko_meme_screaming_cat:",
                ],
            }),
        );
    });

    test("登録するuserSukiが空であっても、エラーとしない", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "returnEmptyArray",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: undefined,
                    userSukiEmoji2: undefined,
                    userSukiEmoji3: undefined,
                    userSukiEmoji4: undefined,
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(JSON.stringify({ userSuki: [] }));
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが無い時、USK-11と400エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-11",
            }),
        );
    });

    test("リクエストのuserIdが空の時、USK-11と400エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-11",
            }),
        );
    });

    test("リクエストのbodyがJSON形式でない時、USK-11と400エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: "invalid-json",
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-11",
            }),
        );
    });

    test.each([
        {
            userSukiEmoji1: ":mock-invalid-emoji-id:",
        },
        {
            userSukiEmoji1: ":rat:",
            userSukiEmoji2: ":mock-invalid-emoji-id:",
        },
        {
            userSukiEmoji1: ":rat:",
            userSukiEmoji2: ":cow:",
            userSukiEmoji3: ":mock-invalid-emoji-id:",
        },
        {
            userSukiEmoji1: ":rat:",
            userSukiEmoji2: ":cow:",
            userSukiEmoji3: ":tiger:",
            userSukiEmoji4: ":mock-invalid-emoji-id:",
        },
    ])(
        "不正な絵文字IDが指定された時、ステータスコード400とUSK-11を返す",
        async (event) => {
            testSetUp({
                isUsersDBGetSetup: "ok",
                isUserSukiDBPostSetup: "ok",
                isUserSukiDBGetSetup: "ok",
            });

            const response = await postUserSuki(
                getHandlerRequest({
                    pathParameters: { userId: "@fuga_fuga" },
                    body: JSON.stringify(event),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "USK-11",
                }),
            );
        },
    );

    test.each([
        {
            userSukiEmoji1: undefined,
            userSukiEmoji2: ":cow:",
            userSukiEmoji3: ":tiger:",
            userSukiEmoji4: ":rabbit:",
        },
        {
            userSukiEmoji1: ":rat:",
            userSukiEmoji2: undefined,
            userSukiEmoji3: ":tiger:",
            userSukiEmoji4: ":rabbit:",
        },
        {
            userSukiEmoji1: ":rat:",
            userSukiEmoji2: ":cow:",
            userSukiEmoji3: undefined,
            userSukiEmoji4: ":rabbit:",
        },
    ])(
        "空の絵文字入力（投稿終了）の後、絵文字が指定された時、ステータスコード400とUSK-11を返す",
        async (event) => {
            testSetUp({
                isUsersDBGetSetup: "ok",
                isUserSukiDBPostSetup: "ok",
                isUserSukiDBGetSetup: "ok",
            });

            const response = await postUserSuki(
                getHandlerRequest({
                    pathParameters: { userId: "@fuga_fuga" },
                    body: JSON.stringify(event),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "USK-11",
                }),
            );
        },
    );

    test("トークンの検証に失敗した時、AUN-99と401エラーを返す", async () => {
        invokeTokenValidatorMock = jest.fn(() => "invalid");
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":rat:",
                    userSukiEmoji2: ":cow:",
                    userSukiEmoji3: ":tiger:",
                    userSukiEmoji4: ":rabbit:",
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

    test("指定されたuserIdに該当するユーザーが存在しない時、USK-12と404エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "notfound",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":rat:",
                    userSukiEmoji2: ":cow:",
                    userSukiEmoji3: ":tiger:",
                    userSukiEmoji4: ":rabbit:",
                }),
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-12",
            }),
        );
    });

    test("userIdの実在性を検証する時、ユーザーテーブルと接続できなかった場合、USK-13と500エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "fail",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":rat:",
                    userSukiEmoji2: ":cow:",
                    userSukiEmoji3: ":tiger:",
                    userSukiEmoji4: ":rabbit:",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-13",
            }),
        );
    });

    test("ユーザーの好きな絵文字を登録する時、ユーザーの好きな絵文字テーブルと接続できなかった場合、USK-14と500エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "fail",
            isUserSukiDBGetSetup: "ok",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":rat:",
                    userSukiEmoji2: ":cow:",
                    userSukiEmoji3: ":tiger:",
                    userSukiEmoji4: ":rabbit:",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-14",
            }),
        );
    });

    test("ユーザーの好きな絵文字を取得する時、指定されたユーザーIDのユーザーが存在しなかった時、USK-15と404エラーを返す（ほぼありえない）", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "notfound",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":rat:",
                    userSukiEmoji2: ":cow:",
                    userSukiEmoji3: ":tiger:",
                    userSukiEmoji4: ":rabbit:",
                }),
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-15",
            }),
        );
    });

    test("ユーザーの好きな絵文字を取得する時、ユーザースキテーブルと接続できなかった場合、USK-16と500エラーを返す", async () => {
        testSetUp({
            isUsersDBGetSetup: "ok",
            isUserSukiDBPostSetup: "ok",
            isUserSukiDBGetSetup: "fail",
        });

        const response = await postUserSuki(
            getHandlerRequest({
                pathParameters: { userId: "@fuga_fuga" },
                body: JSON.stringify({
                    userSukiEmoji1: ":rat:",
                    userSukiEmoji2: ":cow:",
                    userSukiEmoji3: ":tiger:",
                    userSukiEmoji4: ":rabbit:",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "USK-16",
            }),
        );
    });
});
