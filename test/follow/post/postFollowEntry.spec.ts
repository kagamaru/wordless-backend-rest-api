import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { postFollowEntry } from "@/app/follow/post/postFollowEntry";

const ddbMock = mockClient(DynamoDBDocumentClient);

const usersTableName = "users-table-offline";

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

const usersTableItemForA = {
    Item: {
        userId: "@a",
        userAvatarUrl: "https://image.test/a.png",
        userName: "A",
    },
};

const usersTableItemForY = {
    Item: {
        userId: "@y",
        userAvatarUrl: "https://image.test/y.png",
        userName: "Y",
    },
};

const testSetUp = (setUpDB: {
    isUserDBSetupForA: "ok" | "fail" | "notfound";
    isUserDBSetupForY: "ok" | "fail" | "notfound";
}): void => {
    const [userDdbMockA, userDdbMockY] = ["@a", "@y"].map((userId) => {
        return ddbMock.on(GetCommand, {
            TableName: usersTableName,
            Key: {
                userId: userId,
            },
        });
    });

    if (setUpDB.isUserDBSetupForA === "ok") {
        userDdbMockA.resolves(usersTableItemForA);
    } else if (setUpDB.isUserDBSetupForA === "fail") {
        userDdbMockA.rejects(new Error());
    } else if (setUpDB.isUserDBSetupForA === "notfound") {
        userDdbMockA.resolves({ Item: null });
    }

    if (setUpDB.isUserDBSetupForY === "ok") {
        userDdbMockY.resolves(usersTableItemForY);
    } else if (setUpDB.isUserDBSetupForY === "fail") {
        userDdbMockY.rejects(new Error());
    } else if (setUpDB.isUserDBSetupForY === "notfound") {
        userDdbMockY.resolves({ Item: null });
    }
};

beforeEach(() => {
    ddbMock.reset();
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
    beforeEach(() => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });
    });

    test("フォローしているユーザーと、フォローされているユーザーを取得する", async () => {
        const response = await postFollowEntry(
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

        const response = await postFollowEntry(
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
    test("リクエストのpathParametersが空の時、ステータスコード400とFOL-11を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-11",
            }),
        );
    });

    test("リクエストボディのfollowerIdが空の時、ステータスコード400とFOL-11を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: { userId: "@y" },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-11",
            }),
        );
    });

    test("リクエストのuserIdが無い時、ステータスコード400とFOL-11を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-11",
            }),
        );
    });

    test("トークンの検証に失敗した時、AUN-99と401エラーを返す", async () => {
        invokeTokenValidatorMock = jest.fn(() => "invalid");

        const response = await postFollowEntry(
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

    test("リクエストのuserIdが空文字の時、ステータスコード400とFOL-12を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
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
                error: "FOL-12",
            }),
        );
    });

    test("リクエストボディのfollowerIdが空文字の時、ステータスコード400とFOL-12を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
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
                error: "FOL-12",
            }),
        );
    });

    test("フォローするユーザーとフォローされるユーザーが同じ時、ステータスコード400とFOL-12を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
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
                error: "FOL-12",
            }),
        );
    });

    test("フォローするユーザーが存在しないユーザーだった時、ステータスコード404とFOL-13を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "notfound",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(JSON.stringify({ error: "FOL-13" }));
    });

    test("フォローするユーザーの実在性を検証する時、UserTableと接続できない場合、ステータスコード500とFOL-14を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "fail",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "FOL-14" }));
    });

    test("フォローされるユーザーが存在しないユーザーだった時、ステータスコード404とFOL-13を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "notfound",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual(JSON.stringify({ error: "FOL-13" }));
    });

    test("フォローされるユーザーの実在性を検証する時、UserTableと接続できない場合、ステータスコード500とFOL-14を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "fail",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "FOL-14" }));
    });

    test("Lambdaでエラーが発生した時、ステータスコード500とFOL-15を返す", async () => {
        invokeLambdaMock = jest.fn(() => "lambdaInvokeError");
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });

        const response = await postFollowEntry(
            getHandlerRequest({
                pathParameters: { userId: "@y" },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(JSON.stringify({ error: "FOL-15" }));
    });
});
