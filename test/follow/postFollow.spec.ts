import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { mockClient } from "aws-sdk-client-mock";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { postFollow } from "@/app/follow/postFollow";

const ddbMock = mockClient(DynamoDBDocumentClient);

let insertFollowQueryMock: jest.Mock<any, any, any>;
let selectFollowQueryMock: jest.Mock<any, any, any>;
let selectFolloweeQueryMock: jest.Mock<any, any, any>;

const usersTableName = "users-table-offline";

const followersSelectedFromTable = [{ followee_id: "@z" }];
const followeesSelectedFromTable = [
    { follower_id: "@a" },
    { follower_id: "@b" },
    { follower_id: "@c" },
    { follower_id: "@z" },
];

jest.mock("@/config", () => ({
    envConfig: {
        USERS_TABLE: "users-table-offline",
    },
    dbConfig: {
        DB_HOST: "",
        DB_USER: "",
        DB_PASSWORD: "",
        DB_NAME: "",
    },
}));

let invokeTokenValidatorMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidator: () => invokeTokenValidatorMock(),
        getRDSDBClient: jest.fn(() => ({
            query: (sql: string, params: any[]) => {
                if (sql.includes("INSERT INTO wordlessdb.follow_table")) {
                    return insertFollowQueryMock(sql, params);
                } else if (
                    sql.includes(
                        "SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id",
                    )
                ) {
                    return selectFollowQueryMock(sql, params);
                } else if (
                    sql.includes(
                        "SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id",
                    )
                ) {
                    return selectFolloweeQueryMock(sql, params);
                }
            },
            end: () => {},
        })),
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
    insertFollowQueryMock = jest.fn().mockResolvedValue([]);
    selectFollowQueryMock = jest
        .fn()
        .mockResolvedValue(followersSelectedFromTable);
    selectFolloweeQueryMock = jest
        .fn()
        .mockResolvedValue(followeesSelectedFromTable);
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
        const response = await postFollow(
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
                totalNumberOfFollowing: followersSelectedFromTable.length,
                followingUserIds: ["@z"],
                totalNumberOfFollowees: followeesSelectedFromTable.length,
                followeeUserIds: ["@a", "@b", "@c", "@z"],
            }),
        );
    });

    test("@aが@yをフォローするQueryが実行される", async () => {
        await postFollow(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(insertFollowQueryMock).toHaveBeenCalledWith(
            "INSERT INTO wordlessdb.follow_table (follower_id, followee_id) VALUES (?, ?)",
            ["@a", "@y"],
        );
    });

    test("フォローしているユーザーを取得するQueryが実行される", async () => {
        await postFollow(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(selectFollowQueryMock).toHaveBeenCalledWith(
            "SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?",
            ["@y"],
        );
    });

    test("フォローされているユーザーを取得するQueryが実行される", async () => {
        await postFollow(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(selectFolloweeQueryMock).toHaveBeenCalledWith(
            "SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id = ?",
            ["@y"],
        );
    });

    test("フォローしているユーザーが0人の時、totalNumberOfFollowingが0となる", async () => {
        selectFollowQueryMock = jest.fn().mockResolvedValue([]);
        selectFolloweeQueryMock = jest
            .fn()
            .mockResolvedValue([{ follower_id: "@a" }]);

        const response = await postFollow(
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

        const response = await postFollow(getHandlerRequest({}));

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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

        const response = await postFollow(
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

    test("フォロー関係を登録する際、FollowTableと接続できないとき、ステータスコード500とFOL-15を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });
        insertFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await postFollow(
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
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-15",
            }),
        );
    });

    test("フォローしているユーザーを取得する際、FollowTableと接続できないとき、ステータスコード500とFOL-15を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });
        selectFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await postFollow(
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
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-15",
            }),
        );
    });

    test("フォローされているユーザーを取得する際、FollowTableと接続できないとき、ステータスコード500とFOL-15を返す", async () => {
        testSetUp({
            isUserDBSetupForA: "ok",
            isUserDBSetupForY: "ok",
        });
        selectFolloweeQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await postFollow(
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
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-15",
            }),
        );
    });
});
