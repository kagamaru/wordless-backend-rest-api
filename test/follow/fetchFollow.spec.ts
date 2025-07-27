import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";
import { fetchFollow } from "@/app/follow/fetchFollow";

const ddbMock = mockClient(DynamoDBDocumentClient);
let getRDSDBClientSelectFollowQueryMock: jest.Mock<any, any, any>;
let getRDSDBClientSelectFolloweeQueryMock: jest.Mock<any, any, any>;

const followersSelectedFromTable = ["@z"];
const followeesSelectedFromTable = ["@b", "@c", "@z"];

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
                if (
                    sql.includes(
                        "SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id",
                    )
                ) {
                    return getRDSDBClientSelectFollowQueryMock(sql, params);
                } else if (
                    sql.includes(
                        "SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id",
                    )
                ) {
                    return getRDSDBClientSelectFolloweeQueryMock(sql, params);
                }
            },
            end: () => {},
        })),
    };
});

beforeEach(() => {
    ddbMock.reset();
    getRDSDBClientSelectFollowQueryMock = jest
        .fn()
        .mockResolvedValue(followersSelectedFromTable);
    getRDSDBClientSelectFolloweeQueryMock = jest
        .fn()
        .mockResolvedValue(followeesSelectedFromTable);
});

describe("正常系", () => {
    test("フォローしているユーザーと、フォローされているユーザーを取得する", async () => {
        const response = await fetchFollow(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                },
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                totalNumberOfFollowing: followersSelectedFromTable.length,
                followingUserIds: followersSelectedFromTable,
                totalNumberOfFollowees: followeesSelectedFromTable.length,
                followeeUserIds: followeesSelectedFromTable,
            }),
        );
    });

    test("フォローしているユーザーを取得するQueryが実行される", async () => {
        await fetchFollow(
            getHandlerRequest({
                queryStringParameters: { userId: "@a" },
            }),
        );

        expect(getRDSDBClientSelectFollowQueryMock).toHaveBeenCalledWith(
            "SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?",
            ["@a"],
        );
    });

    test("フォローされているユーザーを取得するQueryが実行される", async () => {
        await fetchFollow(
            getHandlerRequest({
                queryStringParameters: { userId: "@a" },
            }),
        );

        expect(getRDSDBClientSelectFolloweeQueryMock).toHaveBeenCalledWith(
            "SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id = ?",
            ["@a"],
        );
    });

    test("フォローしているユーザー、フォローされているユーザーが0人の時、totalNumberOfFollowingが0となる", async () => {
        getRDSDBClientSelectFollowQueryMock = jest.fn().mockResolvedValue([]);
        getRDSDBClientSelectFolloweeQueryMock = jest.fn().mockResolvedValue([]);

        const response = await fetchFollow(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                },
            }),
        );

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                totalNumberOfFollowing: 0,
                followingUserIds: [],
                totalNumberOfFollowees: 0,
                followeeUserIds: [],
            }),
        );
    });
});

describe("異常系", () => {
    test("リクエストのqueryStringParametersが空の時、ステータスコード400とFOL-01を返す", async () => {
        const response = await fetchFollow(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-01",
            }),
        );
    });

    test("リクエストのuserIdが無い時、ステータスコード400とFOL-02を返す", async () => {
        const response = await fetchFollow(
            getHandlerRequest({
                queryStringParameters: {},
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-02",
            }),
        );
    });

    test("リクエストのuserIdが空文字の時、ステータスコード500とFOL-02を返す", async () => {
        const response = await fetchFollow(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "",
                },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-02",
            }),
        );
    });

    test("フォローしているユーザーを取得する際、FollowTableと接続できないとき、ステータスコード500とFOL-03を返す", async () => {
        getRDSDBClientSelectFollowQueryMock = jest
            .fn()
            .mockRejectedValue(new Error());

        const response = await fetchFollow(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-03",
            }),
        );
    });

    test("フォローされているユーザーを取得する際、FollowTableと接続できないとき、ステータスコード500とFOL-03を返す", async () => {
        getRDSDBClientSelectFolloweeQueryMock = jest
            .fn()
            .mockRejectedValue(new Error());

        const response = await fetchFollow(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "FOL-03",
            }),
        );
    });
});
