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
        !userId ||
        numberOfCompletedAcquisitionsCompleted === "0" ||
        !numberOfCompletedAcquisitionsCompleted ||
        userId.trim() === ""
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
        if (sequenceNumberStartOfSearch === undefined) {
            emotes = await mysqlClient.query(
                `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 ORDER BY emote_datetime DESC LIMIT ?`,
                [Number(numberOfCompletedAcquisitionsCompleted)],
            );
        } else {
            emotes = await mysqlClient.query(
                `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 AND emote_datetime <= (SELECT emote_datetime FROM wordlessdb.emote_table WHERE sequenceNumber = ? ORDER BY emote_datetime DESC LIMIT 1) ORDER BY emote_datetime DESC LIMIT ?`,
                [
                    Number(sequenceNumberStartOfSearch),
                    Number(numberOfCompletedAcquisitionsCompleted),
                ],
            );
        }
    } catch (error) {
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
            userInfo = await getItemFromDynamoDB<string>(
                envConfig.USERS_TABLE,
                {
                    userId: emote.user_id,
                },
            );
        } catch (error) {
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
            return createErrorResponse(
                500,
                {
                    error: "EMT-05",
                },
                originName,
            );
        }

        response.push(
            new Emote(
                emote.sequence_number,
                emote.emote_id,
                userInfo.userName,
                emote.user_id,
                emote.emote_datetime,
                emote.emote_reaction_id,
                [
                    { emojiId: emote.emote_emoji1 },
                    { emojiId: emote.emote_emoji2 },
                    { emojiId: emote.emote_emoji3 },
                    { emojiId: emote.emote_emoji4 },
                ],
                userInfo.userAvatarUrl,
                emoteReaction?.emoteReactionEmojis,
            ),
        );
    }

    return createResponse(
        {
            emotes: response,
        },
        originName,
    );
};
