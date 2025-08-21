import { deleteFollowCore } from "@/app/follow/delete/deleteFollowCore";

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

let invokeTokenValidatorMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidator: () => invokeTokenValidatorMock(),
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

// NOTE: @a が、@y をフォローするシチュエーションとする
describe("正常系", () => {
    test("フォローしているユーザーと、フォローされているユーザーを取得する", async () => {
        const response = await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(response).toEqual({
            totalNumberOfFollowing: 1,
            followingUserIds: ["@z"],
            totalNumberOfFollowees: 4,
            followeeUserIds: ["@a", "@b", "@c", "@z"],
        });
    });

    test("@aが@yをフォロー解除するQueryが実行される", async () => {
        await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(deleteFollowQueryMock).toHaveBeenCalledWith(
            "DELETE FROM wordlessdb.follow_table WHERE follower_id = ? AND followee_id = ?",
            ["@a", "@y"],
        );
    });

    test("フォローしているユーザーを取得するQueryが実行される", async () => {
        await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(selectFollowQueryMock).toHaveBeenCalledWith(
            "SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?",
            ["@y"],
        );
    });

    test("フォローされているユーザーを取得するQueryが実行される", async () => {
        await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

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

        const response = await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(response).toEqual({
            followeeUserIds: ["@a"],
            followingUserIds: [],
            totalNumberOfFollowees: 1,
            totalNumberOfFollowing: 0,
        });
    });
});

describe("異常系", () => {
    test("フォロー関係を削除する際、FollowTableと接続できないとき、lambdaErrorを返す", async () => {
        deleteFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(response).toEqual("lambdaError");
    });

    test("フォローしているユーザーを取得する際、FollowTableと接続できないとき、lambdaErrorを返す", async () => {
        selectFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(response).toEqual("lambdaError");
    });

    test("フォローされているユーザーを取得する際、FollowTableと接続できないとき、lambdaErrorを返す", async () => {
        selectFolloweeQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteFollowCore({
            followerId: "@a",
            followeeId: "@y",
        });

        expect(response).toEqual("lambdaError");
    });
});
