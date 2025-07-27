import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { deleteFollow } from "@/app/follow/deleteFollow";

let deleteFollowQueryMock: jest.Mock<any, any, any>;
let selectFollowQueryMock: jest.Mock<any, any, any>;
let selectFolloweeQueryMock: jest.Mock<any, any, any>;

const followersSelectedFromTable = [{ followee_id: "@z" }];
const followeesSelectedFromTable = [
    { follower_id: "@a" },
    { follower_id: "@b" },
    { follower_id: "@c" },
    { follower_id: "@z" },
];

jest.mock("@/config", () => ({
    envConfig: {
        ...jest.requireActual("@/config").envConfig,
    },
    dbConfig: {
        DB_HOST: "",
        DB_USER: "",
        DB_PASSWORD: "",
        DB_NAME: "",
    },
}));
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        getRDSDBClient: jest.fn(() => ({
            query: (sql: string, params: any[]) => {
                if (sql.includes("DELETE FROM wordlessdb.follow_table")) {
                    return deleteFollowQueryMock(sql, params);
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

beforeEach(() => {
    deleteFollowQueryMock = jest.fn().mockResolvedValue([]);
    selectFollowQueryMock = jest
        .fn()
        .mockResolvedValue(followersSelectedFromTable);
    selectFolloweeQueryMock = jest
        .fn()
        .mockResolvedValue(followeesSelectedFromTable);
});

// NOTE: @a が、@y をフォロー解除するシチュエーションとする
describe("正常系", () => {
    beforeEach(() => {});

    test("フォローしているユーザーと、フォローされているユーザーを取得する", async () => {
        const response = await deleteFollow(
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

    test("@aが@yをフォロー解除するQueryが実行される", async () => {
        await deleteFollow(
            getHandlerRequest({
                pathParameters: {
                    userId: "@y",
                },
                body: JSON.stringify({
                    followerId: "@a",
                }),
            }),
        );

        expect(deleteFollowQueryMock).toHaveBeenCalledWith(
            "DELETE FROM wordlessdb.follow_table WHERE follower_id = ? AND followee_id = ?",
            ["@a", "@y"],
        );
    });

    test("フォローしているユーザーを取得するQueryが実行される", async () => {
        await deleteFollow(
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
        await deleteFollow(
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

    test("フォローされているユーザーが0人の時、totalNumberOfFollowingが0となる", async () => {
        selectFolloweeQueryMock = jest.fn().mockResolvedValue([]);
        selectFollowQueryMock = jest
            .fn()
            .mockResolvedValue([{ followee_id: "@a" }]);

        const response = await deleteFollow(
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
                followingUserIds: ["@a"],
                totalNumberOfFollowees: 0,
                followeeUserIds: [],
            }),
        );
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とFOL-31を返す", async () => {
        const response = await deleteFollow(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-31",
            }),
        );
    });

    test("リクエストボディのfollowerIdが空の時、ステータスコード400とFOL-31を返す", async () => {
        const response = await deleteFollow(
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
        const response = await deleteFollow(
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

    test("リクエストのuserIdが空文字の時、ステータスコード400とFOL-32を返す", async () => {
        const response = await deleteFollow(
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
        const response = await deleteFollow(
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

    test("フォローするユーザーとフォローされるユーザーが同じ時、ステータスコード400とFOL-32を返す", async () => {
        const response = await deleteFollow(
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

    test("フォロー関係を解除する際、FollowTableと接続できないとき、ステータスコード500とFOL-33を返す", async () => {
        deleteFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteFollow(
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
                error: "FOL-33",
            }),
        );
    });

    test("フォローしているユーザーを取得する際、FollowTableと接続できないとき、ステータスコード500とFOL-33を返す", async () => {
        selectFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteFollow(
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
                error: "FOL-33",
            }),
        );
    });

    test("フォローされているユーザーを取得する際、FollowTableと接続できないとき、ステータスコード500とFOL-33を返す", async () => {
        selectFolloweeQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteFollow(
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
                error: "FOL-33",
            }),
        );
    });
});
