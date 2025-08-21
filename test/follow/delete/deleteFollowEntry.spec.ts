import { deleteFollowEntry } from "@/app/follow/delete/deleteFollowEntry";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

jest.mock("@/config", () => {
    const actual = jest.requireActual("@/config");
    return {
        ...actual,
        envConfig: {
            USERS_TABLE: "users-table-offline",
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
    invokeLambdaMock = jest.fn(() => {
        return {
            totalNumberOfFollowing: 1,
            followingUserIds: ["@z"],
            totalNumberOfFollowees: 4,
            followeeUserIds: ["@a", "@b", "@c", "@z"],
        };
    });
});

// NOTE: @a が、@y をフォローするシチュエーションとする
describe("正常系", () => {
    test("フォローしているユーザーと、フォローされているユーザーを取得する", async () => {
        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                totalNumberOfFollowing: 1,
                followingUserIds: ["@z"],
                totalNumberOfFollowees: 4,
                followeeUserIds: ["@a", "@b", "@c", "@z"],
            }),
        );
    });

    test("フォローしているユーザーが0人の時、totalNumberOfFollowingが0となる", async () => {
        invokeLambdaMock = jest.fn(() => {
            return {
                totalNumberOfFollowing: 0,
                followingUserIds: [],
                totalNumberOfFollowees: 1,
                followeeUserIds: ["@a"],
            };
        });

        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                totalNumberOfFollowing: 0,
                followingUserIds: [],
                totalNumberOfFollowees: 1,
                followeeUserIds: ["@a"],
            }),
        );
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とFOL-31を返す", async () => {
        const response = await deleteFollowEntry(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-31",
            }),
        );
    });

    test("リクエストボディのfollowerIdが空の時、ステータスコード400とFOL-31を返す", async () => {
        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: { userId: "@y" },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-31",
            }),
        );
    });

    test("リクエストのuserIdが無い時、ステータスコード400とFOL-31を返す", async () => {
        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-31",
            }),
        );
    });

    test("トークンの検証に失敗した時、AUN-99と401エラーを返す", async () => {
        invokeTokenValidatorMock = jest.fn(() => "invalid");

        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
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

    test("リクエストのuserIdが空文字の時、ステータスコード400とFOL-32を返す", async () => {
        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-32",
            }),
        );
    });

    test("リクエストボディのfollowerIdが空文字の時、ステータスコード400とFOL-32を返す", async () => {
        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-32",
            }),
        );
    });

    test("フォローするユーザーとフォロー解除対象のユーザーが同じ時、ステータスコード400とFOL-32を返す", async () => {
        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@y",
                }),
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-32",
            }),
        );
    });

    test("Lambdaでエラーが発生した時、ステータスコード500とFOL-33を返す", async () => {
        invokeLambdaMock = jest.fn(() => "lambdaInvokeError");

        const response = await deleteFollowEntry(
            getHandlerRequest({
                pathParameters: { userId: "@y" },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "FOL-33" }));
    });
});
