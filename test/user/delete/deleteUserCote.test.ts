import { deleteUserCore } from "@/app/user/delete/deleteUserCore";

let deleteUserQueryMock: jest.Mock<any, any, any>;
let deleteFollowQueryMock: jest.Mock<any, any, any>;

let invokeTokenValidatorMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidator: () => invokeTokenValidatorMock(),
        getRDSDBClient: jest.fn(() => ({
            query: (sql: string, params: any[]) => {
                if (
                    sql.includes(
                        "UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE user_id = ?",
                    )
                ) {
                    return deleteUserQueryMock(sql, params);
                } else if (
                    sql.includes(
                        "DELETE FROM wordlessdb.follow_table WHERE follower_id = ? OR followee_id = ?",
                    )
                ) {
                    return deleteFollowQueryMock(sql, params);
                }
            },
            end: () => {},
        })),
    };
});

beforeEach(() => {
    deleteUserQueryMock = jest.fn().mockResolvedValue([]);
    deleteFollowQueryMock = jest.fn().mockResolvedValue([]);
});

describe("正常系", () => {
    test("successを返す", async () => {
        const response = await deleteUserCore({
            userId: "@a",
        });

        expect(response).toEqual("success");
    });

    test("ユーザーを削除するQueryが実行される", async () => {
        await deleteUserCore({
            userId: "@a",
        });

        expect(deleteUserQueryMock).toHaveBeenCalledWith(
            "UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE user_id = ?",
            ["@a"],
        );
    });

    test("フォロー関係を削除するQueryが実行される", async () => {
        await deleteUserCore({
            userId: "@a",
        });

        expect(deleteFollowQueryMock).toHaveBeenCalledWith(
            "DELETE FROM wordlessdb.follow_table WHERE follower_id = ? OR followee_id = ?",
            ["@a", "@a"],
        );
    });
});

describe("異常系", () => {
    test("フォロー関係を削除する際、FollowTableと接続できないとき、lambdaErrorを返す", async () => {
        deleteUserQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteUserCore({
            userId: "@a",
        });

        expect(response).toEqual("lambdaError");
    });

    test("フォロー関係を削除する際、FollowTableと接続できないとき、lambdaErrorを返す", async () => {
        deleteFollowQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteUserCore({
            userId: "@a",
        });

        expect(response).toEqual("lambdaError");
    });
});
