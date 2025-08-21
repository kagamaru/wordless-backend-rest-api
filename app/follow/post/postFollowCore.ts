import {
    FollowCorePayload as PostFollowCorePayload,
    FollowCoreResponse as PostFollowCoreResponse,
} from "@/@types";
import { getRDSDBClient } from "@/utility";

const mysqlClient = getRDSDBClient();

export const postFollowCore = async ({
    followerId,
    followeeId,
}: PostFollowCorePayload): Promise<PostFollowCoreResponse | "lambdaError"> => {
    try {
        await mysqlClient.query(
            `INSERT INTO wordlessdb.follow_table (follower_id, followee_id) VALUES (?, ?)`,
            [followerId, followeeId],
        );

        const [followingArray, followeeArray] = (await Promise.all([
            mysqlClient.query(
                `SELECT followee_id FROM wordlessdb.follow_table WHERE follower_id = ?`,
                [followeeId],
            ),
            mysqlClient.query(
                `SELECT follower_id FROM wordlessdb.follow_table WHERE followee_id = ?`,
                [followeeId],
            ),
        ])) as [Array<{ followee_id: string }>, Array<{ follower_id: string }>];

        return {
            totalNumberOfFollowing: followingArray.length,
            followingUserIds: followingArray.map((item) => item.followee_id),
            totalNumberOfFollowees: followeeArray.length,
            followeeUserIds: followeeArray.map((item) => item.follower_id),
        };
    } catch (error) {
        console.error(error);
        return "lambdaError";
    } finally {
        await mysqlClient.end();
    }
};
