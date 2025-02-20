import { GetCommand } from "@aws-sdk/lib-dynamodb";
import { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import dayjs from "dayjs";
import "dayjs/locale/ja";
import { Emote } from "@/classes/Emote";
import { envConfig } from "@/config";
import { FetchedEmote } from "@/@types";
import { getDynamoDBClient, getRDSDBClient } from "@/utility";

const docClient = getDynamoDBClient();
const mysqlClient = getRDSDBClient();

dayjs.locale("ja");

export const fetchEmotes = async (
    event: APIGatewayProxyEvent,
): Promise<APIGatewayProxyResult> => {
    if (!event.queryStringParameters) {
        console.error("EMT-01");
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "EMT-01",
            }),
        };
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
        console.error("EMT-02");
        return {
            statusCode: 400,
            body: JSON.stringify({
                error: "EMT-02",
            }),
        };
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
        console.error("EMT-03");
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "EMT-03",
            }),
        };
    }

    const response = await Promise.all(
        emotes.map(async (emote) => {
            let userInfo: Record<
                "userId" | "userAvatarUrl" | "userName",
                string
            >;
            let emoteReaction: Record<"emoteReactionId", string> &
                Record<
                    "emoteReactionEmojis",
                    Array<{
                        emojiId: `:${string}:`;
                        numberOfReactions: number;
                    }>
                >;
            try {
                userInfo = (
                    await docClient.send(
                        new GetCommand({
                            TableName: envConfig.USERS_TABLE,
                            Key: {
                                userId: emote.user_id,
                            },
                        }),
                    )
                ).Item;
            } catch (error) {
                return "UserTableConnectionError";
            }

            try {
                // NOTE: ResponseがAny型になってしまうので、as で補正
                emoteReaction = (
                    await docClient.send(
                        new GetCommand({
                            TableName: envConfig.EMOTE_REACTION_TABLE,
                            Key: {
                                emoteReactionId: emote.emote_reaction_id,
                            },
                        }),
                    )
                ).Item as Record<"emoteReactionId", string> &
                    Record<
                        "emoteReactionEmojis",
                        Array<{
                            emojiId: `:${string}:`;
                            numberOfReactions: number;
                        }>
                    >;
            } catch (error) {
                return "EmoteReactionTableConnectionError";
            }

            return new Emote(
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
            );
        }),
    );

    if (response.includes("UserTableConnectionError")) {
        console.error("EMT-04");
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "EMT-04",
            }),
        };
    } else if (response.includes("EmoteReactionTableConnectionError")) {
        console.error("EMT-05");
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: "EMT-05",
            }),
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            emotes: response.filter(
                (element) =>
                    element !== "UserTableConnectionError" &&
                    element !== "EmoteReactionTableConnectionError",
            ),
        }),
    };
};
