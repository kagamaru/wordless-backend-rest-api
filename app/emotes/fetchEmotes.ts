import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import dayjs from "dayjs";
import "dayjs/locale/ja";
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

dayjs.locale("ja");

export const fetchEmotes = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    if (!event.queryStringParameters) {
        return createErrorResponse(400, {
            error: "EMT-01",
        });
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
        return createErrorResponse(400, {
            error: "EMT-02",
        });
    }

    let emotes = new Array<FetchedEmote>();
    try {
        if (sequenceNumberStartOfSearch === undefined) {
            emotes = await mysqlClient.query(
                `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 ORDER BY emote_datetime DESC LIMIT ${numberOfCompletedAcquisitionsCompleted}`,
            );
        } else {
            emotes = await mysqlClient.query(
                `SELECT * FROM wordlessdb.emote_table WHERE is_deleted = 0 AND emote_datetime <= (SELECT emote_datetime FROM wordlessdb.emote_table WHERE sequenceNumber = ${sequenceNumberStartOfSearch} ORDER BY emote_datetime DESC LIMIT 1) ORDER BY emote_datetime DESC LIMIT ${numberOfCompletedAcquisitionsCompleted}`,
            );
        }
        await mysqlClient.end();
    } catch (error) {
        return createErrorResponse(500, {
            error: "EMT-03",
        });
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
            return createErrorResponse(500, {
                error: "EMT-04",
            });
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
                    }>
                >;
        } catch (error) {
            return createErrorResponse(500, {
                error: "EMT-05",
            });
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

    return createResponse({
        emotes: response,
    });
};
