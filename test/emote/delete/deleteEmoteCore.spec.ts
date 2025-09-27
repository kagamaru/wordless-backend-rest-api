import { deleteEmoteCore } from "@/app/emote/delete/deleteEmoteCore";

let deleteEmoteQueryMock: jest.Mock<any, any, any>;
let sqlCloseMock: jest.Mock<any, any, any>;
jest.mock("@/utility", () => {
    const actual = jest.requireActual("@/utility");
    return {
        ...actual,
        getRDSDBClient: jest.fn(() => ({
            query: (sql: string, params: any[]) =>
                deleteEmoteQueryMock(sql, params),
            end: () => sqlCloseMock(),
        })),
    };
});

beforeEach(() => {
    deleteEmoteQueryMock = jest.fn().mockResolvedValue([]);
    sqlCloseMock = jest.fn();
});

describe("正常系", () => {
    test("successを返す", async () => {
        const response = await deleteEmoteCore({
            emoteId: "emoteId-a",
        });

        expect(response).toEqual("success");
        expect(deleteEmoteQueryMock).toHaveBeenCalledWith(
            "UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE emote_id = ?",
            ["emoteId-a"],
        );
    });

    test("DBとの接続が閉じられる", async () => {
        await deleteEmoteCore({
            emoteId: "emoteId-a",
        });

        expect(sqlCloseMock).toHaveBeenCalled();
    });
});

describe("異常系", () => {
    test("エラーが発生した時、lambdaErrorを返す", async () => {
        deleteEmoteQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteEmoteCore({
            emoteId: "emoteId-a",
        });

        expect(response).toEqual("lambdaError");
    });
});
