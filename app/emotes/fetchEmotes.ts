import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import { Emote } from "@/classes/Emote";
import { envConfig } from "@/config";
import { FetchedEmote } from "@/@types";
import {
    createResponse,
    createErrorResponse,
    getItemFromDynamoDB,
    getRDSDBClient,
} from "@/utility";

const mysqlClient = getRDSDBClient();

export const fetchEmotes = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    const originName = event.headers.origin;
    if (!event.queryStringParameters) {
        return createErrorResponse(
            400,
            {
                error: "EMT-01",
            },
            originName,
        );
    }

    const {
        userId,
        numberOfCompletedAcquisitionsCompleted,
        sequenceNumberStartOfSearch,
    } = event.queryStringParameters;

    if (
        numberOfCompletedAcquisitionsCompleted === "0" ||
        !numberOfCompletedAcquisitionsCompleted
    ) {
        return createErrorResponse(
            400,
            {
                error: "EMT-02",
            },
            originName,
        );
    }

    let emotes = new Array<FetchedEmote>();
    try {
        if (userId) {
            if (!sequenceNumberStartOfSearch) {
                emotes = await mysqlClient.query(
                    `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 AND user_id = ? ORDER BY emote_datetime DESC LIMIT ?`,
                    [userId, Number(numberOfCompletedAcquisitionsCompleted)],
                );
            } else {
                emotes = await mysqlClient.query(
                    `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 AND user_id = ? AND emote_datetime < (SELECT emote_datetime FROM wordlessdb.emote_table WHERE sequence_number = ? ORDER BY emote_datetime DESC LIMIT 1) ORDER BY emote_datetime DESC LIMIT ?`,
                    [
                        userId,
                        Number(sequenceNumberStartOfSearch),
                        Number(numberOfCompletedAcquisitionsCompleted),
                    ],
                );
            }
        } else {
            if (!sequenceNumberStartOfSearch) {
                emotes = await mysqlClient.query(
                    `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 ORDER BY emote_datetime DESC LIMIT ?`,
                    [Number(numberOfCompletedAcquisitionsCompleted)],
                );
            } else {
                emotes = await mysqlClient.query(
                    `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 AND emote_datetime < (SELECT emote_datetime FROM wordlessdb.emote_table WHERE sequence_number = ? ORDER BY emote_datetime DESC LIMIT 1) ORDER BY emote_datetime DESC LIMIT ?`,
                    [
                        Number(sequenceNumberStartOfSearch),
                        Number(numberOfCompletedAcquisitionsCompleted),
                    ],
                );
            }
        }
    } catch (error) {
        console.error(error);
        return createErrorResponse(
            500,
            {
                error: "EMT-03",
            },
            originName,
        );
    } finally {
        await mysqlClient.end();
    }

    const response: Array<Emote> = [];

    for (const emote of emotes) {
        let userInfo: Record<"userId" | "userAvatarUrl" | "userName", string>;
        let emoteReaction: Record<"emoteReactionId", string> &
            Record<
                "emoteReactionEmojis",
                Array<{
                    emojiId: `:${string}:`;
                    numberOfReactions: number;
                    reactedUserIds: string[];
                }>
            >;

        try {
            userInfo = await getItemFromDynamoDB<string>(envConfig.USER_TABLE, {
                userId: emote.user_id,
            });
        } catch (error) {
            console.error(error);
            return createErrorResponse(
                500,
                {
                    error: "EMT-04",
                },
                originName,
            );
        }

        try {
            emoteReaction = (await getItemFromDynamoDB(
                envConfig.EMOTE_REACTION_TABLE,
                {
                    emoteReactionId: emote.emote_reaction_id,
                },
            )) as Record<"emoteReactionId", string> &
                Record<
                    "emoteReactionEmojis",
                    Array<{
                        emojiId: `:${string}:`;
                        numberOfReactions: number;
                        reactedUserIds: string[];
                    }>
                >;
        } catch (error) {
            console.error(error);
            return createErrorResponse(
                500,
                {
                    error: "EMT-05",
                },
                originName,
            );
        }

        response.push(
            new Emote({
                sequenceNumber: emote.sequence_number,
                emoteId: emote.emote_id,
                userName: userInfo.userName,
                userId: emote.user_id,
                emoteDatetime: emote.emote_datetime,
                emoteReactionId: emote.emote_reaction_id,
                emoteEmojis: [
                    { emojiId: emote.emote_emoji1 },
                    { emojiId: emote.emote_emoji2 },
                    { emojiId: emote.emote_emoji3 },
                    { emojiId: emote.emote_emoji4 },
                ],
                userAvatarUrl: userInfo.userAvatarUrl,
                emoteReactionEmojis: emoteReaction?.emoteReactionEmojis,
            }),
        );
    }

    return createResponse(
        {
            emotes: response,
        },
        originName,
    );
};
