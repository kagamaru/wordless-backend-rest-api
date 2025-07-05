import { mockClient } from "aws-sdk-client-mock";
import { DynamoDBDocumentClient, GetCommand } from "@aws-sdk/lib-dynamodb";
import { fetchEmotes } from "@/app/emotes/fetchEmotes";
import { Emote } from "@/classes/Emote";
import { getHandlerRequest } from "@/test/testutils/getHandlerRequest";

const ddbMock = mockClient(DynamoDBDocumentClient);

const emoteTableItem = [
    {
        sequence_number: 1,
        emote_id: "emoteId-b",
        emote_reaction_id: "emoteReactionId-b",
        user_id: "@b",
        emote_datetime: "2025-01-19 09:00:48",
        emote_emoji1: `:bear:`,
        emote_emoji2: `:bear:`,
        emote_emoji3: `:sad:`,
        emote_emoji4: `:party_parrot:`,
        is_deleted: 0,
    },
    {
        sequence_number: 0,
        emote_id: "emoteId-a",
        emote_reaction_id: "emoteReactionId-a",
        user_id: "@a",
        emote_datetime: "2025-01-18 09:00:48",
        emote_emoji1: `:snake:`,
        emote_emoji2: `:smile:`,
        emote_emoji3: `:smile:`,
        emote_emoji4: `:party_parrot:`,
        is_deleted: 0,
    },
];

const emoteReactionTableItemForUserA = {
    Item: {
        emoteReactionId: "emoteReactionId-a",
        emoteReactionEmojis: [
            {
                emojiId: ":snake:",
                numberOfReactions: 2,
                reactedUserIds: ["@a", "@b"],
            },
            {
                emojiId: ":smile",
                numberOfReactions: 1,
                reactedUserIds: ["@a"],
            },
        ],
    },
};

const emoteReactionTableItemForUserB = {
    Item: {
        emoteReactionId: "emoteReactionId-b",
        emoteReactionEmojis: [
            {
                emojiId: ":party_parrot:",
                numberOfReactions: 2,
                reactedUserIds: ["@a", "@b"],
            },
        ],
    },
};

const usersTableItemForA = {
    Item: {
        userId: "@a",
        userAvatarUrl: "https://image.test/a.png",
        userName: "A",
    },
};

const usersTableItemForB = {
    Item: {
        userId: "@b",
        userAvatarUrl: "https://image.test/b.png",
        userName: "B",
    },
};

const emoteReactionTableName = "emote-reaction-table-offline";
const usersTableName = "users-table-offline";

let getRDSDBClientQueryMock: jest.Mock<any, any, any>;

jest.mock("@/config", () => ({
    // HACK: 変数へのアクセスが不可のため、ハードコーディングする
    envConfig: {
        EMOTE_REACTION_TABLE: "emote-reaction-table-offline",
        USERS_TABLE: "users-table-offline",
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
            query: (sql: string, params: any[]) =>
                getRDSDBClientQueryMock(sql, params),
            end: () => {},
        })),
    };
});

const testSetUp = (setUpDB: {
    isUserDBSetup: boolean;
    isEmoteReactionDBSetup: boolean;
    isUserConnectionDBReturnUndefined?: boolean;
}): void => {
    const userADdbMock = ddbMock.on(GetCommand, {
        TableName: usersTableName,
        Key: {
            userId: "@a",
        },
    });
    const userBDdbMock = ddbMock.on(GetCommand, {
        TableName: usersTableName,
        Key: {
            userId: "@b",
        },
    });
    const emoteReactionADdbMock = ddbMock.on(GetCommand, {
        TableName: emoteReactionTableName,
        Key: {
            emoteReactionId: "emoteReactionId-a",
        },
    });
    const emoteReactionBDdbMock = ddbMock.on(GetCommand, {
        TableName: emoteReactionTableName,
        Key: {
            emoteReactionId: "emoteReactionId-b",
        },
    });

    if (setUpDB.isUserDBSetup) {
        userADdbMock.resolves(usersTableItemForA);
        userBDdbMock.resolves(usersTableItemForB);
    } else {
        userADdbMock.rejects(new Error());
        userBDdbMock.rejects(new Error());
    }

    if (setUpDB.isEmoteReactionDBSetup) {
        emoteReactionADdbMock.resolves(emoteReactionTableItemForUserA);
        emoteReactionBDdbMock.resolves(emoteReactionTableItemForUserB);
    } else {
        emoteReactionADdbMock.rejects(new Error());
        emoteReactionBDdbMock.rejects(new Error());
    }
};

beforeEach(() => {
    ddbMock.reset();
    getRDSDBClientQueryMock = jest.fn().mockResolvedValue(emoteTableItem);
});

describe("接続時", () => {
    test("正常時、sequenceNumber, emoteId, userName, userId, emoteDatetime, emoteReactionId, emoteEmojis, userAvatarUrl, emoteReactionEmojisから成る配列を返す", async () => {
        // Arrange
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        // Act
        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        // Assert
        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual(
            JSON.stringify({
                emotes: [
                    new Emote(
                        1,
                        "emoteId-b",
                        "B",
                        "@b",
                        "2025-01-19 09:00:48",
                        "emoteReactionId-b",
                        [
                            { emojiId: ":bear:" },
                            { emojiId: ":bear:" },
                            { emojiId: ":sad:" },
                            { emojiId: ":party_parrot:" },
                        ],
                        "https://image.test/b.png",
                        [
                            {
                                emojiId: ":party_parrot:",
                                numberOfReactions: 2,
                                reactedUserIds: ["@a", "@b"],
                            },
                        ],
                    ),
                    new Emote(
                        0,
                        "emoteId-a",
                        "A",
                        "@a",
                        "2025-01-18 09:00:48",
                        "emoteReactionId-a",
                        [
                            { emojiId: ":snake:" },
                            { emojiId: ":smile:" },
                            { emojiId: ":smile:" },
                            { emojiId: ":party_parrot:" },
                        ],
                        "https://image.test/a.png",
                        [
                            {
                                emojiId: ":snake:",
                                numberOfReactions: 2,
                                reactedUserIds: ["@a", "@b"],
                            },
                            {
                                emojiId: ":smile",
                                numberOfReactions: 1,
                                reactedUserIds: ["@a"],
                            },
                        ],
                    ),
                ],
            }),
        );
    });

    test("sequenceNumberStartOfSearchが指定されていない時、mySQLのDBに対して最新の投稿から取得するqueryが実行されている", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        expect(getRDSDBClientQueryMock).toHaveBeenCalledWith(
            "SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 ORDER BY emote_datetime DESC LIMIT ?",
            ["10"],
        );
        expect(getRDSDBClientQueryMock).toHaveBeenCalledTimes(1);
    });

    test("sequenceNumberStartOfSearchが指定されている時、mySQLのDBに対して指定したsequenceNumberの投稿から取得するqueryが実行されている", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "10",
                    sequenceNumberStartOfSearch: "8",
                },
            }),
        );

        expect(getRDSDBClientQueryMock).toHaveBeenCalledWith(
            "SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 AND emote_datetime <= (SELECT emote_datetime FROM wordlessdb.emote_table WHERE sequenceNumber = ? ORDER BY emote_datetime DESC LIMIT 1) ORDER BY emote_datetime DESC LIMIT ?",
            ["8", "10"],
        );
        expect(getRDSDBClientQueryMock).toHaveBeenCalledTimes(1);
    });
});

describe("異常系", () => {
    test("リクエストのqueryStringParametersが空の時、ステータスコード400とEMT-01を返す", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(getHandlerRequest({}));

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-01",
            }),
        );
    });

    test("リクエストのuserIdが無い時、ステータスコード400とEMT-02を返す", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-02",
            }),
        );
    });

    test("リクエストのuserIdが空文字の時、ステータスコード400とEMT-02を返す", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "",
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-02",
            }),
        );
    });

    test("リクエストのnumberOfCompletedAcquisitionsCompletedが無い時、ステータスコード400とEMT-02を返す", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-02",
            }),
        );
    });

    test("リクエストのnumberOfCompletedAcquisitionsCompletedが0の時、ステータスコード400とEMT-02を返す", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "0",
                },
            }),
        );

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-02",
            }),
        );
    });

    test("EmoteTableと接続できないとき、ステータスコード500とEMT-03を返す", async () => {
        getRDSDBClientQueryMock = jest.fn().mockRejectedValue(new Error());
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-03",
            }),
        );
    });

    test("UserTableと接続できないとき、ステータスコード500とEMT-04を返す", async () => {
        testSetUp({
            isUserDBSetup: false,
            isEmoteReactionDBSetup: true,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-04",
            }),
        );
    });

    test("EmoteReactionTableと接続できないとき、ステータスコード500とEMT-05を返す", async () => {
        testSetUp({
            isUserDBSetup: true,
            isEmoteReactionDBSetup: false,
        });

        const response = await fetchEmotes(
            getHandlerRequest({
                queryStringParameters: {
                    userId: "@a",
                    numberOfCompletedAcquisitionsCompleted: "10",
                },
            }),
        );

        expect(response.statusCode).toBe(500);
        expect(response.body).toEqual(
            JSON.stringify({
                error: "EMT-05",
            }),
        );
    });
});
