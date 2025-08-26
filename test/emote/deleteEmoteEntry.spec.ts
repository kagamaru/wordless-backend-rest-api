import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { deleteEmoteEntry } from "@/app/emote/deleteEmoteEntry";

jest.mock("@/config", () => {
    const actual = jest.requireActual("@/config");
    return {
        ...actual,
        envConfig: {
            DELETE_EMOTE_LAMBDA_NAME:
                "wordless-backend-rest-api-dev-deleteEmoteCore",
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

beforeEach(() => {
    invokeTokenValidatorMock = jest.fn(() => "valid");
    invokeLambdaMock = jest.fn(() => "success");
});

describe("正常系", () => {
    test("200を返す", async () => {
        const response = await deleteEmoteEntry(
            getHandlerRequest({
                pathParameters: {
                    emoteId: "emoteId-a",
                },
                body: JSON.stringify({
                    userId: "userId-a",
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とEMT-11を返す", async () => {
        const response = await deleteEmoteEntry(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-11",
            }),
        );
    });

    test("pathParametersが存在しない時、ステータスコード400とEMT-11を返す", async () => {
        const response = await deleteEmoteEntry(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-11",
            }),
        );
    });

    test.each(["", undefined])(
        "パラメータのemoteIdが%sの時、ステータスコード400とEMT-12を返す",
        async (emoteId) => {
            const response = await deleteEmoteEntry(
                getHandlerRequest({
                    pathParameters: { emoteId },
                    body: JSON.stringify({
                        userId: "userId-a",
                    }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "EMT-12",
                }),
            );
        },
    );

    test("リクエストボディのuserIdがフィールドとして存在しない時、ステータスコード400とEMT-13を返す", async () => {
        const response = await deleteEmoteEntry(
            getHandlerRequest({
                pathParameters: { emoteId: "emoteId-a" },
                body: JSON.stringify({}),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-14",
            }),
        );
    });

    test("リクエストボディがJSON形式でない時、ステータスコード400とEMT-13を返す", async () => {
        const response = await deleteEmoteEntry(
            getHandlerRequest({
                pathParameters: { emoteId: "emoteId-a" },
                body: "invalid",
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-13",
            }),
        );
    });

    // NOTE: 空文字、undefined、数値はユーザーIDとして不正
    test.each(["", undefined, 1234567890])(
        "リクエストボディのuserIdが%sの時、ステータスコード400とEMT-14を返す",
        async (userId) => {
            const response = await deleteEmoteEntry(
                getHandlerRequest({
                    pathParameters: { emoteId: "emoteId-a" },
                    body: JSON.stringify({
                        userId,
                    }),
                }),
            );

            expect(response.statusCode).toBe(400);
            expect(response.body).toEqual(
                JSON.stringify({
                    error: "EMT-14",
                }),
            );
        },
    );

    test("トークンが無効な時、ステータスコード401とAUN-99を返す", async () => {
        invokeTokenValidatorMock = jest.fn(() => "invalid");
        const response = await deleteEmoteEntry(
            getHandlerRequest({
                pathParameters: { emoteId: "emoteId-a" },
                body: JSON.stringify({
                    userId: "userId-a",
                }),
            }),
        );

        expect(response.statusCode).toBe(401);
        expect(response.body).toEqual(JSON.stringify({ error: "AUN-99" }));
    });

    test("lambdaがエラーを返した時、ステータスコード500とEMT-15を返す", async () => {
        invokeLambdaMock = jest.fn(() => "lambdaInvokeError");
        const response = await deleteEmoteEntry(
            getHandlerRequest({
                pathParameters: { emoteId: "emoteId-a" },
                body: JSON.stringify({
                    userId: "userId-a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "EMT-15" }));
    });

    test("lambdaが不明なエラーを返した時、ステータスコード500とEMT-16を返す", async () => {
        invokeLambdaMock = jest.fn(() => {
            throw new Error();
        });
        const response = await deleteEmoteEntry(
            getHandlerRequest({
                pathParameters: { emoteId: "emoteId-a" },
                body: JSON.stringify({
                    userId: "userId-a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "EMT-16" }));
    });
});
