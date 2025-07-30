import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { deleteEmote } from "@/app/emote/deleteEmote";

let deleteEmoteQueryMock: jest.Mock<any, any, any>;

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
                return deleteEmoteQueryMock(sql, params);
            },
            end: () => {},
        })),
    };
});

beforeEach(() => {
    deleteEmoteQueryMock = jest.fn().mockResolvedValue([]);
});

describe("正常系", () => {
    test("emoteを削除する", async () => {
        await deleteEmote(
            getHandlerRequest({
                pathParameters: {
                    emoteId: "emoteId-a",
                },
            }),
        );

        expect(deleteEmoteQueryMock).toHaveBeenCalledWith(
            "UPDATE wordlessdb.emote_table SET is_deleted = 1 WHERE emote_id = ?",
            ["emoteId-a"],
        );
        expect(deleteEmoteQueryMock).toHaveBeenCalledTimes(1);
    });
});

describe("異常系", () => {
    test("リクエストのpathParametersが空の時、ステータスコード400とEMT-11を返す", async () => {
        const response = await deleteEmote(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-11",
            }),
        );
    });

    test("リクエストボディのemoteIdが空の時、ステータスコード400とEMT-12を返す", async () => {
        const response = await deleteEmote(
            getHandlerRequest({
                pathParameters: { emoteId: "" },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-12",
            }),
        );
    });

    test("リクエストボディのemoteIdがundefinedの時、ステータスコード400とEMT-12を返す", async () => {
        const response = await deleteEmote(
            getHandlerRequest({
                pathParameters: { emoteId: undefined },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-12",
            }),
        );
    });

    test("emoteを削除する際、EmoteTableと接続できないとき、ステータスコード500とEMT-13を返す", async () => {
        deleteEmoteQueryMock = jest.fn().mockRejectedValue(new Error());

        const response = await deleteEmote(
            getHandlerRequest({
                pathParameters: {
                    emoteId: "emoteId-a",
                },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-13",
            }),
        );
    });
});
