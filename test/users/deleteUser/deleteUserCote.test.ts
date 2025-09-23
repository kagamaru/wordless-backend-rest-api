import { deleteUserCore } from "@/app/users/deleteUser/deleteUserCore";

let deleteUserQueryMock: jest.Mock<any, any, any>;

let invokeTokenValidatorMock = jest.fn();
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        invokeTokenValidator: () => invokeTokenValidatorMock(),
        getRDSDBClient: jest.fn(() => ({
            query: (sql: string, params: any[]) => {
                return deleteUserQueryMock(sql, params);
            },
            end: () => {},
        })),
    };
});

beforeEach(() => {
    deleteUserQueryMock = jest.fn().mockResolvedValue([]);
});

describe("正常系", () => {
    test("@aが@yをフォロー解除するQueryが実行される", async () => {
        await deleteUserCore({
            userId: "@a",
        });

        expect(deleteUserQueryMock).toHaveBeenCalledWith(
            "UPDATE wordlessdb.users_table SET is_deleted = 1 WHERE userId = ?",
            ["@a"],
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
});
